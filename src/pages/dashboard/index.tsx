import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@meshsdk/react';
import { supabase } from '@/lib/supabase/client';
import { ThreeDot } from "react-loading-indicators";


type DashboardTab = 'events' | 'tickets';

interface Ticket {
  id: string;
  asset_name: string;
  event_id: string;
  status: string;
  created_at: string;
  nft_image_url: string | null;
  owner_name: string;
  tx_hash: string | null;
  policy_id: string | null;
}

const ITEMS_PER_PAGE = 12; // 3 columns × 4 rows

function EventsCarousel({ wallet, connected }: { wallet: any; connected: boolean }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchDeltaX = useRef<number>(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const lastWheel = useRef<number>(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Fix: use ResizeObserver on the carouselRef so width is always current
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    
    // Measure initial width directly
    const measureWidth = () => {
      if (el.offsetWidth > 0) {
        setContainerWidth(el.offsetWidth);
      }
    };
    
    // Measure immediately
    measureWidth();
    
    // Also set up ResizeObserver for dynamic width changes
    const ro = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    
    // Fallback: measure again after a short delay to ensure layout is complete
    const timer = setTimeout(measureWidth, 50);
    
    return () => {
      ro.disconnect();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!connected || !wallet) return;
    async function fetchEvents() {
      setLoading(true);
      try {
        const addr = await wallet.getChangeAddressBech32();
        const { data } = await supabase
          .from('events')
          .select('id, title, event_alias, date, city, country, capacity, total_registrations, pricing, ticket_price, cover_image_url, policy_id')
          .eq('organizer_wallet', addr)
          .order('created_at', { ascending: false });
        if (data) setEvents(data);
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    fetchEvents();
  }, [connected, wallet]);

  function goTo(index: number) {
    if (isAnimating || index === activeIndex || index < 0 || index >= events.length) return;
    setIsAnimating(true);
    setActiveIndex(index);
    setTimeout(() => setIsAnimating(false), 450);
  }

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheel.current < 550) return;
      lastWheel.current = now;
      if (e.deltaX > 20 || e.deltaY > 20) goTo(activeIndex + 1);
      else if (e.deltaX < -20 || e.deltaY < -20) goTo(activeIndex - 1);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [activeIndex, isAnimating, events.length]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }
  function handleTouchMove(e: React.TouchEvent) {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }
  function handleTouchEnd() {
    if (touchDeltaX.current < -50) goTo(activeIndex + 1);
    else if (touchDeltaX.current > 50) goTo(activeIndex - 1);
  }

  function formatDate(d: string | null) {
    if (!d) return 'TBA';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <ThreeDot color="#00e5ff" size="small" text="" textColor="" />
          <p className="text-white/20 text-xs uppercase tracking-widest">Loading events</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
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
        <Link href="/events/create" className="inline-flex items-center gap-2 bg-[#00e5ff] text-black text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-[#33ecff] transition-all duration-200 hover:-translate-y-0.5">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          Create an Event
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">

      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <p className="text-white/20 text-xs font-mono">
          <span className="text-white/60">{String(activeIndex + 1).padStart(2, '0')}</span>
          <span> / {String(events.length).padStart(2, '0')}</span>
        </p>
      </div>

      {/* Carousel viewport */}
      <div
        ref={carouselRef}
        className="flex-1 min-h-[320px] flex items-center overflow-hidden relative select-none w-full px-10"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {containerWidth > 0 || events.length > 0 ? (() => {
          const measuredWidth = containerWidth || 800; // Fallback width
          // Active card takes ~55% of width, adjacent cards are smaller
          const CARD_W = Math.min(400, Math.floor(measuredWidth * 0.55));
          const ADJACENT_SCALE = 0.70;
          const GAP = 24;
          const centerX = measuredWidth / 2;
          // Calculate offset to center the active card - account for padding by adding it to the offset
          const PADDING_OFFSET = 177; // px-10 = 40px, ResizeObserver measures content box
          const trackOffset = centerX - CARD_W / 2 - activeIndex * (CARD_W + GAP) + PADDING_OFFSET;

          return (
            <div
              className="flex items-center absolute left-0"
              style={{
                gap: `${GAP}px`,
                transform: `translateX(${trackOffset}px) translateY(-50%)`,
                transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)',
                width: 'fit-content',
                top: '50%',
              }}
            >
              {events.map((event, i) => {
                const isActive = i === activeIndex;
                const isFar = Math.abs(i - activeIndex) > 1;
                const scaleFactor = isActive ? 1 : isFar ? 0 : ADJACENT_SCALE;

                return (
                  <div
                    key={event.id}
                    style={{
                      width: `${CARD_W}px`,
                      flexShrink: 0,
                      opacity: isActive ? 1 : isFar ? 0 : 0.5,
                      transform: `scale(${scaleFactor})`,
                      transformOrigin: 'center',
                      filter: isActive ? 'brightness(1)' : isFar ? 'brightness(0.5) blur(2px)' : 'brightness(0.8)',
                      transition: 'opacity 440ms ease, transform 440ms ease, filter 440ms ease',
                      pointerEvents: isFar ? 'none' : 'auto',
                      visibility: isFar ? 'hidden' : 'visible',
                    }}
                  >
                    {isActive ? (
                      <Link href={`/events/${event.id}`} className="block">
                        <EventCard event={event} active formatDate={formatDate} />
                      </Link>
                    ) : (
                      <button className="w-full text-left" onClick={() => goTo(i)}>
                        <EventCard event={event} formatDate={formatDate} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })() : null}

        {activeIndex > 0 && (
          <button
            onClick={() => goTo(activeIndex - 1)}
            className="absolute left-2 z-10 w-8 h-8 rounded-full bg-black/70 border border-white/10 flex items-center justify-center text-white/40 hover:border-[#00e5ff]/40 hover:text-[#00e5ff] transition-all duration-200 backdrop-blur-sm"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
        {activeIndex < events.length - 1 && (
          <button
            onClick={() => goTo(activeIndex + 1)}
            className="absolute right-2 z-10 w-8 h-8 rounded-full bg-black/70 border border-white/10 flex items-center justify-center text-white/40 hover:border-[#00e5ff]/40 hover:text-[#00e5ff] transition-all duration-200 backdrop-blur-sm"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
      </div>

      {events.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5 flex-shrink-0">
          {events.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${i === activeIndex ? 'w-5 h-1.5 bg-[#00e5ff]' : 'w-1.5 h-1.5 bg-white/15 hover:bg-white/30'}`}
            />
          ))}
        </div>
      )}

    </div>
  );
}

function EventCard({ event, active, formatDate }: {
  event: any;
  active?: boolean;
  formatDate: (d: string | null) => string;
}) {
  const isFull = event.capacity && event.total_registrations >= event.capacity;
  const isPast = event.date && new Date(event.date) < new Date(new Date().toDateString());

  return (
    <div className={`w-full rounded-2xl border bg-[#0a0a0a] transition-all duration-500 ${active
      ? 'border-[#00e5ff]/80 shadow-[0_0_40px_rgba(0,229,255,0.15),0_0_30px_rgba(0,229,255,0.08)]'
      : 'border-white/2'
      }`}>
      <div className="flex items-stretch gap-0">
        <div className="relative flex-shrink-0 m-3 rounded-xl overflow-hidden" style={{ width: '160px', height: '160px' }}>
          {event.cover_image_url ? (
            <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#111] flex items-center justify-center">
              <span className="text-white/10 text-[10px] uppercase tracking-widest">No Image</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between py-4 pr-4">
          <div>
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${event.pricing === 'free'
                ? 'text-[#00ff88] border-[#00ff88]/30 bg-[#00ff88]/10'
                : 'text-[#00e5ff] border-[#00e5ff]/30 bg-[#00e5ff]/10'
                }`}>
                {event.pricing === 'free' ? 'Free' : `₳ ${event.ticket_price}`}
              </span>
              {isPast && (
                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/10 text-white/30">
                  Past
                </span>
              )}
              {isFull && !isPast && (
                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-red-500/30 text-red-400">
                  Full
                </span>
              )}
            </div>

            <h3 className="text-white font-black uppercase tracking-tight text-sm leading-tight line-clamp-2 mb-3">
              {event.title}
            </h3>

            <div className="flex flex-col gap-1.5 text-[11px] text-white/35">
              <div className="flex items-center gap-1.5">
                <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span>{formatDate(event.date)}</span>
              </div>
              {event.city && (
                <div className="flex items-center gap-1.5">
                  <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1.5C5.51 1.5 3.5 3.51 3.5 6c0 3.75 4.5 8.5 4.5 8.5S12.5 9.75 12.5 6c0-2.49-2.01-4.5-4.5-4.5z" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  <span className="truncate">{event.city}{event.country ? `, ${event.country}` : ''}</span>
                </div>
              )}
            </div>
          </div>

          {event.capacity && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-white/20 mb-1">
                <span>{event.total_registrations} registered</span>
                <span>{event.capacity} cap</span>
              </div>
              <div className="h-0.5 bg-white/8 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-[#00e5ff]'}`}
                  style={{ width: `${Math.min((event.total_registrations / event.capacity) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { connected, wallet } = useWallet();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('events');

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
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
          setCurrentPage(1);
        }
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
    const matchesSearch = searchQuery === '' || ticket.asset_name.toLowerCase().includes(searchQuery.toLowerCase());
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

          <div className="flex items-start justify-between mb-10 flex-shrink-0">
            <h1 className="text-white/90 text-2xl font-black uppercase tracking-tight">
              {activeTab === 'events' ? 'My Events' : 'My Tickets'}
            </h1>

            <div className="flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl p-1 gap-1">
              {(['events', 'tickets'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-200
                    ${activeTab === tab ? 'bg-[#00e5ff] text-black' : 'text-white/40 hover:text-white/70'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'events' && (
            <EventsCarousel wallet={wallet} connected={connected} />
          )}

          {activeTab === 'tickets' && (
            <div className="flex-1 min-h-0 flex flex-col">

              {ticketsLoading && (
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="flex flex-col bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden animate-pulse">
                      <div className="px-2 py-4 flex flex-col gap-2 items-center">
                        <div className="h-6 bg-white/5 rounded w-4/5" />
                        <div className="h-2 bg-white/5 rounded w-2/5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

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

              {!ticketsLoading && tickets.length > 0 && (
                <div className="flex flex-col justify-between flex-1">

                  {filteredTickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
                      <div className="w-12 h-12 rounded-xl bg-[#0a0a0a] border border-white/8 flex items-center justify-center mb-4">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <p className="text-white/30 text-sm font-black uppercase tracking-tight mb-1">No results</p>
                      <p className="text-white/15 text-xs">No tickets match your current filters</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4 content-start" style={{ minHeight: '272px' }}>
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
                            setSelectedTicket(ticket);
                          }}
                          className="group relative transition-all duration-200 hover:-translate-y-1"
                        >
                          <svg
                            className="absolute inset-0 w-full h-full"
                            viewBox="0 0 200 72"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M8,0 H192 Q200,0 200,8 V30 A8,8 0 0,1 200,42 V64 Q200,72 192,72 H8 Q0,72 0,64 V42 A8,8 0 0,1 0,30 V8 Q0,0 8,0 Z"
                              fill="#0a0a0a"
                              stroke="rgba(255,255,255,0.08)"
                              strokeWidth="1"
                              vectorEffect="non-scaling-stroke"
                              className="transition-colors duration-300 group-hover:fill-[#0c1a1a]"
                            />
                          </svg>
                          <svg
                            className="absolute inset-0 w-full h-full transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                            viewBox="0 0 200 72"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M8,0 H192 Q200,0 200,8 V30 A8,8 0 0,1 200,42 V64 Q200,72 192,72 H8 Q0,72 0,64 V42 A8,8 0 0,1 0,30 V8 Q0,0 8,0 Z"
                              fill="none"
                              stroke="#00e5ff"
                              strokeWidth="5"
                              strokeOpacity="0.35"
                              vectorEffect="non-scaling-stroke"
                            />
                          </svg>
                          <div className="relative flex flex-col items-center justify-center text-center" style={{ height: '72px' }}>
                            <p className="text-white/60 text-[11px] font-mono w-full px-4 truncate group-hover:text-[#00e5ff] transition-colors duration-300">
                              {ticket.asset_name}
                            </p>
                            <div className="flex items-center justify-center gap-1.5 mt-1">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ticket.status === 'used' ? 'bg-red-400' : 'bg-[#00ff88]'}`} />
                              <span className="text-white/25 text-[10px] uppercase tracking-widest">{ticket.status}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5 flex-shrink-0 gap-4">

                    <span className="text-white/20 text-xs w-36 flex-shrink-0">
                      {filteredTickets.length === tickets.length
                        ? `${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, filteredTickets.length)} of ${tickets.length} tickets`
                        : `${filteredTickets.length} of ${tickets.length} tickets`
                      }
                    </span>

                    <div className="flex items-center gap-2 justify-center" style={{ width: '380px', flexShrink: 0 }}>
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
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedTicket.nft_image_url && (
              <div className="relative w-full flex-shrink-0 overflow-hidden" style={{ height: '220px' }}>
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-[#0d0d0d] animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/3 to-transparent" />
                    <div className="absolute top-2 right-2 w-16 h-5 bg-white/5 rounded-lg" />
                  </div>
                )}
                <img
                  src={selectedTicket.nft_image_url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')}
                  alt={selectedTicket.asset_name}
                  onLoad={() => setImageLoaded(true)}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                />
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

            <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1" style={{ scrollbarWidth: 'none' }}>
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

              {selectedTicket.policy_id && (
                <div className="bg-black/40 rounded-xl px-3 py-2">
                  <p className="text-white/25 text-[10px] uppercase tracking-widest mb-0.5">Policy ID</p>
                  <p className="text-white/30 text-[10px] font-mono break-all leading-relaxed">
                    {selectedTicket.policy_id}
                  </p>
                </div>
              )}

              <div className="flex items-start gap-2 bg-[#00e5ff]/5 border border-[#00e5ff]/15 rounded-xl px-3 py-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.5" />
                  <path d="M12 8v4M12 16h.01" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
                </svg>
                <p className="text-white/35 text-[11px] leading-relaxed">
                  See full details of this ticket in your Cardano wallet.
                </p>
              </div>

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
        </div>
      )}
    </>
  );
}