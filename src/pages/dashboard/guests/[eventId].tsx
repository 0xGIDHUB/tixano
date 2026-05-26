import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@meshsdk/react';
import { supabase } from '@/lib/supabase/client';

interface Guest {
  id: string;
  asset_name: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string | null;
  owner_expectation: string | null;
  owner_wallet: string;
  status: string;
  created_at: string;
  used_at: string | null;
  tx_hash: string | null;
}

interface EventInfo {
  id: string;
  title: string;
  date: string | null;
  total_registrations: number;
  capacity: number | null;
}

export default function GuestsPage() {
  const router = useRouter();
  const { eventId } = router.query;
  const { connected, wallet } = useWallet();

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventLoading, setEventLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unused' | 'used'>('all');
  const [sortBy, setSortBy] = useState<'registered' | 'name' | 'status'>('registered');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 20;

  // Expanded row for expectation overflow
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || typeof eventId !== 'string') return;

    async function fetchEvent() {
      setEventLoading(true);
      const { data } = await supabase
        .from('events')
        .select('id, title, date, total_registrations, capacity')
        .eq('id', eventId)
        .single();
      if (data) setEvent(data);
      setEventLoading(false);
    }

    async function fetchGuests() {
      setLoading(true);
      const { data } = await supabase
        .from('tickets')
        .select('id, asset_name, owner_name, owner_email, owner_phone, owner_expectation, owner_wallet, status, created_at, used_at, tx_hash')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (data) setGuests(data);
      setLoading(false);
    }

    fetchEvent();
    fetchGuests();
  }, [eventId]);

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
    setCurrentPage(1);
  }

  // Filter + sort
  const filtered = guests
    .filter(g => {
      const matchStatus = statusFilter === 'all' || g.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        g.owner_name.toLowerCase().includes(q) ||
        g.owner_email.toLowerCase().includes(q) ||
        g.asset_name.toLowerCase().includes(q) ||
        (g.owner_phone || '').includes(q);
      return matchStatus && matchSearch;
    })
    .sort((a, b) => {
      let valA: string, valB: string;
      if (sortBy === 'name') { valA = a.owner_name; valB = b.owner_name; }
      else if (sortBy === 'status') { valA = a.status; valB = b.status; }
      else { valA = a.created_at; valB = b.created_at; }
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const usedCount = guests.filter(g => g.status === 'used').length;

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatTime(d: string) {
    return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function truncateWallet(w: string) {
    return `${w.slice(0, 8)}...${w.slice(-6)}`;
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) => (
    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" className={`transition-colors ${sortBy === col ? 'text-[#00e5ff]' : 'text-white/20'}`}>
      {sortDir === 'asc' && sortBy === col
        ? <path d="M5 2l4 6H1l4-6z" fill="currentColor"/>
        : <path d="M5 8L1 2h8L5 8z" fill="currentColor"/>
      }
    </svg>
  );

  return (
    <>
      <Head>
        <title>{event?.title ? `${event.title} — Guests` : 'Guests'} — Tixano</title>
      </Head>

      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto px-6 py-6">

          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-white font-black uppercase tracking-tight text-2xl mb-1">
              {eventLoading ? (
                <span className="inline-block w-64 h-7 bg-white/5 rounded animate-pulse" />
              ) : event?.title}
            </h1>
            <p className="text-white/25 text-xs uppercase tracking-widest">Guest List</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Guests', value: guests.length, color: 'text-white' },
              { label: 'Checked In', value: usedCount, color: 'text-[#00ff88]' },
              { label: 'Not Yet', value: guests.length - usedCount, color: 'text-white/60' },
              { label: 'Check-in Rate', value: guests.length > 0 ? `${Math.round((usedCount / guests.length) * 100)}%` : '0%', color: 'text-[#00e5ff]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#0a0a0a] border border-white/20 rounded-xl px-4 py-3">
                <p className="text-white/25 text-[9px] uppercase tracking-widest mb-1">{label}</p>
                <p className={`${color} text-2xl font-black tabular-nums`}>{loading ? '—' : value}</p>
              </div>
            ))}
          </div>

          {/* Controls bar */}
          <div className="flex items-center gap-3 mb-4">

            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M7 13A6 6 0 107 1a6 6 0 000 12zM13 13l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, ticket or phone..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-xs placeholder-white/20 focus:outline-none focus:border-[#00e5ff]/40 transition-all duration-200"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              )}
            </div>

            {/* Status filter */}
            <div className="flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl p-1 gap-1">
              {(['all', 'unused', 'used'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-150 ${
                    statusFilter === s
                      ? s === 'used'
                        ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/25'
                        : s === 'unused'
                        ? 'bg-white/10 text-white/70 border border-white/15'
                        : 'bg-white/10 text-white/70 border border-white/15'
                      : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  {s === 'all' ? `All (${guests.length})` : s === 'used' ? `Checked In (${usedCount})` : `Not Yet (${guests.length - usedCount})`}
                </button>
              ))}
            </div>

            {/* Result count */}
            <span className="text-white/20 text-xs ml-auto">
              {filtered.length !== guests.length ? `${filtered.length} of ${guests.length}` : `${guests.length}`} guests
            </span>
          </div>

          {/* Table */}
          <div className="bg-[#0a0a0a] border border-white/8 rounded-2xl overflow-hidden">

            {/* Table header */}
            <div className="grid border-b border-white/6" style={{ gridTemplateColumns: '2rem 1.5fr 1.8fr 1.2fr 1.1fr 1.4fr 6rem 5rem' }}>
              {[
                { label: '#', col: null },
                { label: 'Name', col: 'name' as const },
                { label: 'Email', col: null },
                { label: 'Phone', col: null },
                { label: 'Ticket', col: null },
                { label: 'Registered', col: 'registered' as const },
                { label: 'Status', col: 'status' as const },
                { label: 'Tx', col: null },
              ].map(({ label, col }) => (
                <div
                  key={label}
                  onClick={col ? () => toggleSort(col) : undefined}
                  className={`px-3 py-3 text-white/25 text-[9px] uppercase tracking-widest font-semibold flex items-center gap-1.5 ${col ? 'cursor-pointer hover:text-white/50 select-none' : ''}`}
                >
                  {label}
                  {col && <SortIcon col={col} />}
                </div>
              ))}
            </div>

            {/* Loading state */}
            {loading && (
              <div className="flex flex-col">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="grid border-b border-white/4 animate-pulse" style={{ gridTemplateColumns: '2rem 1.5fr 1.8fr 1.2fr 1.1fr 1.4fr 6rem 5rem' }}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <div key={j} className="px-3 py-3.5">
                        <div className="h-2.5 bg-white/5 rounded w-3/4" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && guests.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-black/30 border border-white/20 flex items-center justify-center mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="9" cy="7" r="4" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
                    <path d="M3 21c0-4 2.5-7 6-7h0" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M16 11l5 5m0-5l-5 5" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-white/30 text-sm font-black uppercase tracking-tight mb-1">No Guests Yet</p>
                <p className="text-white/15 text-xs">No one has registered for this event yet.</p>
              </div>
            )}

            {/* No results */}
            {!loading && guests.length > 0 && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-white/30 text-sm font-black uppercase tracking-tight mb-1">No results</p>
                <p className="text-white/15 text-xs">No guests match your current filters.</p>
              </div>
            )}

            {/* Rows */}
            {!loading && paginated.map((guest, idx) => (
              <div
                key={guest.id}
                className="grid border-b border-white/10 last:border-0 hover:bg-white/2 transition-colors duration-150 group"
                style={{ gridTemplateColumns: '2rem 1.5fr 1.8fr 1.2fr 1.1fr 1.4fr 6rem 5rem' }}
              >
                {/* Row number */}
                <div className="px-3 py-3.5 flex items-center">
                  <span className="text-white/20 text-[10px] font-mono tabular-nums">
                    {(currentPage - 1) * PER_PAGE + idx + 1}
                  </span>
                </div>

                {/* Name */}
                <div className="px-3 py-3.5 flex flex-col justify-center min-w-0">
                  <p className="text-white/80 text-xs font-semibold truncate">{guest.owner_name}</p>
                  {guest.owner_expectation && (
                    <button
                      onClick={() => setExpandedRow(expandedRow === guest.id ? null : guest.id)}
                      className="text-white/25 text-[10px] truncate text-left hover:text-white/50 transition-colors mt-0.5"
                    >
                      {expandedRow === guest.id ? guest.owner_expectation : `${guest.owner_expectation.slice(0, 30)}${guest.owner_expectation.length > 30 ? '…' : ''}`}
                    </button>
                  )}
                </div>

                {/* Email */}
                <div className="px-3 py-3.5 flex items-center min-w-0">
                  <button
                    onClick={() => copyToClipboard(guest.owner_email, `email-${guest.id}`)}
                    className="text-white/50 text-[11px] truncate hover:text-[#00e5ff] transition-colors flex items-center gap-1.5 group/copy"
                    title={guest.owner_email}
                  >
                    <span className="truncate">{guest.owner_email}</span>
                    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 opacity-0 group-hover/copy:opacity-100 transition-opacity">
                      {copiedId === `email-${guest.id}`
                        ? <path d="M2 8l4 4 8-8" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        : <path d="M4 4h8v8H4zM6 4V2h8v8h-2" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                      }
                    </svg>
                  </button>
                </div>

                {/* Phone */}
                <div className="px-3 py-3.5 flex items-center">
                  {guest.owner_phone ? (
                    <span className="text-white/50 text-[11px] font-mono">{guest.owner_phone}</span>
                  ) : (
                    <span className="text-white/15 text-[10px]">—</span>
                  )}
                </div>

                {/* Ticket name */}
                <div className="px-3 py-3.5 flex items-center min-w-0">
                  <span className="text-[#00e5ff]/70 text-[10px] font-mono truncate">{guest.asset_name}</span>
                </div>

                {/* Registered */}
                <div className="px-3 py-3.5 flex flex-col justify-center">
                  <span className="text-white/40 text-[11px]">{formatDate(guest.created_at)}</span>
                  <span className="text-white/20 text-[10px] mt-0.5">{formatTime(guest.created_at)}</span>
                </div>

                {/* Status */}
                <div className="px-3 py-3.5 flex items-center">
                  <span className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${
                    guest.status === 'used'
                      ? 'text-[#00ff88] border-[#00ff88]/25 bg-[#00ff88]/8'
                      : 'text-white/30 border-white/10 bg-white/3'
                  }`}>
                    <span className={`w-1 h-1 rounded-full ${guest.status === 'used' ? 'bg-[#00ff88]' : 'bg-white/25'}`} />
                    {guest.status === 'used' ? 'In' : 'Out'}
                  </span>
                </div>

                {/* Tx link */}
                <div className="px-3 py-3.5 flex items-center">
                  {guest.tx_hash ? (
                    <a
                      href={`${process.env.NEXT_PUBLIC_CARDANOSCAN_URL}/transaction/${guest.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-white/25 hover:text-[#00e5ff] transition-colors text-[10px] font-mono"
                    >
                      {guest.tx_hash.slice(0, 6)}…
                      <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
                        <path d="M3 13L13 3M13 3H7M13 3v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                  ) : (
                    <span className="text-white/15 text-[10px]">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-white/20 text-xs">
                {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:border-white/25 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const page = totalPages <= 7 ? i + 1 : currentPage <= 4 ? i + 1 : currentPage >= totalPages - 3 ? totalPages - 6 + i : currentPage - 3 + i;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-lg border text-[11px] font-bold transition-all ${
                        page === currentPage
                          ? 'bg-[#00e5ff] border-[#00e5ff] text-black'
                          : 'border-white/10 text-white/40 hover:border-white/25 hover:text-white/70'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:border-white/25 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}