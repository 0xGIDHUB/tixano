import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useWallet } from '@meshsdk/react';
import { supabase } from '@/lib/supabase/client';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { buildMintAttendeeTicketTx, getAttendeeTokenName} from '@/lib/cardano/mint';
import { waitForConfirmation } from '@/lib/cardano/verify';
import { generateTicketImage } from '@/lib/ipfs/generateTicketImage';
import { ThreeDot } from "react-loading-indicators";

interface Event {
    id: string;
    title: string;
    event_alias: string;
    description: string | null;
    date: string | null;
    start_time: string | null;
    end_time: string | null;
    city: string | null;
    country: string | null;
    address: string | null;
    pricing: string;
    ticket_price: number | null;
    capacity: number | null;
    total_registrations: number;
    registration_deadline: string | null;
    cover_image_url: string | null;
    banner_image_url: string | null;
    organizer_wallet: string;
    policy_id: string | null;
    created_at: string;
    organizer_name: string | null;
    organizer_link: string | null;
}

interface RegistrationForm {
    fullName: string;
    email: string;
    phone: string;
    expectation: string;
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'TBA';
    return new Date(dateStr).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
}

function formatTime(timeStr: string | null): string {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const period = hour >= 12 ? 'PM' : 'AM';
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display}:${m} ${period}`;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-white/40">
                {icon}
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-white/30 text-[10px] uppercase tracking-widest font-semibold">{label}</span>
                <span className="text-white/80 text-sm mt-0.5">{value}</span>
            </div>
        </div>
    );
}

function SkeletonEventDetail() {
    return (
        <div className="min-h-screen bg-black animate-pulse">

            {/* Banner skeleton */}
            <div className="w-full h-[280px] sm:h-[340px] bg-white/5" />

            {/* Cover + title overlap */}
            <div className="max-w-6xl mx-auto px-6">
                <div className="relative -mt-16 flex flex-col sm:flex-row items-start sm:items-end gap-5 pb-6">
                    <div className="flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-white/10" />
                    <div className="flex-1 pb-1 flex flex-col gap-3">
                        <div className="h-4 w-20 bg-white/10 rounded-full" />
                        <div className="h-8 w-2/3 bg-white/10 rounded-lg" />
                        <div className="h-6 w-1/3 bg-white/5 rounded-lg" />
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="max-w-6xl mx-auto px-6 pb-20">
                <div className="flex flex-col lg:flex-row gap-10 items-start">

                    {/* Left */}
                    <div className="flex-1 min-w-0 flex flex-col gap-8">
                        <div className="h-3 w-24 bg-white/5 rounded" />

                        {/* About block */}
                        <div className="flex flex-col gap-3">
                            <div className="h-3 w-32 bg-white/10 rounded" />
                            <div className="h-px bg-white/5" />
                            <div className="h-3 w-full bg-white/5 rounded" />
                            <div className="h-3 w-5/6 bg-white/5 rounded" />
                            <div className="h-3 w-4/6 bg-white/5 rounded" />
                        </div>

                        {/* Details block */}
                        <div className="flex flex-col gap-3">
                            <div className="h-3 w-28 bg-white/10 rounded" />
                            <div className="bg-white/5 rounded-2xl px-4 py-3 flex flex-col gap-4">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex-shrink-0" />
                                        <div className="flex flex-col gap-1.5 flex-1">
                                            <div className="h-2 w-16 bg-white/5 rounded" />
                                            <div className="h-3 w-40 bg-white/8 rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Organiser block */}
                        <div className="flex flex-col gap-3">
                            <div className="h-3 w-24 bg-white/10 rounded" />
                            <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
                                <div className="flex flex-col gap-2 flex-1">
                                    <div className="h-2 w-16 bg-white/5 rounded" />
                                    <div className="h-3 w-32 bg-white/8 rounded" />
                                    <div className="h-2 w-48 bg-white/5 rounded" />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right — registration card */}
                    <div className="w-full lg:w-[320px] flex-shrink-0">
                        <div className="bg-white/5 rounded-2xl p-5 flex flex-col gap-4">
                            <div className="flex items-center justify-between pb-5 border-b border-white/5">
                                <div className="flex flex-col gap-2">
                                    <div className="h-2 w-16 bg-white/5 rounded" />
                                    <div className="h-7 w-20 bg-white/10 rounded" />
                                </div>
                                <div className="flex flex-col gap-2 items-end">
                                    <div className="h-2 w-16 bg-white/5 rounded" />
                                    <div className="h-7 w-12 bg-white/10 rounded" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="h-2.5 w-20 bg-white/5 rounded" />
                                        <div className="h-2.5 w-32 bg-white/8 rounded" />
                                    </div>
                                ))}
                            </div>
                            <div className="h-12 w-full bg-white/10 rounded-xl mt-2" />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default function EventDetail() {
    const router = useRouter();
    const { eventId } = router.query;
    const { connected, wallet } = useWallet();
    const { toast, showToast, closeToast } = useToast();

    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [showRegModal, setShowRegModal] = useState(false);
    const [registering, setRegistering] = useState(false);
    const [regForm, setRegForm] = useState<RegistrationForm>({
        fullName: '', email: '', phone: '', expectation: '',
    });
    const [processingStep, setProcessingStep] = useState<'signing' | 'confirming' | 'saving' | null>(null);

    useEffect(() => {
        if (!eventId) return;
        async function fetchEvent() {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();
            if (!error && data) setEvent(data);
            setLoading(false);
        }
        fetchEvent();
    }, [eventId]);

    const isFull = event?.capacity ? event.total_registrations >= event.capacity : false;
    const isPast = event?.date ? new Date(event.date) < new Date(new Date().toDateString()) : false;
    const isDeadlinePassed = event?.registration_deadline
        ? new Date(event.registration_deadline) < new Date(new Date().toDateString())
        : false;

    const canRegister = !isFull && !isPast && !isDeadlinePassed;

    function handleRegisterClick() {
        if (!connected) {
            showToast('Connect your wallet to register for this event.', {
                title: 'Wallet Required',
                type: 'info',
                duration: 5000,
            });
            return;
        }
        setShowRegModal(true);
    }

    async function handleRegistrationSubmit() {
        if (!regForm.fullName || !regForm.email) {
            showToast('Please fill in your name and email to continue.', {
                title: 'Required Fields',
                type: 'warning',
                duration: 4000,
            });
            return;
        }

        if (!event) {
            showToast('Event data could not be loaded. Please try again.', {
                title: 'Error',
                type: 'error',
                duration: 4000,
            });
            return;
        }

        setRegistering(true);
        setShowRegModal(false);

        let claimedNumber: number | null = null;
        // This flips to true the moment buildMintAttendeeTicketTx resolves.
        // After that point, the number is permanently committed to the NFT
        // metadata on-chain and must NEVER be released back to the pool.
        let mintSubmitted = false;

        try {
            const ticketUuid = crypto.randomUUID();

            // ── 1. Claim registration number ──────────────────────────────────────
            setProcessingStep('signing');

            const claimRes = await fetch('/api/tickets/claim-number', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: event.id }),
            });

            if (!claimRes.ok) {
                const err = await claimRes.json();
                throw new Error(err.error || 'Failed to claim registration number');
            }

            const { registrationNumber } = await claimRes.json();
            claimedNumber = registrationNumber;

            // Generate ticket NFT image and upload to IPFS
            const nftImageUri = await generateTicketImage({
                bannerImageUrl: event.banner_image_url,
                ticketId: ticketUuid,
                eventTitle: event.title,
                eventAlias: event.event_alias,
                eventDate: event.date,
                assetName: getAttendeeTokenName(event.event_alias, registrationNumber),
            });

            // ── 2. Mint NFT ───────────────────────────────────────────────────────
            const { txHash, policyId, assetName } = await buildMintAttendeeTicketTx({
                wallet,
                eventUuid: event.id,
                eventAlias: event.event_alias,
                eventTitle: event.title,
                eventDate: event.date ?? '',
                eventPricing: event.pricing as 'free' | 'paid',
                ticketUuid,
                ticketOwnerName: regForm.fullName,
                registrationNumber,
                nftImageUri,
            });

            // Mint was submitted to chain — number is now permanently committed.
            // Do not release it under any circumstances after this point.
            mintSubmitted = true;

            // ── 3. Wait for on-chain confirmation ─────────────────────────────────
            setProcessingStep('confirming');
            await waitForConfirmation(txHash);

            // ── 4. Save ticket to database ────────────────────────────────────────
            setProcessingStep('saving');
            const attendeeAddress = await wallet.getChangeAddressBech32();

            const ticketRes = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticketId: ticketUuid,
                    eventId: event.id,
                    policyId,
                    assetName,
                    txHash,
                    ownerWallet: attendeeAddress,
                    ownerName: regForm.fullName,
                    ownerEmail: regForm.email,
                    ownerPhone: regForm.phone || null,
                    ownerExpectation: regForm.expectation || null,
                    nftImageUrl: nftImageUri,
                }),
            });

            if (!ticketRes.ok) {
                const err = await ticketRes.json();
                throw new Error(err.error || 'Failed to save ticket');
            }

            // ── 5. Done ───────────────────────────────────────────────────────────
            setRegistering(false);
            setProcessingStep(null);

            showToast('Your NFT ticket has been minted successfully.', {
                title: 'Registration Complete',
                type: 'success',
                duration: 10000,
                txHash,
            });

            // Refresh event data to update registration count.
            const { data } = await supabase
                .from('events')
                .select('total_registrations')
                .eq('id', event.id)
                .single();
            if (data) setEvent(prev => prev ? { ...prev, total_registrations: data.total_registrations } : prev);

            // ── Finally, send confirmation email ────────────────────────────────────────
            await fetch('/api/tickets/send-confirmation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ownerEmail: regForm.email,
                    ownerName: regForm.fullName,
                    eventTitle: event.title,
                    eventDate: event.date ?? 'TBA',
                    eventStartTime: event.start_time,
                    ticketId: ticketUuid,
                    txHash,
                    assetName,
                }),
            });

        } catch (err: any) {
            console.error(err);

            // Only release the number if the mint was never submitted.
            // If mintSubmitted is true, the number is baked into an NFT on-chain
            // and releasing it would cause a duplicate registration number.
            if (claimedNumber !== null && !mintSubmitted) {
                await fetch('/api/tickets/release-number', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventId: event.id,
                        registrationNumber: claimedNumber,
                    }),
                }).catch(() => { });
            }

            setRegistering(false);
            setProcessingStep(null);
            showToast(err.message || 'Registration failed. Please try again.', {
                title: 'Error',
                type: 'error',
                duration: 8000,
            });
        }
    }

    const mapsUrl = event?.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            [event.address, event.city, event.country].filter(Boolean).join(', ')
        )}`
        : null;

    const inputClass = "w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00e5ff]/50 focus:ring-1 focus:ring-[#00e5ff]/20 transition-all duration-200";
    const labelClass = "block text-white/40 text-[11px] uppercase tracking-[0.12em] font-semibold mb-2";

    if (loading) {
        return <SkeletonEventDetail />;
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
                <p className="text-white/40 text-sm">Event not found.</p>
                <Link href="/events" className="text-[#00e5ff] text-xs hover:underline">← Back to Events</Link>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>{event.title} — Tixano</title>
            </Head>

            <div className="min-h-screen bg-black">

                {/* ── HERO: Banner + Cover ── */}
                <div className="relative">

                    {/* Banner */}
                    <div className="w-full h-[280px] sm:h-[340px] overflow-hidden relative">
                        {event.banner_image_url ? (
                            <img src={event.banner_image_url} alt={event.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#0a0a0a] to-[#111]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    </div>

                    {/* Cover + Title row — overlaps the banner */}
                    <div className="max-w-6xl mx-auto px-6">
                        <div className="relative -mt-16 flex flex-col sm:flex-row items-start sm:items-end gap-5 pb-6">

                            {/* Cover image */}
                            <div className="flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-black shadow-2xl bg-[#111]">
                                {event.cover_image_url ? (
                                    <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
                                        <span className="text-white/10 text-[10px] uppercase tracking-widest">No Image</span>
                                    </div>
                                )}
                            </div>

                            {/* Title + badges */}
                            <div className="flex-1 min-w-0 pb-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${event.pricing === 'free' ? 'text-[#00ff88] border-[#00ff88]/30 bg-[#00ff88]/10' : 'text-[#00e5ff] border-[#00e5ff]/30 bg-[#00e5ff]/10'}`}>
                                        {event.pricing === 'free' ? 'Free Entry' : `₳ ${event.ticket_price}`}
                                    </span>
                                    {isFull && <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-400">Sold Out</span>}
                                    {isPast && <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-white/30">Past Event</span>}
                                </div>
                                <h1 className="text-white font-black text-2xl sm:text-4xl uppercase tracking-tight leading-tight">
                                    {event.title}
                                </h1>
                            </div>

                        </div>
                    </div>
                </div>

                {/* ── BODY ── */}
                <div className="max-w-6xl mx-auto px-6 pb-20">
                    <div className="flex flex-col lg:flex-row gap-10 items-start">

                        {/* ── LEFT: Details ── */}
                        <div className="flex-1 min-w-0">

                            {/* Back link */}
                            <Link href="/events" className="inline-flex items-center gap-1.5 text-white/30 text-xs hover:text-white/60 transition-colors mb-8">
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                Back to Events
                            </Link>

                            {/* About */}
                            {event.description && (
                                <div className="mb-10">
                                    <h2 className="text-white font-black uppercase text-sm tracking-widest mb-4">About This Event</h2>
                                    <div className="border-t border-white/5 pt-4">
                                        <p className="text-white/55 text-sm leading-[1.9] whitespace-pre-wrap">{event.description}</p>
                                    </div>
                                </div>
                            )}

                            {/* Event Details */}
                            <div className="mb-10">
                                <h2 className="text-white font-black uppercase text-sm tracking-widest mb-4">Event Details</h2>
                                <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl px-4 py-2">

                                    <InfoRow
                                        icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>}
                                        label="Date"
                                        value={formatDate(event.date)}
                                    />

                                    {event.start_time && (
                                        <InfoRow
                                            icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" /><path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>}
                                            label="Time"
                                            value={`${formatTime(event.start_time)}${event.end_time ? ` — ${formatTime(event.end_time)}` : ''}`}
                                        />
                                    )}

                                    {(event.city || event.country) && (
                                        <InfoRow
                                            icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.51 1.5 3.5 3.51 3.5 6c0 3.75 4.5 8.5 4.5 8.5S12.5 9.75 12.5 6c0-2.49-2.01-4.5-4.5-4.5z" stroke="currentColor" strokeWidth="1.2" /><circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" /></svg>}
                                            label="Location"
                                            value={[event.city, event.country].filter(Boolean).join(', ')}
                                        />
                                    )}

                                    {event.capacity && (
                                        <InfoRow
                                            icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" /><path d="M1.5 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M11 7.5c1.5 0 3 1 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><circle cx="11" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2" /></svg>}
                                            label="Capacity"
                                            value={`${event.total_registrations} / ${event.capacity} registered`}
                                        />
                                    )}

                                    {event.registration_deadline && (
                                        <InfoRow
                                            icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" /><path d="M8 5v3M8 11h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>}
                                            label="Registration Deadline"
                                            value={formatDate(event.registration_deadline)}
                                        />
                                    )}

                                </div>
                            </div>

                            {/* Address + Map */}
                            {event.address && (
                                <div className="mb-10">
                                    <h2 className="text-white font-black uppercase text-sm tracking-widest mb-4">Venue</h2>
                                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4">
                                        <p className="text-white/60 text-sm mb-3">
                                            {[event.address, event.city, event.country].filter(Boolean).join(', ')}
                                        </p>
                                        {mapsUrl && (
                                            <a
                                                href={mapsUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-[#00e5ff] text-xs font-semibold hover:underline"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                                    <path d="M8 1.5C5.51 1.5 3.5 3.51 3.5 6c0 3.75 4.5 8.5 4.5 8.5S12.5 9.75 12.5 6c0-2.49-2.01-4.5-4.5-4.5z" stroke="currentColor" strokeWidth="1.2" />
                                                    <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                                                </svg>
                                                Open in Google Maps ↗
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Capacity bar */}
                            {event.capacity && (
                                <div className="mb-10">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-white/30 text-[11px] uppercase tracking-widest font-semibold">Registration Progress</span>
                                        <span className="text-white/50 text-xs">{event.total_registrations}/{event.capacity}</span>
                                    </div>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-[#00e5ff]'}`}
                                            style={{ width: `${Math.min((event.total_registrations / event.capacity) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-white/20 text-[11px] mt-1.5">
                                        {isFull ? 'This event is fully booked' : `${event.capacity - event.total_registrations} spots remaining`}
                                    </p>
                                </div>
                            )}

                            {/* Organiser */}
                            <div className="mb-10">
                                <h2 className="text-white font-black uppercase text-sm tracking-widest mb-4">Organiser</h2>
                                <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/20 flex items-center justify-center flex-shrink-0">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="8" r="4" stroke="#00e5ff" strokeWidth="1.5" />
                                            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-white/30 text-[10px] uppercase tracking-widest font-semibold">
                                                Hosted By
                                            </span>
                                            {/* Name — clickable if link provided */}
                                            {event.organizer_link ? (
                                                <a href={event.organizer_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[#00e5ff] text-sm font-bold hover:underline truncate"
                                                >
                                                    {event.organizer_name || 'Anonymous'}
                                                </a>
                                            ) : (
                                                <span className="text-white/70 text-sm font-semibold truncate">
                                                    {event.organizer_name || 'Anonymous'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Truncated wallet with copy */}
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-white/30 text-xs font-mono truncate">
                                                {event.organizer_wallet.slice(0, 12)}...{event.organizer_wallet.slice(-8)}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(event.organizer_wallet);
                                                    showToast('Organiser wallet address copied.', {
                                                        title: 'Copied',
                                                        type: 'success',
                                                        duration: 3000,
                                                    });
                                                }}
                                                className="flex-shrink-0 text-white/20 hover:text-[#00e5ff] transition-colors duration-200"
                                                title="Copy full wallet address"
                                            >
                                                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                                                    <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                                                    <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Share */}
                            <div className="mb-10">
                                <h2 className="text-white font-black uppercase text-sm tracking-widest mb-4">Share Event</h2>
                                <div className="flex gap-3">

                                    {/* Copy link */}
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(window.location.href);
                                            showToast('Event link copied to clipboard.', {
                                                title: 'Link Copied',
                                                type: 'success',
                                                duration: 3000,
                                            });
                                        }}
                                        className="flex items-center gap-2.5 px-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl text-white/50 text-xs font-semibold hover:border-white/25 hover:text-white/70 transition-all duration-200"
                                    >
                                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                            <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                                            <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                                        </svg>
                                        Copy Link
                                    </button>

                                    {/* Share on X / Twitter */}

                                    <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out "${event.title}" on Tixano - an on-chain hosted event on Cardano`)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2.5 px-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl text-white/50 text-xs font-semibold hover:border-white/25 hover:text-white/70 transition-all duration-200">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M18.89 1.5H22.5L14.51 10.35L24 22.5H16.62L10.88 15.73L4.12 22.5H0.51L8.91 13.27L0 1.5H7.59L12.89 7.76L18.89 1.5ZM17.05 20.68H19.39L6.31 3.77H3.8L17.05 20.68Z" />
                                        </svg>
                                        Share on X
                                    </a>

                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT: Registration Card ── */}
                        <div className="w-full lg:w-[320px] flex-shrink-0 lg:sticky lg:top-24">
                            <div className="bg-[#0a0a0a] border border-white/8 rounded-2xl p-5">

                                {/* Price */}
                                <div className="flex items-center justify-between mb-5 pb-5 border-b border-white/5">
                                    <div>
                                        <span className="text-white/30 text-[10px] uppercase tracking-widest block mb-0.5">Ticket Price</span>
                                        <span className={`text-2xl font-black ${event.pricing === 'free' ? 'text-[#00ff88]' : 'text-white'}`}>
                                            {event.pricing === 'free' ? 'FREE' : `₳ ${event.ticket_price}`}
                                        </span>
                                    </div>
                                    {event.capacity && (
                                        <div className="text-right">
                                            <span className="text-white/30 text-[10px] uppercase tracking-widest block mb-0.5">Spots Left</span>
                                            <span className={`text-2xl font-black ${isFull ? 'text-red-400' : 'text-white'}`}>
                                                {isFull ? '0' : event.capacity - event.total_registrations}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Key dates */}
                                <div className="flex flex-col gap-2 mb-5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-white/30">Event Date</span>
                                        <span className="text-white/70">{formatDate(event.date)}</span>
                                    </div>
                                    {event.registration_deadline && (
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-white/30">Deadline</span>
                                            <span className={`${isDeadlinePassed ? 'text-red-400' : 'text-white/70'}`}>
                                                {formatDate(event.registration_deadline)}
                                            </span>
                                        </div>
                                    )}
                                    {event.start_time && (
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-white/30">Starts At</span>
                                            <span className="text-white/70">{formatTime(event.start_time)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Register button */}
                                {canRegister ? (
                                    <button
                                        onClick={handleRegisterClick}
                                        className="w-full bg-[#00e5ff] text-black font-black uppercase tracking-widest py-3.5 rounded-xl text-sm hover:bg-[#33ecff] transition-all duration-200 hover:-translate-y-0.5"
                                    >
                                        {connected ? 'Register Now' : 'Connect to Register'}
                                    </button>
                                ) : (
                                    <button disabled className="w-full bg-white/5 text-white/20 font-black uppercase tracking-widest py-3.5 rounded-xl text-sm border border-white/5 cursor-not-allowed">
                                        {isFull ? 'Sold Out' : isPast ? 'Event Ended' : 'Registration Closed'}
                                    </button>
                                )}

                                {/* Wallet hint */}
                                {!connected && canRegister && (
                                    <p className="text-white/20 text-[11px] text-center mt-3 leading-relaxed">
                                        You need a Cardano wallet connected to register and receive your NFT ticket
                                    </p>
                                )}

                                {/* On-chain info */}
                                {event.policy_id && (
                                    <div className="mt-5 pt-5 border-t border-white/5">
                                        <span className="text-white/20 text-[10px] uppercase tracking-widest block mb-1.5">Policy ID</span>
                                        <p className="text-white/30 text-[10px] font-mono break-all leading-relaxed">
                                            {event.policy_id}
                                        </p>
                                    </div>
                                )}

                            </div>
                        </div>

                    </div>
                </div>
            </div >

            {/* Processing Modal */}
            {registering && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm px-4">
                    <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl text-center">

                        {/* Loading Animation */}
                        <div className="flex items-center justify-center mb-8 mt-8 w-full">
                            <ThreeDot color="#00e5ff" size="small" text="" textColor="" />
                        </div>

                        <h2 className="text-white font-black uppercase tracking-tight text-lg mb-2">
                            {processingStep === 'signing' && 'Waiting for Signature'}
                            {processingStep === 'confirming' && 'Confirming Transaction'}
                            {processingStep === 'saving' && 'Almost Done'}
                            {!processingStep && 'Processing...'}
                        </h2>

                        <p className="text-white/40 text-sm leading-relaxed mb-6">
                            {processingStep === 'signing' &&
                                'Sign the transaction in your wallet to mint your NFT ticket.'}
                            {processingStep === 'confirming' &&
                                'Your transaction has been submitted. Waiting for confirmation on the Cardano blockchain. This may take 30–60 seconds.'}
                            {processingStep === 'saving' &&
                                'Transaction confirmed. Saving your ticket details...'}
                            {!processingStep && 'Please wait...'}
                        </p>

                        {processingStep === 'confirming' && (
                            <div className="flex items-center gap-2 bg-[#ffaa00]/10 border border-[#ffaa00]/20 rounded-lg px-4 py-3">
                                <span className="text-[#ffaa00] text-lg flex-shrink-0">⚠</span>
                                <p className="text-[#ffaa00]/80 text-xs text-left leading-relaxed">
                                    Do not close this tab or navigate away during confirmation.
                                </p>
                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* ── REGISTRATION MODAL ── */}
            {
                showRegModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                        <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

                            {/* Modal header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                                <div>
                                    <h2 className="text-white font-black uppercase tracking-tight">Register for Event</h2>
                                    <p className="text-white/30 text-xs mt-0.5 truncate max-w-[260px]">{event.title}</p>
                                </div>
                                <button onClick={() => setShowRegModal(false)} className="text-white/30 hover:text-white transition-colors text-xl leading-none">✕</button>
                            </div>

                            {/* Form */}
                            <div className="px-6 py-5 flex flex-col gap-4 max-h-[65vh] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Name <span className="text-red-400">*</span></label>
                                        <input
                                            type="text"
                                            placeholder="Your name"
                                            value={regForm.fullName}
                                            onChange={(e) => setRegForm(f => ({ ...f, fullName: e.target.value }))}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Email Address <span className="text-red-400">*</span></label>
                                        <input
                                            type="email"
                                            placeholder="your@email.com"
                                            value={regForm.email}
                                            onChange={(e) => setRegForm(f => ({ ...f, email: e.target.value }))}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Phone Number</label>
                                    <input
                                        type="tel"
                                        placeholder="+234 000 000 0000"
                                        value={regForm.phone}
                                        onChange={(e) => setRegForm(f => ({ ...f, phone: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>What do you hope to get from this event?</label>
                                    <textarea
                                        placeholder="Share what you're looking forward to..."
                                        value={regForm.expectation}
                                        onChange={(e) => setRegForm(f => ({ ...f, expectation: e.target.value }))}
                                        rows={3}
                                        className={`${inputClass} resize-none`}
                                        style={{ scrollbarWidth: 'none' }}
                                    />
                                </div>

                                {/* NFT notice */}
                                <div className="flex items-start gap-3 bg-[#00e5ff]/5 border border-[#00e5ff]/15 rounded-xl px-4 py-3">
                                    <span className="text-[#00e5ff] text-sm flex-shrink-0 mt-0.5">⚠️</span>
                                    <p className="text-white/40 text-xs leading-relaxed">
                                        Registering for this event will mint an NFT ticket to your wallet and blockchain transaction charges will apply.
                                    </p>
                                </div>

                            </div>

                            {/* Modal footer */}
                            <div className="flex gap-3 px-6 py-5 border-t border-white/5">
                                <button
                                    onClick={() => setShowRegModal(false)}
                                    className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-sm font-bold uppercase tracking-widest hover:border-white/30 hover:text-white/70 transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRegistrationSubmit}
                                    disabled={registering}
                                    className="flex-1 py-3 rounded-xl bg-[#00e5ff] text-black text-sm font-black uppercase tracking-widest hover:bg-[#33ecff] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {registering ? 'Registering...' : 'Confirm Registration'}
                                </button>
                            </div>

                        </div>
                    </div>
                )
            }

            {
                toast && (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        title={toast.title}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={closeToast}
                    />
                )
            }
        </>
    );
}