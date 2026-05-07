import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

interface SpotlightEvent {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  start_time: string | null;
  city: string | null;
  country: string | null;
  pricing: string;
  ticket_price: number | null;
  capacity: number | null;
  total_registrations: number;
  cover_image_url: string | null;
  banner_image_url: string | null;
}

interface EventCard {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  start_time: string | null;
  city: string | null;
  country: string | null;
  pricing: string;
  ticket_price: number | null;
  capacity: number | null;
  total_registrations: number;
  cover_image_url: string | null;
}

interface Filters {
  search: string;
  pricing: 'all' | 'free' | 'paid';
  country: string;
  dateFrom: string;
  dateTo: string;
  availability: 'all' | 'available' | 'full';
}

const PAGE_SIZE = 8;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBA';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
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

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// Skeleton card component
function SkeletonCard() {
  return (
    <div className="flex flex-col bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">
      <div className="w-full aspect-square bg-white/5 animate-pulse" />
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="h-3 bg-white/5 rounded animate-pulse w-3/4" />
        <div className="h-2 bg-white/5 rounded animate-pulse w-1/2" />
        <div className="h-2 bg-white/5 rounded animate-pulse w-2/3" />
        <div className="h-8 bg-white/5 rounded-lg animate-pulse mt-auto" />
      </div>
    </div>
  );
}

