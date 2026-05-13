import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@meshsdk/react';

type DashboardTab = 'events' | 'tickets';

export default function Dashboard() {
  const { connected } = useWallet();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('events');

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready && !connected) router.replace('/');
  }, [ready, connected]);

  return (
    <>
      <Head>
        <title>Dashboard — Tixano</title>
      </Head>

      <div className="h-[calc(100vh-80px)] bg-black px-6 py-8 overflow-hidden">
        <div className="max-w-6xl mx-auto h-full flex flex-col">

          {/* ── PAGE HEADER ── */}
          <div className="flex items-start justify-between mb-10 flex-shrink-0">
            <div>
              <h1 className="text-white/90 text-2xl font-black uppercase tracking-tight mb-2">
                {activeTab === 'events' ? 'My Events' : 'My Tickets'}
              </h1>
            </div>

            {/* Toggle */}
            <div className="flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl p-1 gap-1">
              {(['events', 'tickets'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-200
                    ${activeTab === tab
                      ? 'bg-[#00e5ff] text-black'
                      : 'text-white/40 hover:text-white/70'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* ── EVENTS TAB ── */}
          
          {activeTab === 'events' && (
            <div className="flex flex-col items-center justify-center py-26 text-center">

              {/* Icon */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-2xl bg-[#0a0a0a] border border-white/8 flex items-center justify-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="17" rx="2" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                    <path d="M8 2v3M16 2v3M3 9h18" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                {/* Decorative dot */}
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0a0a0a] border border-white/10 flex items-center justify-center">
                  <span className="text-white/20 text-[9px] font-black">0</span>
                </div>
              </div>

              <p className="text-white/50 text-base font-black uppercase tracking-tight mb-2">
                No Events Yet
              </p>
              <p className="text-white/20 text-sm max-w-xs leading-relaxed mb-8">
                You haven't created any events. Create your first on-chain event and start issuing NFT tickets.
              </p>

              <Link
                href="/events/create"
                className="inline-flex items-center gap-2 bg-[#00e5ff] text-black text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-[#33ecff] transition-all duration-200 hover:-translate-y-0.5"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Create an Event
              </Link>

            </div>
          )}

          {/* ── TICKETS TAB ── */}
          {activeTab === 'tickets' && (
            <div className="flex flex-col items-center justify-center py-25 text-center">

              {/* Icon */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-2xl bg-[#0a0a0a] border border-white/8 flex items-center justify-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <path d="M2 9a1 1 0 011-1h18a1 1 0 011 1v2a2 2 0 000 4v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2a2 2 0 000-4V9z" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M9 8v8M9 8v8" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0a0a0a] border border-white/10 flex items-center justify-center">
                  <span className="text-white/20 text-[9px] font-black">0</span>
                </div>
              </div>

              <p className="text-white/50 text-base font-black uppercase tracking-tight mb-2">
                No Tickets Yet
              </p>
              <p className="text-white/20 text-sm max-w-xs leading-relaxed mb-8">
                You haven't registered for any events. Explore upcoming events and mint your first NFT ticket.
              </p>

              <Link
                href="/events"
                className="inline-flex items-center gap-2 bg-[#00e5ff] text-black text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-[#33ecff] transition-all duration-200 hover:-translate-y-0.5"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Explore Events
              </Link>

            </div>
          )}

        </div>
      </div>
    </>
  );
}