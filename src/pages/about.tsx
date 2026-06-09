import Head from 'next/head';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

// Custom hook for scroll animations
function useScrollAnimation(threshold = 0.1) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            setIsVisible(entry.isIntersecting);
        }, { threshold });

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, [threshold]);

    return [ref, isVisible] as const;
}

export default function About() {
    const [getStartedRef, getStartedVisible] = useScrollAnimation(0.15);
    const [walletsRef, walletsVisible] = useScrollAnimation(0.15);
    const [whyTixanoRef, whyTixanoVisible] = useScrollAnimation(0.15);
    const [faqRef, faqVisible] = useScrollAnimation(0.15);
    const [ctaRef, ctaVisible] = useScrollAnimation(0.15);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <Head>
                <title>About — Tixano</title>
                <meta name="description" content="Tixano is the NFT ticketing platform built on Cardano. Own your ticket, verify on-chain, attend with confidence." />
            </Head>

            <div className="min-h-screen bg-black">

                {/* ── HERO ── */}
                <section className="relative min-h-screen flex flex-col justify-center overflow-hidden px-6 pt-24 pb-20">


                    {/* Radial glow — top left */}
                    <div
                        className="absolute top-0 left-0 w-[600px] h-[600px] pointer-events-none"
                        style={{
                            background: 'radial-gradient(ellipse at 0% 0%, rgba(0,229,255,0.07) 0%, transparent 65%)',
                        }}
                    />

                    {/* Radial glow — bottom right */}
                    <div
                        className="absolute bottom-0 right-0 w-[600px] h-[600px] pointer-events-none"
                        style={{
                            background: 'radial-gradient(ellipse at 100% 100%, rgba(0,229,255,0.05) 0%, transparent 65%)',
                        }}
                    />

                    <div className="relative max-w-7xl mx-auto w-full">

                        {/* Two-column layout */}
                        <div className="flex flex-col items-center text-center max-w-7xl mx-auto">

                            {/* ── Text content ── */}
                            <div
                                className={`flex flex-col transition-all ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                                style={{ transitionDuration: '1000ms' }}
                            >


                                {/* Main headline */}
                                <h1 className="font-black uppercase leading-[0.92] tracking-tight mb-8">
                                    <span className="block text-white/90 text-[clamp(2.5rem,5.5vw,5rem)]">
                                        Tickets you
                                    </span>
                                    {/* Highlighted word 'own' */}
                                    <span className="relative block text-[clamp(2.5rem,5.5vw,5rem)]">
                                        <span className="relative z-10 text-[#00e5ff]">own</span>
                                    </span>
                                    <span className="block text-white/90 text-[clamp(2.5rem,5.5vw,5rem)]">
                                        Events you
                                    </span>
                                    {/* Highlighted word 'trust' */}
                                    <span className="relative block text-[clamp(2.5rem,5.5vw,5rem)]">
                                        <span className="relative z-10 text-[#00e5ff]">trust</span>
                                    </span>
                                </h1>

                                {/* Subheading */}
                                <p className="text-white/50 text-lg leading-relaxed max-w-4xl mb-10 font-light">
                                    Tixano replaces conventional tickets and fragile barcodes with NFTs that are
                                    verifiable on the Cardano blockchain, immune to fraud, and entirely yours.
                                </p>

                                {/* Stat pills */}
                                <div className="flex flex-wrap justify-center gap-3 mb-10">
                                    {[
                                        { label: 'On-Chain Verified', icon: '⛓' },
                                        { label: 'Wallet-Native', icon: '🔐' },
                                        { label: 'Zero Fakes', icon: '✓' },
                                    ].map(({ label, icon }) => (
                                        <div
                                            key={label}
                                            className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/3 text-white/50 text-xs font-semibold tracking-wide"
                                        >
                                            <span className="text-sm">{icon}</span>
                                            {label}
                                        </div>
                                    ))}
                                </div>


                            </div>

                        </div>


                    </div>
                </section>

                {/* ── GETTING STARTED ── */}
                <section className="relative px-6 py-24 border-t border-white/5 overflow-hidden">

                    {/* Subtle mid glow */}
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,229,255,0.04) 0%, transparent 70%)' }}
                    />

                    <div className="relative max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center" ref={getStartedRef}>

                            {/* ── LEFT: Text ── */}
                            <div className={`flex flex-col transition-all ${getStartedVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`} style={{ transitionDuration: '1500ms' }}>

                                {/* Eyebrow */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-px bg-[#00e5ff]/50" />
                                    <span className="text-[#00e5ff] text-[11px] font-bold uppercase tracking-[0.3em]">
                                        Getting Started
                                    </span>
                                </div>

                                {/* Headline */}
                                <h2 className="font-black uppercase leading-[0.92] tracking-tight mb-6 text-[clamp(2rem,4vw,3.2rem)]">
                                    <span className="block text-white/90">Three steps.</span>
                                    <span className="block text-white/90">Zero hassle.</span>
                                    <span className="block text-[#00e5ff]">You&apos;re in.</span>
                                </h2>

                                <p className="text-white/40 text-base leading-relaxed max-w-md mb-10 font-light">
                                    No forms, no forgotten passwords, and no cluttered inboxes.
                                    Connect your wallet, register for an event, and receive your NFT ticket instantly.
                                </p>

                                {/* Steps */}
                                <div className="flex flex-col gap-5">
                                    {[
                                        {
                                            number: '01',
                                            title: 'Connect Your Wallet',
                                            desc: 'Use any Cardano wallet — Vespr, Eternl, Lace, and more are supported.',
                                        },
                                        {
                                            number: '02',
                                            title: 'Find an Event',
                                            desc: 'Browse upcoming events and hit register. That\'s it.',
                                        },
                                        {
                                            number: '03',
                                            title: 'Get Your NFT Ticket',
                                            desc: 'Your ticket mints to your wallet instantly. Show the QR at the check-in.',
                                        },
                                    ].map(({ number, title, desc }) => (
                                        <div key={number} className="flex items-start gap-4 group">
                                            {/* Step number */}
                                            <div className="flex-shrink-0 w-9 h-9 rounded-xl border border-white/10 bg-white/3 flex items-center justify-center group-hover:border-[#00e5ff]/30 group-hover:bg-[#00e5ff]/5 transition-all duration-200">
                                                <span className="text-[10px] font-black text-white/30 group-hover:text-[#00e5ff]/60 transition-colors duration-200 tabular-nums">
                                                    {number}
                                                </span>
                                            </div>
                                            <div className="flex flex-col pt-1 min-w-0">
                                                <p className="text-white/80 text-sm font-bold mb-0.5">{title}</p>
                                                <p className="text-white/30 text-xs leading-relaxed">{desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                            </div>

                            {/* ── RIGHT: Video placeholder ── */}
                            <div className={`relative transition-all ${getStartedVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`} style={{ transitionDuration: '1500ms' }}>

                                {/* Outer glow frame */}
                                <div
                                    className="absolute -inset-px rounded-2xl pointer-events-none"
                                    style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.1) 0%, transparent 50%, rgba(0,229,255,0.05) 100%)' }}
                                />

                                {/* Video container */}
                                <div
                                    className="relative rounded-2xl border border-white/10 overflow-hidden bg-[#050505]"
                                    style={{ aspectRatio: '16/9' }}
                                >
                                    {/* Inner grid texture */}
                                    <div
                                        className="absolute inset-0 opacity-[0.03]"
                                        style={{
                                            backgroundImage: `
                linear-gradient(rgba(0,229,255,1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,229,255,1) 1px, transparent 1px)
              `,
                                            backgroundSize: '32px 32px',
                                        }}
                                    />

                                    {/* Subtle centre glow */}
                                    <div
                                        className="absolute inset-0"
                                        style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,229,255,0.05) 0%, transparent 65%)' }}
                                    />

                                    {/* Content */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">

                                        {/* Play button ring */}
                                        <div className="relative">
                                            <div className="absolute inset-0 rounded-full border border-[#00e5ff]/20 animate-ping" style={{ animationDuration: '2.5s' }} />
                                            <div className="w-16 h-16 rounded-full border border-[#00e5ff]/25 bg-[#00e5ff]/5 flex items-center justify-center">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                    <path d="M6 4.5l14 7.5-14 7.5V4.5z" fill="rgba(0,229,255,0.4)" stroke="rgba(0,229,255,0.5)" strokeWidth="1.5" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Label */}
                                        <div className="flex flex-col items-center gap-1.5 text-center px-8">
                                            <span className="text-white/40 text-sm font-bold uppercase tracking-widest">
                                                Video Coming Soon
                                            </span>
                                            <span className="text-white/20 text-xs leading-relaxed max-w-xs">
                                                A short walkthrough showing how to create an event, register as an attendee, and check in using your NFT ticket.
                                            </span>
                                        </div>

                                    </div>

                                    {/* Corner brackets — decorative */}
                                    {[
                                        'top-3 left-3',
                                        'top-3 right-3',
                                        'bottom-3 left-3',
                                        'bottom-3 right-3',
                                    ].map((pos, i) => (
                                        <div key={pos} className={`absolute ${pos} w-5 h-5`}>
                                            <svg viewBox="0 0 20 20" fill="none" className="w-full h-full text-[#00e5ff]/20">
                                                {i === 0 && <path d="M0 8V0h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
                                                {i === 1 && <path d="M20 8V0h-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
                                                {i === 2 && <path d="M0 12v8h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
                                                {i === 3 && <path d="M20 12v8h-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
                                            </svg>
                                        </div>
                                    ))}

                                    {/* Bottom label strip */}
                                    <div className="absolute bottom-0 left-0 right-0 px-5 py-3 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-white/15 text-[10px] uppercase tracking-widest">Tixano Demo</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]/30" />
                                            <span className="text-white/15 text-[10px] uppercase tracking-widest">~3 min</span>
                                        </div>
                                    </div>
                                </div>

                            </div>

                        </div>
                    </div>
                </section>

                {/* ── WALLETS ── */}
                <section className="relative px-6 py-24 border-t border-white/5 overflow-hidden">

                    {/* Subtle glow */}
                    <div
                        className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse at 100% 0%, rgba(0,229,255,0.04) 0%, transparent 65%)' }}
                    />

                    <div className="relative max-w-4xl mx-auto flex flex-col items-center text-center" ref={walletsRef}>

                        {/* Eyebrow */}
                        <div className={`flex items-center justify-center gap-3 mb-6 transition-all ${walletsVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDuration: '1500ms' }}>
                            <div className="w-8 h-px bg-[#00e5ff]/50" />
                            <span className="text-[#00e5ff] text-[11px] font-bold uppercase tracking-[0.3em]">
                                Wallet Native
                            </span>
                            <div className="w-8 h-px bg-[#00e5ff]/50" />
                        </div>

                        {/* Headline */}
                        <h2 className={`font-black uppercase leading-[0.92] tracking-tight mb-6 text-[clamp(2rem,4vw,3.2rem)] transition-all ${walletsVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDuration: '1500ms' }}>
                            <span className="block text-white/90">Your tickets live</span>
                            <span className="block text-[#00e5ff]">in your wallet.</span>
                        </h2>

                        {/* Subtext */}
                        <p className="text-white/40 text-base leading-relaxed max-w-xl mb-6 font-light">
                            Unlike traditional platforms that lock your tickets behind logins and apps,
                            Tixano NFT tickets are minted directly to your Cardano wallet the moment you register.
                            They belong to you, fully verifiable and always accessible.
                        </p>


                        {/* Wallet cards */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full mb-14">
                            {[
                                {
                                    name: 'Vespr',
                                    file: 'vespr.png',
                                    href: 'https://vespr.xyz',
                                    desc: 'Mobile-first',
                                },
                                {
                                    name: 'Eternl',
                                    file: 'eternl.png',
                                    href: 'https://eternl.io',
                                    desc: 'Feature-rich',
                                },
                                {
                                    name: 'Lace',
                                    file: 'lace.png',
                                    href: 'https://www.lace.io',
                                    desc: 'By IOG',
                                },
                            ].map(({ name, file, href, desc }) => (
                                <a
                                    key={name}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative flex flex-col items-center gap-4 w-full sm:w-56 bg-[#080808] border border-white/20 rounded-2xl px-6 py-8 hover:border-[#00e5ff]/30 hover:bg-[#00e5ff]/3 transition-all duration-300 hover:-translate-y-1"
                                >
                                    {/* Hover glow */}
                                    <div
                                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,229,255,0.06) 0%, transparent 70%)' }}
                                    />

                                    {/* Wallet logo */}
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center bg-white/5 border border-white/20 group-hover:border-[#00e5ff]/20 transition-all duration-300">
                                        <img
                                            src={`/${file}`}
                                            alt={name}
                                            className="w-full h-full object-contain p-2"
                                        />
                                    </div>

                                    {/* Name + desc */}
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-white/80 text-sm font-black uppercase tracking-widest group-hover:text-white transition-colors duration-200">
                                            {name}
                                        </span>
                                        <span className="text-white/25 text-[10px] uppercase tracking-widest">
                                            {desc}
                                        </span>
                                    </div>

                                    {/* Arrow — appears on hover */}
                                    <div className="flex items-center gap-1 text-[#00e5ff]/0 group-hover:text-[#00e5ff]/60 transition-all duration-200 text-[10px] uppercase tracking-widest font-bold">
                                        Get wallet
                                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                                            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </a>
                            ))}
                        </div>

                        {/* Bottom note */}
                        <div className="flex items-center justify-center gap-2 text-white/20 text-xs">
                            <span>Any CIP-30 compatible Cardano wallet works with Tixano</span>
                        </div>

                    </div>
                </section>

                {/* ── WHY TIXANO ── */}
                <section className="relative px-6 py-24 border-t border-white/5 overflow-hidden">

                    {/* Glow — bottom left */}
                    <div
                        className="absolute bottom-0 left-0 w-[500px] h-[500px] pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse at 0% 100%, rgba(0,229,255,0.04) 0%, transparent 65%)' }}
                    />

                    <div className="relative max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-16 items-start" ref={whyTixanoRef}>

                            {/* ── LEFT: Sticky headline block ── */}
                            <div className={`lg:sticky lg:top-28 flex flex-col transition-all ${whyTixanoVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`} style={{ transitionDuration: '1500ms' }}>

                                {/* Eyebrow */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-px bg-[#00e5ff]/50" />
                                    <span className="text-[#00e5ff] text-[11px] font-bold uppercase tracking-[0.3em]">
                                        Why Tixano
                                    </span>
                                </div>

                                <h2 className="font-black uppercase leading-[0.92] tracking-tight mb-6 text-[clamp(2rem,4vw,3.2rem)]">
                                    <span className="block text-white/90">The smarter</span>
                                    <span className="block text-white/90">way to do</span>
                                    <span className="block text-[#00e5ff]">events.</span>
                                </h2>


                                {/* Strategic callout */}
                                <div className="mt-10 p-5 rounded-2xl border border-[#00e5ff]/15 bg-[#00e5ff]/3">
                                    <p className="text-white/25 text-[10px] uppercase tracking-widest mb-2">The Real Shift</p>
                                    <p className="text-white/60 text-sm leading-relaxed">
                                        Tixano transforms tickets from{' '}
                                        <span className="text-white/40 line-through">&quot;temporary access codes&quot;</span>
                                        {' '}into{' '}
                                        <span className="text-[#00e5ff]/80 font-semibold">&quot;verifiable digital assets with utility&quot;</span>
                                    </p>
                                </div>

                            </div>

                            {/* ── RIGHT: Feature cards grid ── */}
                            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 transition-all ${whyTixanoVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`} style={{ transitionDuration: '1500ms' }}>
                                {[
                                    {
                                        tag: 'Security',
                                        title: 'Fraud-Proof by Design',
                                        body: 'Every ticket is a unique NFT stored on-chain. No duplicates, no fakes, no manipulation — ownership is publicly verifiable at any time.',
                                        accent: '#00e5ff',
                                        icon: (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z" stroke="#00e5ff" strokeWidth="1.5" strokeLinejoin="round" />
                                                <path d="M9 12l2 2 4-4" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        ),
                                    },
                                    {
                                        tag: 'Ownership',
                                        title: 'Your Ticket, Your Asset',
                                        body: 'Tickets live in your wallet, not on a platform\'s server. No account, no app, no risk of a company revoking your access.',
                                        accent: '#00ff88',
                                        icon: (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                <path d="M19 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2z" stroke="#00ff88" strokeWidth="1.5" />
                                                <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" />
                                                <circle cx="12" cy="13" r="1.5" fill="#00ff88" />
                                            </svg>
                                        ),
                                    },
                                    {
                                        tag: 'Access',
                                        title: 'Wallet In, No Password',
                                        body: 'Connect your Cardano wallet and you\'re in. No email, no password, no OTP — the smoothest onboarding in events.',
                                        accent: '#00e5ff',
                                        icon: (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#00e5ff" strokeWidth="1.5" strokeLinejoin="round" />
                                            </svg>
                                        ),
                                    },
                                    {
                                        tag: 'Verification',
                                        title: 'Transparent Check-In',
                                        body: 'QR codes link to on-chain ownership records. Organizers can independently verify any ticket — no central system can go down.',
                                        accent: '#00ff88',
                                        icon: (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                <rect x="3" y="3" width="7" height="7" rx="1" stroke="#00ff88" strokeWidth="1.5" />
                                                <rect x="14" y="3" width="7" height="7" rx="1" stroke="#00ff88" strokeWidth="1.5" />
                                                <rect x="3" y="14" width="7" height="7" rx="1" stroke="#00ff88" strokeWidth="1.5" />
                                                <path d="M14 14h2v2h-2zM16 16h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="#00ff88" />
                                            </svg>
                                        ),
                                    },
                                ].map(({ tag, title, body, accent, icon }) => (
                                    <div
                                        key={title}
                                        className={`group relative flex flex-col gap-4 bg-[#070707] border border-white/5 rounded-2xl p-5 hover:border-white/15 transition-all ${whyTixanoVisible ? 'opacity-100' : 'opacity-0'}`}
                                        style={{
                                            transitionDuration: '1500ms',
                                            transitionDelay: whyTixanoVisible ? '200ms' : '0ms',
                                        }}
                                    >
                                        {/* Top row: icon + tag */}
                                        <div className="flex items-center justify-between">
                                            <div
                                                className="w-8 h-8 rounded-xl flex items-center justify-center border"
                                                style={{
                                                    background: `${accent}0d`,
                                                    borderColor: `${accent}25`,
                                                }}
                                            >
                                                {icon}
                                            </div>
                                            <span
                                                className="text-[9px] font-bold uppercase tracking-[0.2em]"
                                                style={{ color: `${accent}60` }}
                                            >
                                                {tag}
                                            </span>
                                        </div>

                                        {/* Title */}
                                        <p className="text-white/80 text-sm font-black uppercase tracking-tight leading-tight">
                                            {title}
                                        </p>

                                        {/* Body */}
                                        <p className="text-white/30 text-xs leading-relaxed flex-1">
                                            {body}
                                        </p>

                                        {/* Bottom accent line — appears on hover */}
                                        <div
                                            className="absolute bottom-0 left-5 right-5 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"
                                            style={{ background: `linear-gradient(90deg, transparent, ${accent}40, transparent)` }}
                                        />
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>
                </section>

                {/* ── FAQ ── */}
                <section className="relative px-6 py-24 border-t border-white/5 overflow-hidden">

                    <div className="relative max-w-3xl mx-auto" ref={faqRef}>

                        {/* Header */}
                        <div className={`flex flex-col items-center text-center mb-14 transition-all ${faqVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDuration: '1500ms' }}>
                            <div className="flex items-center justify-center gap-3 mb-6">
                                <div className="w-8 h-px bg-[#00e5ff]/50" />
                                <span className="text-[#00e5ff] text-[11px] font-bold uppercase tracking-[0.3em]">FAQ</span>
                                <div className="w-8 h-px bg-[#00e5ff]/50" />
                            </div>
                            <h2 className="font-black uppercase leading-[0.92] tracking-tight text-[clamp(2rem,4vw,3.2rem)]">
                                <span className="block text-white/90">Frequent</span>
                                <span className="block text-[#00e5ff]">Questions.</span>
                            </h2>
                        </div>

                        {/* Accordion */}
                        {(() => {
                            const faqs = [
                                {
                                    q: 'Do I need to create an account to use Tixano?',
                                    a: 'No. Tixano uses your Cardano wallet as your identity. There are no usernames, passwords, or email sign-ups. Simply connect a compatible wallet like Vespr, Eternl, or Lace and you\'re ready to go.',
                                },
                                {
                                    q: 'What wallets are supported?',
                                    a: 'Any CIP-30 compatible Cardano wallet works with Tixano. We recommend Vespr, Eternl, or Lace. If your wallet supports CIP-30, it will connect seamlessly.',
                                },
                                {
                                    q: 'How do I receive my ticket after registering?',
                                    a: 'Once you register for an event, an NFT ticket is minted directly to your connected wallet. You\'ll also receive a confirmation email. Your ticket appears in your wallet almost instantly after the blockchain transaction confirms.',
                                },
                                {
                                    q: 'Are there fees to register for events?',
                                    a: 'Tixano currently supports free events. You will pay a small Cardano network (ADA) transaction fee when your ticket is minted — typically a fraction of a ADA. Paid event support is planned for a future release.',
                                },
                                {
                                    q: 'How does check-in work at the event?',
                                    a: 'Your NFT ticket contains a unique QR code tied to your wallet address. At the venue, the organizer scans it using Tixano\'s check-in interface. The system verifies ownership on the Cardano blockchain in real time and grants access instantly.',
                                },
                                {
                                    q: 'Can someone else use my ticket if they screenshot the QR code?',
                                    a: 'Organizers should only verify tickets directly from a Cardano wallet and should not accept screenshots. TIXANO is designed for wallet-based ticket verification, helping ensure that event access is granted only to legitimate ticket holders.',
                                },
                                {
                                    q: 'Can I transfer or sell my ticket?',
                                    a: 'Not yet. Ticket transfers and resales via the Tixano platform are planned for a future release. In the meantime, manually sending your ticket NFT to another wallet address will invalidate it — the check-in system verifies that the ticket is held by the wallet it was originally minted to, so transferring it will cause verification to fail at the door.',
                                },
                                {
                                    q: 'Does Tixano support virtual events?',
                                    a: 'Currently, Tixano is built exclusively for in-person events. Virtual event support is something we are actively exploring for a future release. For now, all events on the platform require physical attendance and QR code check-in.',
                                },
                                {
                                    q: 'What happens to my ticket after the event?',
                                    a: 'Your NFT ticket stays in your wallet permanently. In a future release, checked-in attendees will also receive an Attendance Proof NFT — a verifiable on-chain record that you were there.',
                                },
                            ];

                            return <FAQAccordion faqs={faqs} />;
                        })()}

                    </div>
                </section>

                {/* ── CTA ── */}
                <section className="relative px-6 py-32 border-t border-white/5 overflow-hidden">

                    {/* Background: large cyan glow — top */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,229,255,0.07) 0%, transparent 50%)' }}
                    />

                    {/* Top edge fade
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00e5ff]/20 to-transparent" /> */}

                    {/* Floating grid squares — decorative, matching landing page */}
                    {([
                        { size: 48, top: '12%', left: '8%', opacity: 0.07 },
                        { size: 28, top: '20%', left: '18%', opacity: 0.05 },
                        { size: 64, top: '8%', right: '10%', opacity: 0.06 },
                        { size: 36, top: '35%', right: '6%', opacity: 0.05 },
                        { size: 20, bottom: '20%', left: '12%', opacity: 0.05 },
                        { size: 44, bottom: '15%', right: '15%', opacity: 0.06 },
                    ] as Array<Record<string, string | number>>).map((sq, i) => (
                        <div
                            key={i}
                            className="absolute border border-[#00e5ff] rounded-sm pointer-events-none"
                            style={{
                                width: sq.size,
                                height: sq.size,
                                top: sq.top,
                                left: sq.left,
                                right: sq.right,
                                bottom: sq.bottom,
                                opacity: sq.opacity,
                            }}
                        />
                    ))}

                    <div className="relative max-w-4xl mx-auto flex flex-col items-center text-center" ref={ctaRef}>

                        {/* Big headline */}
                        <h2 className={`font-black uppercase leading-[0.88] tracking-tight mb-6 text-[clamp(2.8rem,7vw,4.5rem)] transition-all ${ctaVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDuration: '1500ms' }}>
                            <span className="block text-white/90">The future of</span>
                            <span className="block text-white/90">events is</span>
                            <span
                                className="block"
                                style={{
                                    WebkitTextStroke: '2px #00e5ff',
                                    color: 'transparent',
                                }}
                            >
                                on-chain.
                            </span>
                        </h2>

                        <p className={`text-white/35 text-base leading-relaxed max-w-lg mb-12 font-light transition-all ${ctaVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDuration: '1500ms', transitionDelay: '100ms' }}>
                            For the organizers building real events and attendees who want full ownership, Tixano is where it all happens.
                        </p>

                        {/* CTA Buttons */}
                        <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 transition-all ${ctaVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDuration: '1500ms', transitionDelay: '150ms' }}>
                            <Link
                                href="/events/create"
                                className="group relative inline-flex items-center gap-2.5 bg-[#00e5ff] text-black text-xs font-black uppercase tracking-widest px-8 py-4 rounded-xl hover:bg-[#33ecff] transition-all duration-200 hover:-translate-y-0.5 shadow-[0_8px_40px_rgba(0,229,255,0.25)] hover:shadow-[0_12px_50px_rgba(0,229,255,0.35)]"
                            >
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                Create an Event
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="transition-transform duration-200 group-hover:translate-x-0.5">
                                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </Link>

                            <Link
                                href="/events"
                                className="group inline-flex items-center gap-2.5 border border-white/15 text-white/60 text-xs font-bold uppercase tracking-widest px-8 py-4 rounded-xl hover:border-[#00e5ff]/40 hover:text-[#00e5ff]/80 transition-all duration-200 hover:-translate-y-0.5"
                            >
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                    <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                                    <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                                </svg>
                                Explore Events
                            </Link>
                        </div>

                        {/* Bottom credibility strip */}
                        <div className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-3 transition-all ${ctaVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDuration: '1500ms', transitionDelay: '200ms' }}>
                            {[
                                'Built on Cardano',
                                'Wallet-Native Auth',
                                'NFT Tickets',
                                'Powered by Meshjs',
                            ].map((item, i) => (
                                <div key={item} className="flex items-center gap-2">
                                    {i !== 0 && <span className="w-1 h-1 rounded-full bg-white/15" />}
                                    <span className="text-white/20 text-[11px] uppercase tracking-widest">{item}</span>
                                </div>
                            ))}
                        </div>

                    </div>
                </section>

            </div>
        </>
    );
}

function FAQAccordion({ faqs }: { faqs: { q: string; a: string }[] }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="flex flex-col">
            {faqs.map(({ q, a }, i) => (
                <div key={i} className={`border-b border-white/8 transition-all duration-500 ${i <= 2 ? `delay-${i * 100}` : ''}`}>
                    <button
                        onClick={() => setOpenIndex(openIndex === i ? null : i)}
                        className="w-full flex items-center justify-between gap-6 py-5 text-left group"
                    >
                        <span className={`text-sm font-black uppercase tracking-tight transition-colors duration-200 ${openIndex === i ? 'text-[#00e5ff]' : 'text-white/70 group-hover:text-white/90'}`}>
                            {q}
                        </span>
                        <span className={`flex-shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-200 ${openIndex === i ? 'border-[#00e5ff]/40 bg-[#00e5ff]/10 text-[#00e5ff]' : 'border-white/10 text-white/30 group-hover:border-white/25'}`}>
                            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                                {openIndex === i
                                    ? <path d="M2 8h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    : <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                }
                            </svg>
                        </span>
                    </button>

                    {openIndex === i && (
                        <div className="pb-5">
                            <p className="text-white/40 text-sm leading-relaxed pr-10">{a}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}