export default function ExploreEvents() {
  const [spotlight, setSpotlight] = useState<SpotlightEvent[]>([]);
  const [events, setEvents] = useState<EventCard[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [filters, setFilters] = useState<Filters>({
    search: '',
    pricing: 'all',
    country: '',
    dateFrom: '',
    dateTo: '',
    availability: 'all',
  });

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      const today = new Date().toISOString().split('T')[0];

      const [spotlightRes, eventsRes] = await Promise.all([
        supabase
          .from('events')
          .select('id, title, description, date, start_time, city, country, pricing, ticket_price, capacity, total_registrations, cover_image_url, banner_image_url')
          .not('date', 'is', null)
          .gte('date', today)
          .order('date', { ascending: true })
          .limit(8),
        supabase
          .from('events')
          .select('id, title, description, date, start_time, city, country, pricing, ticket_price, capacity, total_registrations, cover_image_url')
          .not('date', 'is', null)
          .gte('date', today)
          .order('date', { ascending: true })
          .range(0, PAGE_SIZE - 1),
      ]);

      if (spotlightRes.data) setSpotlight(shuffle(spotlightRes.data).slice(0, 3));
      if (eventsRes.data) {
        setEvents(eventsRes.data);
        setFilteredEvents(eventsRes.data);
        setHasMore(eventsRes.data.length === PAGE_SIZE);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  // Load more events
  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const today = new Date().toISOString().split('T')[0];
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data } = await supabase
      .from('events')
      .select('id, title, description, date, start_time, city, country, pricing, ticket_price, capacity, total_registrations, cover_image_url')
      .not('date', 'is', null)
      .gte('date', today)
      .order('date', { ascending: true })
      .range(from, to);

    if (data) {
      const newEvents = [...events, ...data];
      setEvents(newEvents);
      setPage(p => p + 1);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }

  // Apply filters — runs on events or filters change
  useEffect(() => {
    let result = [...events];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.city?.toLowerCase().includes(q) ||
        e.country?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
      );
    }
    if (filters.pricing !== 'all') result = result.filter(e => e.pricing === filters.pricing);
    if (filters.country) result = result.filter(e => e.country?.toLowerCase().includes(filters.country.toLowerCase()));
    if (filters.dateFrom) result = result.filter(e => e.date && e.date >= filters.dateFrom);
    if (filters.dateTo) result = result.filter(e => e.date && e.date <= filters.dateTo);
    if (filters.availability === 'available') result = result.filter(e => !e.capacity || e.total_registrations < e.capacity);
    if (filters.availability === 'full') result = result.filter(e => e.capacity && e.total_registrations >= e.capacity);
    setFilteredEvents(result);
  }, [filters, events]);

  const advance = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % spotlight.length);
      setIsTransitioning(false);
    }, 300);
  }, [spotlight.length]);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(advance, 5000);
  }, [advance]);

  useEffect(() => {
    if (spotlight.length < 2) return;
    startInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [spotlight.length, startInterval]);

  function goTo(index: number) {
    if (isTransitioning || index === activeIndex) return;
    setIsTransitioning(true);
    setTimeout(() => { setActiveIndex(index); setIsTransitioning(false); }, 300);
    startInterval();
  }

  function resetFilters() {
    setFilters({ search: '', pricing: 'all', country: '', dateFrom: '', dateTo: '', availability: 'all' });
  }

  const activeFilterCount = [
    filters.search,
    filters.pricing !== 'all' ? filters.pricing : '',
    filters.country,
    filters.dateFrom,
    filters.dateTo,
    filters.availability !== 'all' ? filters.availability : '',
  ].filter(Boolean).length;

  const active = spotlight[activeIndex];
  const inputClass = "w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-xs placeholder-white/20 focus:outline-none focus:border-[#00e5ff]/40 transition-all duration-200";
  const labelClass = "block text-white/30 text-[10px] uppercase tracking-[0.12em] font-semibold mb-1.5";

  return (
    <>
      <Head>
        <title>Explore Events — Tixano</title>
      </Head>

      <div className="min-h-screen bg-black px-6 py-12">
        <div className="max-w-6xl mx-auto">

          {/* Page Header */}
          <div className="mb-10">
            <h1 className="text-white/90 text-3xl font-black uppercase tracking-tight mb-3">
              Explore Events
            </h1>
            <p className="text-white/40 text-base font-light max-w-lg">
              Discover events on Tixano. Connect your wallet to register and receive your NFT ticket.
            </p>
          </div>

          {/* Spotlight Section — skeleton while loading */}
          {loading ? (
            <div className="mb-16">
              <div className="w-full rounded-2xl bg-white/5 animate-pulse" style={{ height: '310px' }} />
              <div className="flex items-center gap-3 mt-4">
                {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/10 animate-pulse" />)}
              </div>
            </div>
          ) : spotlight.length > 0 && active ? (
            <div className="mb-16">
              <Link href={`/events/${active.id}`}>
                <div
                  className={`relative w-full rounded-2xl overflow-hidden cursor-pointer group transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
                  style={{ height: '310px' }}
                >
                  {active.banner_image_url ? (
                    <img src={active.banner_image_url} alt={active.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 bg-[#0a0a0a]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="absolute inset-0 flex items-end p-8">
                    <div className="flex items-end gap-6 w-full">
                      {active.cover_image_url && (
                        <div className="flex-shrink-0 hidden sm:block">
                          <img src={active.cover_image_url} alt={active.title} className="w-24 h-24 rounded-xl object-cover border border-white/10 shadow-2xl" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${active.pricing === 'free' ? 'text-[#00ff88] border-[#00ff88]/30 bg-[#00ff88]/10' : 'text-[#00e5ff] border-[#00e5ff]/30 bg-[#00e5ff]/10'}`}>
                            {active.pricing === 'free' ? 'Free' : `₳ ${active.ticket_price}`}
                          </span>
                          {active.city && <span className="text-white/40 text-[11px]">{active.city}{active.country ? `, ${active.country}` : ''}</span>}
                        </div>
                        <h2 className="text-white font-black text-2xl sm:text-3xl uppercase tracking-tight leading-tight mb-2 truncate">{active.title}</h2>
                        {active.description && <p className="text-white/50 text-sm leading-relaxed line-clamp-2 max-w-lg mb-3">{active.description}</p>}
                        <div className="flex items-center gap-4 text-xs text-white/40">
                          <span>{formatDate(active.date)}</span>
                          {active.start_time && <><span className="w-1 h-1 rounded-full bg-white/20" /><span>{formatTime(active.start_time)}</span></>}
                          {active.capacity && <><span className="w-1 h-1 rounded-full bg-white/20" /><span>{active.total_registrations}/{active.capacity} registered</span></>}
                        </div>
                      </div>
                      <div className="flex-shrink-0 hidden md:flex w-10 h-10 rounded-full border border-white/20 items-center justify-center group-hover:border-[#00e5ff] group-hover:text-[#00e5ff] text-white/40 transition-all duration-200">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
              {spotlight.length > 1 && (
                <div className="flex items-center gap-3 mt-4">
                  {spotlight.map((_, i) => (
                    <button key={i} onClick={() => goTo(i)}
                      className={`transition-all duration-300 rounded-full ${i === activeIndex ? 'w-6 h-1.5 bg-[#00e5ff]' : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'}`}
                    />
                  ))}
                  <div className="flex-1 h-px bg-white/5 ml-2 overflow-hidden rounded-full">
                    <div key={activeIndex} className="h-full bg-[#00e5ff]/30 rounded-full" style={{ animation: 'drain 5s linear forwards' }} />
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Events Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-white/90 font-black uppercase tracking-tight text-xl">All Upcoming Events</h2>
              </div>
              <button
                onClick={() => setPanelOpen(!panelOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-all duration-200 ${panelOpen ? 'border-[#00e5ff] text-[#00e5ff] bg-[#00e5ff]/5' : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/70'}`}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#00e5ff] text-black text-[10px] font-black flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            <div className="flex gap-6 items-start">

              {/* Events Grid */}
              <div className="flex-1 min-w-0">
                {loading ? (
                  // Skeleton grid
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                ) : events.length === 0 ? (
                  // Global empty state — no upcoming events at all
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center mb-5">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="18" height="17" rx="2" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
                        <path d="M8 2v3M16 2v3M3 9h18" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <p className="text-white/50 text-base font-black uppercase tracking-tight mb-2">
                      No Upcoming Events
                    </p>
                    <p className="text-white/25 text-sm max-w-xs leading-relaxed mb-6">
                      There are no events scheduled yet. Be the first to create one on Tixano.
                    </p>
                    <Link
                      href="/events/create"
                      className="inline-flex items-center gap-2 bg-[#00e5ff] text-black text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-lg hover:bg-[#33ecff] transition-all duration-200"
                    >
                      Create an Event →
                    </Link>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  // Filtered empty state
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center mb-4">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <p className="text-white/40 text-sm font-medium">No events match your filters</p>
                    <p className="text-white/20 text-xs mt-1">Try adjusting or clearing your filters</p>
                    <button onClick={resetFilters} className="mt-4 text-[#00e5ff] text-xs hover:underline">
                      Clear all filters
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8">
                      {filteredEvents.map((event) => {
                        const isFull = event.capacity ? event.total_registrations >= event.capacity : false;
                        return (
                          <div key={event.id} className="flex flex-col bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden hover:border-white/15 transition-all duration-200 group">
                            <div className="relative w-full aspect-square overflow-hidden">
                              {event.cover_image_url ? (
                                <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-[#111] flex items-center justify-center">
                                  <span className="text-white/10 text-xs uppercase tracking-widest">No Image</span>
                                </div>
                              )}
                              <div className="absolute top-3 left-3">
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border backdrop-blur-sm ${event.pricing === 'free' ? 'text-[#00ff88] border-[#00ff88]/30 bg-black/60' : 'text-[#00e5ff] border-[#00e5ff]/30 bg-black/60'}`}>
                                  {event.pricing === 'free' ? 'Free' : `₳ ${event.ticket_price}`}
                                </span>
                              </div>
                              {isFull && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <span className="text-white/60 text-xs font-bold uppercase tracking-widest border border-white/20 px-3 py-1 rounded-full">Sold Out</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col flex-1 p-4 gap-3">
                              <h3 className="text-white/90 font-black uppercase text-sm tracking-tight leading-tight line-clamp-2">{event.title}</h3>
                              <div className="flex flex-col gap-1.5 text-xs text-white/35">
                                <div className="flex items-center gap-1.5">
                                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                                    <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                                    <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                  </svg>
                                  <span>{formatDate(event.date)}{event.start_time ? ` · ${formatTime(event.start_time)}` : ''}</span>
                                </div>
                                {event.city && (
                                  <div className="flex items-center gap-1.5">
                                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                                      <path d="M8 1.5C5.51 1.5 3.5 3.51 3.5 6c0 3.75 4.5 8.5 4.5 8.5S12.5 9.75 12.5 6c0-2.49-2.01-4.5-4.5-4.5z" stroke="currentColor" strokeWidth="1.2"/>
                                      <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                                    </svg>
                                    <span>{event.city}{event.country ? `, ${event.country}` : ''}</span>
                                  </div>
                                )}
                                {event.capacity && (
                                  <div className="flex items-center gap-1.5">
                                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                                      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
                                      <path d="M1.5 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                      <path d="M11 7.5c1.5 0 3 1 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                      <circle cx="11" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
                                    </svg>
                                    <span>{event.total_registrations}/{event.capacity} registered</span>
                                  </div>
                                )}
                              </div>
                              <Link
                                href={`/events/${event.id}`}
                                className={`mt-auto w-full text-center py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-200 ${isFull ? 'bg-white/5 text-white/20 cursor-not-allowed pointer-events-none border border-white/5' : 'bg-[#00e5ff] text-black hover:bg-[#33ecff]'}`}
                              >
                                {isFull ? 'Sold Out' : 'View Event →'}
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Load More */}
                    {hasMore && !filters.search && filters.pricing === 'all' && !filters.country && !filters.dateFrom && !filters.dateTo && filters.availability === 'all' && (
                      <div className="flex justify-center mt-10">
                        <button
                          onClick={loadMore}
                          disabled={loadingMore}
                          className="flex items-center gap-2 px-6 py-3 border border-white/10 rounded-lg text-white/50 text-sm font-semibold hover:border-white/30 hover:text-white/70 transition-all duration-200 disabled:opacity-40"
                        >
                          {loadingMore ? (
                            <>
                              <div className="w-4 h-4 rounded-full border border-white/20 border-t-[#00e5ff] animate-spin" />
                              Loading...
                            </>
                          ) : (
                            'Load More Events'
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Filter Side Panel */}
              <div className={`flex-shrink-0 transition-all duration-300 overflow-hidden ${panelOpen ? 'w-72 opacity-100' : 'w-0 opacity-0'}`}>
                <div className="w-72 bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-bold uppercase tracking-widest">Filters</span>
                    {activeFilterCount > 0 && (
                      <button onClick={resetFilters} className="text-[#00e5ff] text-[11px] hover:underline">Clear all</button>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Search</label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <path d="M7 13A6 6 0 107 1a6 6 0 000 12zM13 13l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <input type="text" placeholder="Search events..." value={filters.search} onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))} className={`${inputClass} pl-8`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Ticket Pricing</label>
                    <div className="flex gap-2">
                      {(['all', 'free', 'paid'] as const).map((p) => (
                        <button key={p} onClick={() => setFilters(f => ({ ...f, pricing: p }))}
                          className={`flex-1 py-2 rounded-lg border text-[11px] font-bold uppercase tracking-widest transition-all duration-150 ${filters.pricing === p ? 'bg-[#00e5ff] border-[#00e5ff] text-black' : 'bg-transparent border-white/10 text-white/40 hover:border-white/25'}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Availability</label>
                    <div className="flex flex-col gap-1.5">
                      {([
                        { value: 'all', label: 'All Events' },
                        { value: 'available', label: 'Spots Available' },
                        { value: 'full', label: 'Sold Out' },
                      ] as const).map((opt) => (
                        <button key={opt.value} onClick={() => setFilters(f => ({ ...f, availability: opt.value }))}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition-all duration-150 text-left ${filters.availability === opt.value ? 'border-[#00e5ff]/40 bg-[#00e5ff]/5 text-[#00e5ff]' : 'border-white/5 text-white/40 hover:border-white/15'}`}>
                          <span className={`w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center ${filters.availability === opt.value ? 'border-[#00e5ff] bg-[#00e5ff]' : 'border-white/20'}`}>
                            {filters.availability === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                          </span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Country</label>
                    <input type="text" placeholder="e.g. Nigeria" value={filters.country} onChange={(e) => setFilters(f => ({ ...f, country: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Date Range</label>
                    <div className="flex flex-col gap-2">
                      <div>
                        <span className="text-white/20 text-[10px] mb-1 block">From</span>
                        <input type="date" value={filters.dateFrom} onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className={`${inputClass} [color-scheme:dark]`} />
                      </div>
                      <div>
                        <span className="text-white/20 text-[10px] mb-1 block">To</span>
                        <input type="date" value={filters.dateTo} onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))} className={`${inputClass} [color-scheme:dark]`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  );
}