import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@meshsdk/react';
import { supabase } from '@/lib/supabase/client';

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
    status: 'verifying' | 'success' | 'error' | 'already_used';
    ticketData?: any;
    message?: string;
}

export default function CheckInPage() {
    const router = useRouter();
    const { eventId } = router.query;
    const { connected } = useWallet();

    const [event, setEvent] = useState<EventInfo | null>(null);
    const [checkedIn, setCheckedIn] = useState<CheckedInTicket[]>([]);
    const [checkedInCount, setCheckedInCount] = useState(0);

    const [tableSearch, setTableSearch] = useState('');

    // Scanner state
    const [scannerActive, setScannerActive] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [scanFlash, setScanFlash] = useState(false);
    const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animFrameRef = useRef<number>(0);
    const scanCooldown = useRef(false);

    // Fetch event info + already-checked-in tickets
    useEffect(() => {
        if (!eventId || typeof eventId !== 'string') return;

        async function fetchData() {
            const [eventRes, ticketsRes] = await Promise.all([
                supabase.from('events').select('id, title, date, total_registrations, capacity').eq('id', eventId as string).single(),
                supabase.from('tickets').select('id, asset_name, owner_name, used_at').eq('event_id', eventId as string).eq('status', 'used').order('used_at', { ascending: false }),
            ]);

            if (eventRes.data) setEvent(eventRes.data);
            if (ticketsRes.data) {
                setCheckedIn(ticketsRes.data);
                setCheckedInCount(ticketsRes.data.length);
            }
        }

        fetchData();
    }, [eventId]);

    // QR decode using canvas + jsQR (loaded dynamically)
    const decodeFrame = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
            animFrameRef.current = requestAnimationFrame(decodeFrame);
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        try {
            // @ts-ignore — jsQR is loaded dynamically
            const jsQR = (window as any).jsQR;
            if (jsQR) {
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'dontInvert',
                });

                if (code && code.data && !scanCooldown.current && code.data !== lastScanned) {
                    scanCooldown.current = true;
                    setLastScanned(code.data);
                    setScanFlash(true);
                    setTimeout(() => setScanFlash(false), 400);
                    handleScanResult(code.data);
                    setTimeout(() => { scanCooldown.current = false; }, 3000);
                }
            }
        } catch { }

        animFrameRef.current = requestAnimationFrame(decodeFrame);
    }, [lastScanned]);

    // Load jsQR from CDN
    useEffect(() => {
        if ((window as any).jsQR) return;
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
        document.head.appendChild(script);
    }, []);

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
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setScannerActive(true);
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
        cancelAnimationFrame(animFrameRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        setScannerActive(false);
    }

    useEffect(() => {
        if (scannerActive) {
            animFrameRef.current = requestAnimationFrame(decodeFrame);
        }
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [scannerActive, decodeFrame]);

    useEffect(() => () => stopScanner(), []);

    async function handleScanResult(raw: string) {
        setScanResult({ raw, status: 'verifying' });
        // Verification logic to be built — placeholder for now
    }

    function formatTime(iso: string) {
        return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function formatDate(d: string | null) {
        if (!d) return 'TBA';
        return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    return (
        <>
            <Head>
                <title>{event?.title ? `Check-in — ${event.title}` : 'Check-in'} — Tixano</title>
            </Head>

            <div className="h-full bg-black flex flex-col overflow-hidden">

                {/* Top bar */}
                <div className="flex-shrink-0 border-b border-white/8 bg-black/90 backdrop-blur-sm sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">

                        {/* Event title — styled */}
                        <div className="flex items-center gap-3">
                            <div>
                                <p className="text-white/50 text-[8px] uppercase tracking-[0.3em] font-semibold leading-none mb-1">Event Check-in</p>
                                <h1 className="text-white font-black uppercase tracking-tight text-xl leading-none truncate max-w-md">
                                    {event?.title || '...'}
                                </h1>
                            </div>
                        </div>

                        {/* Right: scanner status */}
                        <div className="flex items-center gap-2.5 bg-white/3 border border-white/8 rounded-xl px-3 py-1.5">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${scannerActive ? 'bg-[#00ff88] shadow-[0_0_6px_rgba(0,255,136,0.6)]' : 'bg-white/20'}`}
                                style={scannerActive ? { animation: 'pulse 1.5s ease-in-out infinite' } : {}} />
                            <span className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">
                                {scannerActive ? 'Scanning' : 'Scanner Off'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main two-column layout */}
                <div className="flex-1 flex overflow-hidden gap-5 px-6 py-5 mt-5" style={{ height: 'calc(100vh - 57px)' }}>

                    {/* ── LEFT: Checked-in table — wider ── */}
                    <div className="w-[460px] flex-shrink-0 rounded-2xl flex flex-col bg-[#030303] border border-white/10">

                        {/* Table header */}
                        <div className="flex-shrink-0 px-5 py-4 border-b border-white/10">
                            <div className="flex items-center justify-between mb-1">
                                <h2 className="text-white/70 text-xs font-black uppercase tracking-widest">Checked In</h2>
                                <span className="text-[#00e5ff] text-xs font-bold tabular-nums bg-[#00e5ff]/10 border border-[#00e5ff]/20 px-2 py-0.5 rounded-full">
                                    {checkedInCount}
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
                        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
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
                                        className={`grid grid-cols-[1fr_1fr_auto] px-5 py-3 border-b border-white/3 hover:bg-white/2 transition-colors duration-150 ${idx === 0 && !tableSearch ? 'bg-[#00ff88]/3 border-l-2 border-l-[#00ff88]/30' : ''}`}
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
                                        {checkedInCount} / {event.total_registrations}
                                    </span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#00ff88] rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min((checkedInCount / event.total_registrations) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* ── RIGHT: Scanner interface ── */}
                    <div className="flex-1 flex flex-col bg-black rounded-2xl border border-white/10 overflow-hidden">

                        {/* Scanner area */}
                        <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 gap-4 relative">

                            {/* Camera selector — dropdown */}
                            {availableDevices.length > 1 && (
                                <div className="relative w-full max-w-sm">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 z-10 pointer-events-none">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
                                                    <p className="text-white/20 text-xs leading-relaxed">Press Start Scanning to activate the camera and begin check-in</p>
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
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                                            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
                                            <path d="M12 6a6 6 0 100 12A6 6 0 0012 6z" stroke="currentColor" strokeWidth="1.5" />
                                        </svg>
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
                    onClick={() => { if (scanResult.status !== 'verifying') setScanResult(null); }}
                >
                    <div
                        className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="px-6 pt-6 pb-4 border-b border-white/6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {scanResult.status === 'verifying' ? (
                                    <div className="w-8 h-8 rounded-xl bg-[#00e5ff]/10 border border-[#00e5ff]/20 flex items-center justify-center">
                                        <div className="w-4 h-4 rounded-full border-2 border-[#00e5ff]/30 border-t-[#00e5ff] animate-spin" />
                                    </div>
                                ) : (
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
                                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                                <path d="M8 5v4M8 11h.01" stroke="#ffaa00" strokeWidth="1.5" strokeLinecap="round" />
                                            </svg>
                                        )}
                                        {scanResult.status === 'error' && (
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
                                                    'Invalid Ticket'}
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

                        {/* Modal body — placeholder for result content */}
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
                                        <p className="text-white/20 text-xs">Checking against blockchain and database</p>
                                    </div>
                                    <div className="w-full bg-white/5 rounded-xl px-4 py-2.5">
                                        <p className="text-white/20 text-[10px] font-mono truncate">{scanResult.raw}</p>
                                    </div>
                                </div>
                            ) : (
                                // Result placeholder — to be built
                                <div className="flex flex-col items-center gap-3 text-center w-full">
                                    <div className="w-full h-32 bg-white/3 border border-white/6 rounded-xl flex items-center justify-center">
                                        <p className="text-white/15 text-xs uppercase tracking-widest">Result placeholder</p>
                                    </div>
                                    <button
                                        onClick={() => setScanResult(null)}
                                        className="w-full py-3 rounded-xl bg-[#00e5ff] text-black font-black uppercase tracking-widest text-xs hover:bg-[#33ecff] transition-all duration-200 mt-2"
                                    >
                                        Scan Next
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
          background-color: #0a0a0a;
          color: #fff;
          padding: 0.5rem;
        }
        
        select option:checked {
          background: linear-gradient(#00e5ff, #00e5ff);
          background-color: #00e5ff;
          color: #000;
        }
      `}</style>
        </>
    );
}