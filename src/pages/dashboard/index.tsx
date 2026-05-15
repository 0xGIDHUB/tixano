import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@meshsdk/react';
import { supabase } from '@/lib/supabase/client';

type DashboardTab = 'events' | 'tickets';

interface Ticket {
  id: string;
  asset_name: string;
  event_id: string;
  status: string;
  created_at: string;
  nft_image_url: string | null;
}

interface TicketDetail extends Ticket {
  owner_name: string;
  tx_hash: string | null;
  policy_id: string | null;
}

const ITEMS_PER_PAGE = 20; // 5 columns × 4 rows

export default function Dashboard() {
  const { connected, wallet } = useWallet();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('events');

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [eventTitle, setEventTitle] = useState<string>('');

  const [statusFilter, setStatusFilter] = useState<'all' | 'unused' | 'used'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready && !connected) router.replace('/');
  }, [ready, connected]);

  // Fetch tickets when switching to tickets tab
  useEffect(() => {
    if (activeTab !== 'tickets' || !connected || !wallet) return;

    async function fetchTickets() {
      setTicketsLoading(true);
      try {
        const walletAddress = await wallet.getChangeAddressBech32();
        const { data, error } = await supabase
          .from('tickets')
          .select('id, asset_name, event_id, status, created_at, nft_image_url, owner_name, tx_hash, policy_id')
          .eq('owner_wallet', walletAddress)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setTickets(data);
          setCurrentPage(1); // reset to first page on fresh load
        }
        console.log('Fetched tickets:', data, 'Error:', error);
      } catch (err) {
        console.error('Failed to fetch tickets:', err);
      }
      setTicketsLoading(false);
    }

    fetchTickets();
  }, [activeTab, connected, wallet]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesSearch = searchQuery === '' ||
      ticket.asset_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-2xl bg-[#0a0a0a] border border-white/8 flex items-center justify-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="17" rx="2" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                    <path d="M8 2v3M16 2v3M3 9h18" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0a0a0a] border border-white/10 flex items-center justify-center">
                  <span className="text-white/20 text-[9px] font-black">0</span>
                </div>
              </div>
              <p className="text-white/50 text-base font-black uppercase tracking-tight mb-2">No Events Yet</p>
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
            <div className="flex-1 min-h-0 flex flex-col">

              {/* Loading — skeleton grid */}
              {ticketsLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="flex flex-col bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden animate-pulse">
                      <div className="px-3 py-4 flex flex-col gap-2 items-center">
                        <div className="h-6 bg-white/5 rounded w-4/5" />
                        <div className="h-2 bg-white/5 rounded w-2/5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!ticketsLoading && tickets.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 text-center">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-[#0a0a0a] border border-white/8 flex items-center justify-center">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                        <path d="M2 9a1 1 0 011-1h18a1 1 0 011 1v2a2 2 0 000 4v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2a2 2 0 000-4V9z" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinejoin="round" />
                        <path d="M9 8v8" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
                      </svg>
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0a0a0a] border border-white/10 flex items-center justify-center">
                      <span className="text-white/20 text-[9px] font-black">0</span>
                    </div>
                  </div>
                  <p className="text-white/50 text-base font-black uppercase tracking-tight mb-2">No Tickets Yet</p>
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

              {/* Tickets grid + pagination */}
              {!ticketsLoading && tickets.length > 0 && (
                <div className="flex flex-col justify-between flex-1">

                  {/* Empty filter result state */}
                  {filteredTickets.length === 0 && (
                    <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
                      <div className="w-12 h-12 rounded-xl bg-[#0a0a0a] border border-white/8 flex items-center justify-center mb-4">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <p className="text-white/30 text-sm font-black uppercase tracking-tight mb-1">No results</p>
                      <p className="text-white/15 text-xs">No tickets match your current filters</p>
                    </div>
                  )}

                  {/* Grid — 4 rows max (20 tickets) */}
                  {filteredTickets.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 content-start" style={{ minHeight: '272px' }}>
                      {paginatedTickets.map((ticket) => (
                        <button
                          key={ticket.id}
                          onClick={async () => {
                            setImageLoaded(false);
                            const { data: eventData } = await supabase
                              .from('events')
                              .select('title')
                              .eq('id', ticket.event_id)
                              .single();
                            setEventTitle(eventData?.title || 'Unknown Event');
                            setSelectedTicket(ticket as TicketDetail);
                          }}
                          className="group relative transition-all duration-200 hover:-translate-y-0.5"
                        >
                          {/* Base ticket shape */}
                          <svg
                            className="absolute inset-0 w-full h-full"
                            viewBox="0 0 200 72"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="
        M8,0
        H192 Q200,0 200,8
        V30 A8,8 0 0,1 200,42
        V64 Q200,72 192,72
        H8 Q0,72 0,64
        V42 A8,8 0 0,1 0,30
        V8 Q0,0 8,0
        Z
      "
                              fill="#0a0a0a"
                              stroke="rgba(255,255,255,0.08)"
                              strokeWidth="1"
                              vectorEffect="non-scaling-stroke"
                              className="transition-colors duration-300 group-hover:fill-[#0c1a1a]"
                            />
                          </svg>

                          {/* Cyan border — fades in on hover as a single clean overlay */}
                          <svg
                            className="absolute inset-0 w-full h-full transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                            viewBox="0 0 200 72"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="
        M8,0
        H192 Q200,0 200,8
        V30 A8,8 0 0,1 200,42
        V64 Q200,72 192,72
        H8 Q0,72 0,64
        V42 A8,8 0 0,1 0,30
        V8 Q0,0 8,0
        Z
      "
                              fill="none"
                              stroke="#00e5ff"
                              strokeWidth="5"
                              strokeOpacity="0.35"
                              vectorEffect="non-scaling-stroke"
                            />
                          </svg>

                          {/* Content — centered */}
                          <div
                            className="relative flex flex-col items-center justify-center text-center"
                            style={{ height: '72px' }}
                          >
                            <p className="text-white/60 text-[11px] font-mono w-full px-4 truncate group-hover:text-[#00e5ff] transition-colors duration-300">
                              {ticket.asset_name}
                            </p>
                            <div className="flex items-center justify-center gap-1.5 mt-1">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ticket.status === 'used' ? 'bg-red-400' : 'bg-[#00ff88]'
                                }`} />
                              <span className="text-white/25 text-[10px] uppercase tracking-widest">
                                {ticket.status}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Pagination + filters — always visible once tickets are loaded */}
                  {(
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5 flex-shrink-0 gap-4">

                      {/* Result count — fixed width so it never shifts the center */}
                      <span className="text-white/20 text-xs w-36 flex-shrink-0">
                        {filteredTickets.length === tickets.length
                          ? `${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, filteredTickets.length)} of ${tickets.length} tickets`
                          : `${filteredTickets.length} of ${tickets.length} tickets`
                        }
                      </span>

                      {/* ── CENTER: Filter controls — fixed width, never shifts ── */}
                      <div className="flex items-center gap-2 justify-center" style={{ width: '380px', flexShrink: 0 }}>

                        {/* Search */}
                        <div className="relative">
                          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20" width="11" height="11" viewBox="0 0 16 16" fill="none">
                            <path d="M7 13A6 6 0 107 1a6 6 0 000 12zM13 13l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          <input
                            type="text"
                            placeholder="Search tickets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-[#0a0a0a] border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-white text-[11px] placeholder-white/20 focus:outline-none focus:border-[#00e5ff]/40 w-36 transition-all duration-200"
                          />
                        </div>

                        {/* Status filter */}
                        <div className="flex items-center bg-[#0a0a0a] border border-white/10 rounded-lg p-0.5 gap-0.5">
                          {(['all', 'unused', 'used'] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => setStatusFilter(s)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all duration-150
              ${statusFilter === s
                                  ? s === 'used'
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : s === 'unused'
                                      ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/25'
                                      : 'bg-white/10 text-white/70 border border-white/15'
                                  : 'text-white/30 hover:text-white/50'
                                }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>

                        {/* Clear filters — always occupies space, invisible when inactive */}
                        <button
                          onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}
                          className={`text-[11px] flex items-center gap-1 transition-all duration-200 flex-shrink-0 ${statusFilter !== 'all' || searchQuery !== ''
                            ? 'text-white/20 hover:text-[#00e5ff] opacity-100 pointer-events-auto'
                            : 'opacity-0 pointer-events-none'
                            }`}
                        >
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                            <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          Clear
                        </button>
                      </div>

                      {/* Page buttons — placeholder keeps layout balanced when only 1 page */}
                      <div className="flex items-center gap-1 flex-shrink-0" style={{ minWidth: '130px' }}>
                        {totalPages > 1 && (
                          <>
                            <button
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:border-white/25 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200"
                            >
                              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                                <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-7 h-7 rounded-lg border text-[11px] font-bold transition-all duration-200 ${page === currentPage
                                  ? 'bg-[#00e5ff] border-[#00e5ff] text-black'
                                  : 'border-white/10 text-white/40 hover:border-white/25 hover:text-white/70'
                                  }`}
                              >
                                {page}
                              </button>
                            ))}
                            <button
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                              className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:border-white/25 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200"
                            >
                              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>

                    </div>
                  )}

                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* ── TICKET DETAIL MODAL ── */}
      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ticket image with skeleton loading */}
            {selectedTicket.nft_image_url && (
              <div className="relative w-full flex-shrink-0 overflow-hidden" style={{ height: '220px' }}>

                {/* Skeleton — shown while image loads */}
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-[#0d0d0d] animate-pulse flex flex-col gap-3 p-5 justify-end">
                    {/* Simulated image shimmer layers */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/3 to-transparent" />
                    <div className="absolute top-4 left-4 w-16 h-2 bg-white/5 rounded-full" />
                    <div className="absolute top-8 left-4 w-10 h-2 bg-white/5 rounded-full" />
                    <div className="absolute bottom-4 right-4 w-20 h-6 bg-white/5 rounded-lg" />
                  </div>
                )}

                {/* Actual image — rendered but invisible until loaded */}
                <img
                  src={selectedTicket.nft_image_url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')}
                  alt={selectedTicket.asset_name}
                  onLoad={() => setImageLoaded(true)}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                />

                {/* Status badge — only show once image is ready */}
                {imageLoaded && (
                  <div className="absolute top-2 right-2">
                    <span className={`flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border backdrop-blur-sm
          ${selectedTicket.status === 'used'
                        ? 'text-red-400 border-red-400/30 bg-black/60'
                        : 'text-[#00ff88] border-[#00ff88]/30 bg-black/60'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedTicket.status === 'used' ? 'bg-red-400' : 'bg-[#00ff88]'}`} />
                      {selectedTicket.status}
                    </span>
                  </div>
                )}

              </div>
            )}

            {/* Details */}
            <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1" style={{ scrollbarWidth: 'none' }}>

              {/* Event + ticket name */}
              <div>
                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-0.5">Event</p>
                <p className="text-white font-black uppercase tracking-tight text-sm leading-tight">{eventTitle}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/40 rounded-xl px-3 py-2">
                  <p className="text-white/25 text-[10px] uppercase tracking-widest mb-0.5">Ticket</p>
                  <p className="text-[#00e5ff] text-[11px] font-mono truncate">{selectedTicket.asset_name}</p>
                </div>
                <div className="bg-black/40 rounded-xl px-3 py-2">
                  <p className="text-white/25 text-[10px] uppercase tracking-widest mb-0.5">Registered</p>
                  <p className="text-white/60 text-[11px]">
                    {new Date(selectedTicket.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Policy ID */}
              {selectedTicket.policy_id && (
                <div className="bg-black/40 rounded-xl px-3 py-2">
                  <p className="text-white/25 text-[10px] uppercase tracking-widest mb-0.5">Policy ID</p>
                  <p className="text-white/30 text-[10px] font-mono break-all leading-relaxed">
                    {selectedTicket.policy_id}
                  </p>
                </div>
              )}

              {/* Wallet hint */}
              <div className="flex items-start gap-2 bg-[#00e5ff]/5 border border-[#00e5ff]/15 rounded-xl px-3 py-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.5" />
                  <path d="M12 8v4M12 16h.01" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
                </svg>
                <p className="text-white/35 text-[11px] leading-relaxed">
                  See full details of this ticket in your Cardano wallet.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-0.5">
                <button
                  disabled
                  title="Ticket transfers coming in a future version of Tixano"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/8 bg-white/3 text-white/20 text-xs font-bold uppercase tracking-widest cursor-not-allowed relative group"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M15 7l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Transfer Ticket
                  <span className="absolute -top-2 -right-2 bg-[#ffaa00] text-black text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full">
                    soon
                  </span>
                </button>

                {selectedTicket.tx_hash && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_CARDANOSCAN_URL}/transaction/${selectedTicket.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00e5ff] text-black text-xs font-black uppercase tracking-widest hover:bg-[#33ecff] transition-all duration-200"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    View Tx
                  </a>
                )}
              </div>

            </div>
          </div>
        </div >
      )
      }
    </>
  );
}