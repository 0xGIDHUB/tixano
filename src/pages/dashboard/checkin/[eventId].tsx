import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@meshsdk/react';
import { MeshCardanoBrowserWallet } from '@meshsdk/wallet';
import { supabase } from '@/lib/supabase/client';
import jsQR from 'jsqr';

interface CheckedInTicket {
    id: string;
    asset_name: string;
    owner_name: string;
    used_at: string;
}

interface EventInfo {
    id: string;
    title: string;
    date: string | null;
    total_registrations: number;
    capacity: number | null;
}

interface ScanResult {
    raw: string;
    status: 'verifying' | 'success' | 'error' | 'already_used' | 'invalid_ticket' | 'not_owned';
    ticketData?: {
        id: string;
        asset_name: string;
        owner_name: string;
        owner_email: string;
        owner_phone: string | null;
        owner_wallet: string;
        policy_id: string | null;
        tx_hash: string | null;
        used_at: string | null;
    };
    message?: string;
}

export default function CheckInPage() {
    const router = useRouter();
    const { eventId } = router.query;
    const { connected, wallet } = useWallet();

    const [authStatus, setAuthStatus] = useState<'checking' | 'authorized' | 'no_wallet' | 'not_owner'>('checking');
    const [authMessage, setAuthMessage] = useState<string>('');

    const [event, setEvent] = useState<EventInfo | null>(null);
    const [checkedIn, setCheckedIn] = useState<CheckedInTicket[]>([]);

    const [tableSearch, setTableSearch] = useState('');

    // Scanner state
    const [scannerActive, setScannerActive] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const lastScannedRef = useRef<string | null>(null);
    const scanActiveRef = useRef(false);
    const [scanFlash, setScanFlash] = useState(false);
    const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animFrameRef = useRef<number>(0);
    const scanCooldown = useRef(false);

    const [walletReady, setWalletReady] = useState(false);

    // Auto-connect wallet if wallet name is passed from dashboard
    useEffect(() => {
        const walletName = router.query.wallet as string;

        async function attemptConnect() {
            if (!walletName) {
                setWalletReady(true);
                return;
            }
            if (connected) {
                setWalletReady(true);
                return;
            }
            try {
                const installedWallets = MeshCardanoBrowserWallet.getInstalledWallets();
                const walletExists = installedWallets.some(w => w.name.toLowerCase() === walletName.toLowerCase());
                if (walletExists) {
                    await MeshCardanoBrowserWallet.enable(walletName);
                    // Give MeshJS a moment to propagate the connected state into useWallet
                    await new Promise(r => setTimeout(r, 800));
                }
            } catch (err) {
                console.error('Failed to connect wallet:', err);
            } finally {
                setWalletReady(true);
            }
        }

        // Wait for router query to be available (Next.js hydration)
        if (router.isReady) {
            attemptConnect();
        }
    }, [router.isReady, router.query.wallet]);

    // Security gate — verify wallet is connected AND matches event owner
    const verifyAccess = useCallback(async () => {
        if (!eventId || typeof eventId !== 'string') return;
        if (!walletReady) return;

        setAuthStatus('checking');

        if (!connected) {
            setAuthStatus('no_wallet');
            setAuthMessage('No wallet connected. Please connect your wallet and try again.');
            return;
        }

        try {
            const walletAddress = await wallet?.getChangeAddressBech32?.();
            if (!walletAddress) {
                setAuthStatus('no_wallet');
                setAuthMessage('Could not read wallet address. Please reconnect your wallet.');
                return;
            }

            const { data: eventOwner, error } = await supabase
                .from('events')
                .select('organizer_wallet')
                .eq('id', eventId)
                .single();

            if (error || !eventOwner) {
                setAuthStatus('not_owner');
                setAuthMessage('Event not found or could not be verified.');
                return;
            }

            if (eventOwner.organizer_wallet !== walletAddress) {
                setAuthStatus('not_owner');
                setAuthMessage('Access denied. Only the event organizer can access the check-in scanner.');
                return;
            }

            setAuthStatus('authorized');
        } catch (err) {
            setAuthStatus('not_owner');
            setAuthMessage('Verification failed. Please try again.');
        }
    }, [eventId, connected, wallet, walletReady]);

    useEffect(() => {
        if (walletReady) {
            verifyAccess();
        }
    }, [walletReady, verifyAccess]);

    // Fetch event info + already-checked-in tickets
    const fetchCheckedInTickets = useCallback(async () => {
        if (!eventId || typeof eventId !== 'string') return;

        const { data: ticketsRes } = await supabase
            .from('tickets')
            .select('id, asset_name, owner_name, used_at')
            .eq('event_id', eventId as string)
            .eq('status', 'used')
            .order('used_at', { ascending: false });

        if (ticketsRes) {
            setCheckedIn(ticketsRes);
        }
    }, [eventId]);

    useEffect(() => {
        if (!eventId || typeof eventId !== 'string') return;

        async function fetchData() {
            const { data: eventRes } = await supabase
                .from('events')
                .select('id, title, date, total_registrations, capacity')
                .eq('id', eventId as string)
                .single();

            if (eventRes) setEvent(eventRes);
        }

        fetchData();
        fetchCheckedInTickets();
    }, [eventId, fetchCheckedInTickets]);

    // Auto-refresh checked-in tickets every 15 seconds
    useEffect(() => {
        if (!eventId || typeof eventId !== 'string') return;

        const interval = setInterval(() => {
            fetchCheckedInTickets();
        }, 15000); // 15 seconds

        return () => clearInterval(interval);
    }, [eventId, fetchCheckedInTickets]);

    // Handle scan result and verification
    const handleScanResult = useCallback(async (raw: string) => {
        setScanResult({ raw, status: 'verifying' });

        // Stop the scanner after a scan is detected
        stopScanner();

        // Parse QR code data — just the ticket ID UUID
        const ticketId = raw.trim();

        if (!ticketId || typeof eventId !== 'string') {
            setScanResult({
                raw,
                status: 'error',
                message: 'Invalid QR code format',
            });
            return;
        }

        try {
            // Call verify-checkin API
            const response = await fetch('/api/tickets/verify-checkin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ticketId,
                    eventId,
                }),
            });

            const result = await response.json();

            // Update modal with the verification result
            setScanResult({
                raw,
                status: result.status,
                message: result.message,
                ticketData: result.ticketData,
            });

            // If successful, add the newly checked-in ticket to the table using functional state update
            if (result.status === 'success' && result.ticketData) {
                const newCheckedIn: CheckedInTicket = {
                    id: result.ticketData.id,
                    asset_name: result.ticketData.asset_name,
                    owner_name: result.ticketData.owner_name,
                    used_at: result.ticketData.used_at,
                };
                setCheckedIn(prev => [newCheckedIn, ...prev]);
            }
        } catch (error) {
            console.error('Verification error:', error);
            setScanResult({
                raw,
                status: 'error',
                message: 'Failed to verify ticket. Please try again.',
            });
        }
    }, [eventId]);

    // QR decode using canvas + jsQR
    const decodeFrame = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(decodeFrame);
            return;
        }

        const w = video.videoWidth;
        const h = video.videoHeight;

        if (w === 0 || h === 0) {
            animFrameRef.current = requestAnimationFrame(decodeFrame);
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
        });

        if (code?.data) {
            if (!scanCooldown.current && code.data !== lastScannedRef.current) {
                scanCooldown.current = true;
                lastScannedRef.current = code.data;
                setScanFlash(true);
                setTimeout(() => setScanFlash(false), 400);
                handleScanResult(code.data);
                setTimeout(() => {
                    scanCooldown.current = false;
                    lastScannedRef.current = null;
                }, 3000);
            }
        }

        animFrameRef.current = requestAnimationFrame(decodeFrame);
    }, [handleScanResult]);


    // Enumerate available video devices (cameras)
    useEffect(() => {
        async function getDevices() {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                setAvailableDevices(videoDevices);
                if (videoDevices.length > 0 && !selectedDeviceId) {
                    setSelectedDeviceId(videoDevices[0].deviceId);
                }
            } catch (err) {
                console.error('Failed to enumerate devices:', err);
            }
        }
        getDevices();
    }, []);


    async function startScanner() {
        setCameraError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await new Promise<void>((resolve) => {
                    videoRef.current!.onloadedmetadata = () => resolve();
                });
                await videoRef.current.play();
            }

            scanActiveRef.current = true;
            setScannerActive(true);
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = requestAnimationFrame(decodeFrame);

        } catch (err: any) {
            setCameraError(
                err.name === 'NotAllowedError'
                    ? 'Camera access denied. Please allow camera permissions and try again.'
                    : err.name === 'NotFoundError'
                        ? 'No camera found on this device.'
                        : 'Failed to start camera. Please try again.'
            );
        }
    }

    function stopScanner() {
        scanActiveRef.current = false;
        cancelAnimationFrame(animFrameRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        setScannerActive(false);
    }

    useEffect(() => () => stopScanner(), []);

    function formatTime(iso: string) {
        return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function formatDate(d: string | null) {
        if (!d) return 'TBA';
        return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // ── Auth gate screens ──
    if (authStatus === 'checking') {
        return (
            <>
                <Head><title>Verifying — Tixano</title></Head>
                <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-[#00e5ff]/5 border border-[#00e5ff]/15 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-2 border-[#00e5ff]/20 border-t-[#00e5ff] animate-spin" />
                        </div>
                        <div className="absolute inset-0 rounded-2xl border border-[#00e5ff]/10 animate-ping" />
                    </div>
                    <div className="text-center">
                        <p className="text-white/50 text-sm font-black uppercase tracking-widest mb-1">Verifying Access</p>
                        <p className="text-white/20 text-xs">Checking wallet authorization...</p>
                    </div>
                </div>
            </>
        );
    }

    if (authStatus === 'no_wallet' || authStatus === 'not_owner') {
        const isNoWallet = authStatus === 'no_wallet';
        return (
            <>
                <Head><title>Access Denied — Tixano</title></Head>
                <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${isNoWallet
                        ? 'bg-[#ffaa00]/8 border-[#ffaa00]/20'
                        : 'bg-red-500/8 border-red-500/20'
                        }`}>
                        {isNoWallet ? (
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                <path d="M7 10V7a5 5 0 0110 0v3" stroke="#ffaa00" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" />
                                <rect x="5" y="10" width="14" height="10" rx="1.5" stroke="#ffaa00" strokeWidth="1.8" strokeOpacity="0.7" />
                                <circle cx="12" cy="15" r="1.2" fill="#ffaa00" fillOpacity="0.7" />
                                <path d="M12 15v2.5" stroke="#ffaa00" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
                            </svg>
                        ) : (
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="rgb(248,113,113)" strokeWidth="1.5" strokeOpacity="0.7" />
                                <path d="M15 9l-6 6M9 9l6 6" stroke="rgb(248,113,113)" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
                            </svg>
                        )}
                    </div>

                    <div className="text-center max-w-sm">
                        <p className={`text-sm font-black uppercase tracking-widest mb-2 ${isNoWallet ? 'text-[#ffaa00]/80' : 'text-red-400/80'
                            }`}>
                            {isNoWallet ? 'Wallet Not Connected' : 'Access Denied'}
                        </p>
                        <p className="text-white/30 text-xs leading-relaxed">{authMessage}</p>
                    </div>

                    <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                        <button
                            onClick={() => { stopScanner(); router.push('/dashboard'); }}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00e5ff] text-black text-xs font-black uppercase tracking-widest hover:bg-[#33ecff] transition-all duration-200"
                        >
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <path d="M12 8H4M8 12l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Back to Dashboard
                        </button>
                        {isNoWallet && (
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs font-bold uppercase tracking-widest hover:bg-white/8 hover:text-white/70 transition-all duration-200"
                            >
                                Retry
                            </button>
                        )}
                    </div>

                    {/* Tixano watermark */}
                    <p className="absolute bottom-6 text-white/10 text-[10px] uppercase tracking-widest">Tixano · Secured Check-in</p>
                </div>
            </>
        );
    }

    // ── Authorized — render full page ──
    return (
        <>
            <Head>
                <title>{event?.title ? `Check-in — ${event.title} — Tixano` : 'Check-in — Tixano'}</title>
            </Head>

            <div className="h-full bg-black flex flex-col overflow-hidden">

                {/* Top bar */}
                <div className="flex-shrink-0 border-b border-white/8 bg-black/90 backdrop-blur-sm sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">

                        {/* Left: Tixano logo */}
                        <div className="flex-shrink-0">
                            <img src="/Tixano Icon.png" alt="Tixano" width={35} height={35} className="object-contain" />
                        </div>

                        {/* Center: Event title — styled */}
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <p className="text-white/50 text-[8px] uppercase tracking-[0.3em] font-semibold leading-none mb-1">Event Check-in</p>
                            <h1 className="text-white font-black uppercase tracking-tight text-xl leading-none truncate max-w-md">
                                {event?.title || '...'}
                            </h1>
                        </div>

                        {/* Right: scanner status */}
                        <div className="flex items-center gap-2.5 bg-white/3 border border-white/8 rounded-xl px-3 py-1.5 flex-shrink-0">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${scannerActive ? 'bg-[#00ff88] shadow-[0_0_6px_rgba(0,255,136,0.6)]' : 'bg-white/20'}`}
                                style={scannerActive ? { animation: 'pulse 1.5s ease-in-out infinite' } : {}} />
                            <span className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">
                                {scannerActive ? 'Scanning' : 'Scanner Off'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main two-column layout */}
                <div className="flex overflow-hidden gap-5 px-6 py-5 mt-5" style={{ height: 'calc(100vh - 90px)' }}>

                    {/* ── LEFT: Checked-in table ── */}
                    <div className="w-[460px] flex-shrink-0 rounded-2xl flex flex-col bg-[#030303] border border-white/10 h-full">

                        {/* Table header */}
                        <div className="flex-shrink-0 px-5 py-4 border-b border-white/10">
                            <div className="flex items-center justify-between mb-1">
                                <h2 className="text-white/70 text-xs font-black uppercase tracking-widest">Checked In</h2>
                                <span className="text-[#00e5ff] text-sm font-bold tabular-nums px-2 py-0.5">
                                    {checkedIn.length}
                                </span>
                            </div>
                            {event && (
                                <p className="text-white/20 text-[10px] uppercase tracking-widest mb-3">{formatDate(event.date)}</p>
                            )}
                            {/* Search */}
                            <div className="relative w-full">
                                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" width="12" height="12" viewBox="0 0 16 16" fill="none">
                                    <path d="M7 13A6 6 0 107 1a6 6 0 000 12zM13 13l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search tickets or guests..."
                                    value={tableSearch}
                                    onChange={e => setTableSearch(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-white text-xs placeholder-white/30 focus:outline-none focus:border-[#00e5ff]/50 focus:bg-white/6 transition-all duration-200 font-medium"
                                />
                                {tableSearch && (
                                    <button onClick={() => setTableSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors p-1">
                                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Column labels */}
                        <div className="flex-shrink-0 grid grid-cols-[1fr_1fr_auto] px-5 py-2 border-b border-white/10">
                            {['Ticket', 'Guest', 'Time'].map(h => (
                                <span key={h} className="text-white/20 text-[9px] uppercase tracking-widest">{h}</span>
                            ))}
                        </div>

                        {/* Rows */}
                        <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: 'none' }}>
                            {(() => {
                                const filtered = checkedIn.filter(t =>
                                    !tableSearch ||
                                    t.asset_name.toLowerCase().includes(tableSearch.toLowerCase()) ||
                                    t.owner_name.toLowerCase().includes(tableSearch.toLowerCase())
                                );

                                if (filtered.length === 0 && checkedIn.length === 0) return (
                                    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center">
                                            <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" /><path d="M1.5 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M11 7.5c1.5 0 3 1 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><circle cx="11" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-white/30 text-xs font-black uppercase tracking-widest mb-1">No Check-ins Yet</p>
                                            <p className="text-white/15 text-[10px] leading-relaxed">Scanned tickets will appear here as attendees check in</p>
                                        </div>
                                    </div>
                                );

                                if (filtered.length === 0) return (
                                    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-8">
                                        <p className="text-white/20 text-xs font-black uppercase tracking-tight mb-1">No results</p>
                                        <p className="text-white/10 text-[10px]">No tickets match "{tableSearch}"</p>
                                    </div>
                                );

                                return filtered.map((ticket, idx) => (
                                    <div
                                        key={ticket.id}
                                        className={`grid grid-cols-[1fr_1fr_auto] px-5 py-3 border-b border-white/10 hover:bg-white/2 transition-colors duration-150 ${idx === 0 && !tableSearch ? 'bg-[#00ff88]/3 border-l-2 border-l-[#00ff88]/30' : ''}`}
                                    >
                                        <div className="min-w-0 pr-2">
                                            <p className="text-[#00e5ff]/70 text-[10px] font-mono truncate">{ticket.asset_name}</p>
                                        </div>
                                        <div className="min-w-0 pr-2">
                                            <p className="text-white/60 text-[11px] truncate">{ticket.owner_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-white/25 text-[10px] font-mono tabular-nums whitespace-nowrap">
                                                {ticket.used_at ? formatTime(ticket.used_at) : '—'}
                                            </p>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>

                        {/* Footer stat */}
                        {event?.total_registrations ? (
                            <div className="flex-shrink-0 px-5 py-3 border-t border-white/10">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-white/20 text-[10px] uppercase tracking-widest">Progress</span>
                                    <span className="text-white/40 text-[10px] tabular-nums">
                                        {checkedIn.length} / {event.total_registrations}
                                    </span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#00ff88] rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min((checkedIn.length / event.total_registrations) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* ── RIGHT: Scanner interface ── */}
                    <div className="flex-1 flex flex-col bg-black rounded-2xl border border-white/10 overflow-hidden h-full">

                        {/* Scanner area */}
                        <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 gap-4 relative">

                            {/* Camera selector — dropdown */}
                            {availableDevices.length > 1 && (
                                <div className="relative w-full max-w-sm">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 z-10 pointer-events-none">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M15 10l4.553-2.069A1 1 0 0121 8.867v6.266a1 1 0 01-1.447.902L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <select
                                        value={selectedDeviceId}
                                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                                        disabled={scannerActive}
                                        className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-white text-xs font-medium focus:outline-none focus:border-[#00e5ff]/50 focus:bg-white/6 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/6"
                                    >
                                        {availableDevices.map((device, i) => (
                                            <option key={device.deviceId} value={device.deviceId}>
                                                {device.label ? device.label.replace(/\(.*?\)/g, '').trim() || `Camera ${i + 1}` : `Camera ${i + 1}`}
                                            </option>
                                        ))}
                                    </select>
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none w-4 h-4" viewBox="0 0 16 16" fill="none">
                                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            )}

                            {/* Camera viewport */}
                            <div className="relative w-full max-w-sm">

                                {/* Outer glow ring when active */}
                                {scannerActive && (
                                    <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[#00e5ff]/30 via-transparent to-[#00e5ff]/10 blur-sm pointer-events-none" />
                                )}

                                {/* Main viewport box */}
                                <div className={`relative w-full rounded-2xl overflow-hidden border transition-all duration-500 ${scannerActive ? 'border-[#00e5ff]/40 shadow-[0_0_60px_rgba(0,229,255,0.08)]' : 'border-white/10 bg-[#0a0a0a]'}`}
                                    style={{ aspectRatio: '4/3' }}>

                                    {/* Video feed */}
                                    <video
                                        ref={videoRef}
                                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${scannerActive ? 'opacity-100' : 'opacity-0'}`}
                                        playsInline
                                        muted
                                    />
                                    <canvas ref={canvasRef} className="hidden" />

                                    {/* Scan flash on detection */}
                                    {scanFlash && (
                                        <div className="absolute inset-0 bg-[#00e5ff]/15 pointer-events-none z-10 transition-opacity" />
                                    )}

                                    {/* Idle state — not started */}
                                    {!scannerActive && !cameraError && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                            {/* Decorative corner brackets */}
                                            {['top-6 left-6', 'top-6 right-6', 'bottom-6 left-6', 'bottom-6 right-6'].map((pos, i) => (
                                                <div key={pos} className={`absolute ${pos} w-8 h-8`}>
                                                    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full text-white/10">
                                                        {i === 0 && <><path d="M0 12V0h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>}
                                                        {i === 1 && <><path d="M32 12V0H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>}
                                                        {i === 2 && <><path d="M0 20v12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>}
                                                        {i === 3 && <><path d="M32 20v12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>}
                                                    </svg>
                                                </div>
                                            ))}

                                            <div className="flex flex-col items-center gap-3 text-center px-8">
                                                <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/10 flex items-center justify-center">
                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                                        <path d="M3 9V5a2 2 0 012-2h4M3 15v4a2 2 0 002 2h4M15 3h4a2 2 0 012 2v4M15 21h4a2 2 0 002-2v-4M9 9h1v1H9zM14 9h1v1h-1zM9 14h1v1H9zM14 14h1v1h-1z" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-white/40 text-sm font-black uppercase tracking-widest mb-1">Camera Off</p>
                                                    <p className="text-white/20 text-xs leading-relaxed">Start Scanning to activate the camera and begin check-in</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Camera error state */}
                                    {cameraError && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-8">
                                            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                    <circle cx="12" cy="12" r="10" stroke="rgb(248,113,113)" strokeWidth="1.5" />
                                                    <path d="M12 8v4M12 16h.01" stroke="rgb(248,113,113)" strokeWidth="1.5" strokeLinecap="round" />
                                                </svg>
                                            </div>
                                            <p className="text-red-400/80 text-xs leading-relaxed">{cameraError}</p>
                                        </div>
                                    )}

                                    {/* Active scanner overlay — crosshair + scan line */}
                                    {scannerActive && (
                                        <>
                                            {/* Corner brackets — active state */}
                                            {[
                                                'top-4 left-4',
                                                'top-4 right-4',
                                                'bottom-4 left-4',
                                                'bottom-4 right-4',
                                            ].map((pos, i) => (
                                                <div key={pos} className={`absolute ${pos} w-10 h-10 z-10`}>
                                                    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full text-[#00e5ff]">
                                                        {i === 0 && <path d="M0 16V0h16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />}
                                                        {i === 1 && <path d="M40 16V0H24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />}
                                                        {i === 2 && <path d="M0 24v16h16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />}
                                                        {i === 3 && <path d="M40 24v16H24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />}
                                                    </svg>
                                                </div>
                                            ))}

                                            {/* Animated scan line */}
                                            <div className="absolute inset-x-4 z-10 pointer-events-none" style={{ animation: 'scanLine 2.5s ease-in-out infinite' }}>
                                                <div className="h-px bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent opacity-80" />
                                                <div className="h-4 bg-gradient-to-b from-[#00e5ff]/15 to-transparent" />
                                            </div>

                                            {/* Center reticle
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                                <div className="w-32 h-32 rounded-xl border border-[#00e5ff]/20 flex items-center justify-center">
                                                    <div className="w-2 h-2 rounded-full bg-[#00e5ff]/60" />
                                                </div>
                                            </div> */}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex flex-col items-center gap-3 w-full max-w-sm">
                                {!scannerActive ? (
                                    <button
                                        onClick={startScanner}
                                        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-[#00e5ff] hover:bg-[#33ecff] text-black font-black uppercase tracking-widest text-sm transition-all duration-200 hover:-translate-y-0.5 shadow-[0_8px_32px_rgba(0,229,255,0.25)]"
                                    >
                                        Start Scanning
                                    </button>
                                ) : (
                                    <button
                                        onClick={stopScanner}
                                        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/60 hover:text-white font-black uppercase tracking-widest text-sm transition-all duration-200"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                        </svg>
                                        Stop Scanner
                                    </button>
                                )}

                                {/* Hint */}
                                <p className="text-white/15 text-[11px] text-center leading-relaxed">
                                    {scannerActive
                                        ? 'Point camera at a Tixano ticket QR code to check in an attendee'
                                        : 'Activate the scanner to begin checking in attendees'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Scan result modal ── */}
            {scanResult && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
                    onClick={() => {
                        if (scanResult.status !== 'verifying') {
                            setScanResult(null);
                            // Restart scanner for next scan
                            if (!scannerActive) {
                                startScanner();
                            }
                        }
                    }}
                >
                    <div
                        className="w-full max-w-sm bg-[#0a0a0a] border border-white/20 rounded-2xl overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {scanResult.status !== 'verifying' && (
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${scanResult.status === 'success' ? 'bg-[#00ff88]/10 border border-[#00ff88]/20' :
                                        scanResult.status === 'already_used' ? 'bg-[#ffaa00]/10 border border-[#ffaa00]/20' :
                                            'bg-red-500/10 border border-red-500/20'
                                        }`}>
                                        {scanResult.status === 'success' && (
                                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                                <path d="M2 8l4 4 8-8" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                        {scanResult.status === 'already_used' && (
                                            <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
                                                <path d="M8 4v4M8 11h.01" stroke="#ffaa00" strokeWidth="2" strokeLinecap="round" />
                                            </svg>
                                        )}
                                        {(scanResult.status === 'error' || scanResult.status === 'invalid_ticket' || scanResult.status === 'not_owned') && (
                                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                                <path d="M2 2l12 12M14 2L2 14" stroke="rgb(248,113,113)" strokeWidth="1.5" strokeLinecap="round" />
                                            </svg>
                                        )}
                                    </div>
                                )}
                                <div>
                                    <p className="text-white/30 text-[9px] uppercase tracking-widest">Ticket Scan</p>
                                    <h3 className={`text-sm font-black uppercase tracking-tight ${scanResult.status === 'verifying' ? 'text-[#00e5ff]' :
                                        scanResult.status === 'success' ? 'text-[#00ff88]' :
                                            scanResult.status === 'already_used' ? 'text-[#ffaa00]' :
                                                'text-red-400'
                                        }`}>
                                        {scanResult.status === 'verifying' ? 'Verifying...' :
                                            scanResult.status === 'success' ? 'Checked In' :
                                                scanResult.status === 'already_used' ? 'Already Used' :
                                                    scanResult.status === 'invalid_ticket' ? 'Invalid Ticket' :
                                                        scanResult.status === 'not_owned' ? 'Not Owned' :
                                                            'Verification Failed'}
                                    </h3>
                                </div>
                            </div>
                            {scanResult.status !== 'verifying' && (
                                <button
                                    onClick={() => setScanResult(null)}
                                    className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-white/30 hover:text-white transition-colors"
                                >
                                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                                        <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Modal body — result content */}
                        <div className="px-6 py-8 flex flex-col items-center justify-center min-h-[200px]">
                            {scanResult.status === 'verifying' ? (
                                <div className="flex flex-col items-center gap-4 text-center">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-2xl bg-[#00e5ff]/5 border border-[#00e5ff]/15 flex items-center justify-center">
                                            <div className="w-8 h-8 rounded-full border-2 border-[#00e5ff]/20 border-t-[#00e5ff] animate-spin" />
                                        </div>
                                        <div className="absolute inset-0 rounded-2xl border border-[#00e5ff]/10 animate-ping" />
                                    </div>
                                    <div>
                                        <p className="text-white/50 text-sm font-semibold mb-1">Verifying ticket...</p>
                                    </div>
                                    <div className="w-full bg-white/5 rounded-xl px-4 py-2.5">
                                        <p className="text-white/20 text-[10px] font-mono truncate">{scanResult.raw}</p>
                                    </div>
                                </div>
                            ) : scanResult.status === 'success' && scanResult.ticketData ? (
                                // Success state — checked in successfully
                                <div className="flex flex-col items-center gap-6 w-full">
                                    <div className="flex flex-col items-center gap-2">
                                        <p className="text-white/50 text-xs font-semibold mb-2">Attendee Details</p>
                                    </div>

                                    {/* Ticket Details Card */}
                                    <div className="w-full bg-gradient-to-br from-[#00ff88]/8 to-[#00ff88]/3 border border-[#00ff88]/20 rounded-xl p-4 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Name</p>
                                                <p className="text-white text-sm font-semibold truncate">{scanResult.ticketData.owner_name}</p>
                                            </div>
                                            <div>
                                                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Email</p>
                                                <p className="text-[#00e5ff]/70 text-xs font-mono truncate">{scanResult.ticketData.owner_email}</p>
                                            </div>
                                        </div>

                                        {scanResult.ticketData.owner_phone && (
                                            <div>
                                                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Phone</p>
                                                <p className="text-white text-xs font-mono">{scanResult.ticketData.owner_phone}</p>
                                            </div>
                                        )}

                                        <div>
                                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Ticket ID</p>
                                            <p className="text-white/60 text-[10px] font-mono truncate">{scanResult.ticketData.asset_name}</p>
                                        </div>

                                        <div>
                                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Check-in Time</p>
                                            <p className="text-[#00ff88]/90 text-xs font-semibold">{formatTime(scanResult.ticketData.used_at || new Date().toISOString())}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setScanResult(null);
                                            if (!scannerActive) {
                                                startScanner();
                                            }
                                        }}
                                        className="w-full py-3 rounded-xl bg-[#00e5ff] text-black font-black uppercase tracking-widest text-xs hover:bg-[#33ecff] transition-all duration-200"
                                    >
                                        Scan Next
                                    </button>
                                </div>
                            ) : scanResult.status === 'already_used' && scanResult.ticketData ? (
                                // Already used state
                                <div className="flex flex-col items-center gap-6 w-full">
                                    <div className="flex flex-col items-center gap-2">
                                        <p className="text-[#ffaa00]/70 text-xs font-semibold mb-2">Ticket Already Used</p>
                                        <p className="text-white/30 text-[11px] leading-relaxed text-center">This ticket has already been checked in previously</p>
                                    </div>

                                    {/* Previous Check-in Details */}
                                    <div className="w-full bg-gradient-to-br from-[#ffaa00]/8 to-[#ffaa00]/3 border border-[#ffaa00]/20 rounded-xl p-4 space-y-3">
                                        <div>
                                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Attendee</p>
                                            <p className="text-white text-sm font-semibold">{scanResult.ticketData.owner_name}</p>
                                        </div>

                                        <div>
                                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Email</p>
                                            <p className="text-white/60 text-xs font-mono truncate">{scanResult.ticketData.owner_email}</p>
                                        </div>

                                        <div>
                                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Check-in Time</p>
                                            <p className="text-[#ffaa00]/90 text-xs font-semibold">
                                                {scanResult.ticketData.used_at ? formatTime(scanResult.ticketData.used_at) : 'Unknown'}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setScanResult(null);
                                            if (!scannerActive) {
                                                startScanner();
                                            }
                                        }}
                                        className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-widest text-xs hover:bg-white/10 hover:text-white transition-all duration-200"
                                    >
                                        Scan Next
                                    </button>
                                </div>
                            ) : scanResult.status === 'invalid_ticket' ? (
                                // Invalid ticket state
                                <div className="flex flex-col items-center gap-6 w-full">
                                    <div className="flex flex-col items-center gap-2">
                                        <p className="text-red-400/80 text-xs font-semibold mb-2">Invalid Ticket</p>
                                        <p className="text-white/30 text-[11px] leading-relaxed text-center">The scanned QR code does not match a valid ticket for this event</p>
                                    </div>

                                    <div className="w-full bg-red-500/8 border border-red-500/20 rounded-xl p-4">
                                        <p className="text-white/40 text-[10px] font-mono text-center break-all">{scanResult.raw}</p>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setScanResult(null);
                                            if (!scannerActive) {
                                                startScanner();
                                            }
                                        }}
                                        className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-widest text-xs hover:bg-white/10 hover:text-white transition-all duration-200"
                                    >
                                        Scan Again
                                    </button>
                                </div>
                            ) : scanResult.status === 'not_owned' ? (
                                // Not owned state — ticket exists but not owned by wallet
                                <div className="flex flex-col items-center gap-6 w-full">
                                    <div className="flex flex-col items-center gap-2">
                                        <p className="text-red-400/80 text-xs font-semibold mb-2">Ticket Not Owned</p>
                                        <p className="text-white/30 text-[11px] leading-relaxed text-center">The ticket NFT is not owned by the registered wallet</p>
                                    </div>

                                    <div className="w-full bg-red-500/8 border border-red-500/20 rounded-xl p-4 space-y-2">
                                        <div>
                                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Registered Wallet</p>
                                            <p className="text-white/50 text-[10px] font-mono break-all">{scanResult.ticketData?.owner_wallet}</p>
                                        </div>
                                        <div>
                                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Ticket ID</p>
                                            <p className="text-white/50 text-[10px] font-mono">{scanResult.ticketData?.asset_name}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setScanResult(null);
                                            if (!scannerActive) {
                                                startScanner();
                                            }
                                        }}
                                        className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-widest text-xs hover:bg-white/10 hover:text-white transition-all duration-200"
                                    >
                                        Scan Again
                                    </button>
                                </div>
                            ) : (
                                // Error state
                                <div className="flex flex-col items-center gap-6 w-full">
                                    <div className="flex flex-col items-center gap-2">
                                        <p className="text-red-400/80 text-xs font-semibold mb-2">Verification Error</p>
                                        <p className="text-white/30 text-[11px] leading-relaxed text-center">{scanResult.message || 'An error occurred during verification'}</p>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setScanResult(null);
                                            if (!scannerActive) {
                                                startScanner();
                                            }
                                        }}
                                        className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-widest text-xs hover:bg-white/10 hover:text-white transition-all duration-200"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Scan line animation keyframes */}
            <style jsx global>{`
        @keyframes scanLine {
          0%   { top: 15%; }
          50%  { top: 80%; }
          100% { top: 15%; }
        }
        
        select option {
          background-color: #000;
          color: #fff;
          padding: 0.5rem;
        }
        
        select option:checked {
          background-color: #000;
          color: #fff;
        }
      `}</style>
        </>
    );
}