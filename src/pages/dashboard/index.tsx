import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@meshsdk/react';
import { supabase } from '@/lib/supabase/client';
import { FourSquare } from "react-loading-indicators";

// Type definitions for dashboard navigation and ticket display
type DashboardTab = 'events' | 'tickets';

// Represents a ticket object fetched from the database
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

// Pagination constant: 12 items per page displayed in a 3×4 grid
const ITEMS_PER_PAGE = 12; // 3 columns × 4 rows

// EventsCarousel: Displays a scrollable carousel of events for the organizer
function EventsCarousel({ wallet, connected, onEventSelect, activeIndex, setActiveIndex }: { wallet: any; connected: boolean; onEventSelect?: (event: any) => void; activeIndex: number; setActiveIndex: (index: number) => void }) {
  // State management for carousel
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Refs for touch interaction and carousel dimensions
  const touchStartX = useRef<number>(0);
  const touchDeltaX = useRef<number>(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const lastWheel = useRef<number>(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Monitor carousel container width changes to ensure proper card sizing and centering
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
          .select('id, title, event_alias, date, city, country, capacity, total_registrations, pricing, ticket_price, cover_image_url, policy_id, description, start_time, end_time, registration_deadline, address, organizer_name, organizer_link')
          .eq('organizer_wallet', addr)
          .order('created_at', { ascending: false });
        if (data) {
          // Sort events so past events appear at the end
          const now = new Date();
          const sortedEvents = [...data].sort((a, b) => {
            const isAPast = a.date && new Date(a.date) < new Date(now.toDateString());
            const isBPast = b.date && new Date(b.date) < new Date(now.toDateString());
            
            // If both are past or both are upcoming, maintain original order
            if (isAPast === isBPast) return 0;
            // Past events go to the end (return 1)
            return isAPast ? 1 : -1;
          });
          setEvents(sortedEvents);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    fetchEvents();
  }, [connected, wallet]);

  // Navigate to a specific carousel index with animation guards
  function goTo(index: number) {
    if (isAnimating || index === activeIndex || index < 0 || index >= events.length) return;
    setIsAnimating(true);
    setActiveIndex(index);
    setTimeout(() => setIsAnimating(false), 450);
  }

  // Handle mouse wheel scrolling for carousel navigation
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheel.current < 200) return;
      lastWheel.current = now;
      if (e.deltaX > 10 || e.deltaY > 10) goTo(activeIndex + 1);
      else if (e.deltaX < -10 || e.deltaY < -10) goTo(activeIndex - 1);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [activeIndex, isAnimating, events.length]);

  // Touch handlers for swipe navigation on mobile/tablet devices
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

  // Format date string to readable format
  function formatDate(d: string | null) {
    if (!d) return 'TBA';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Show loading indicator while fetching events
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <FourSquare color="#00e5ff" size="medium" speedPlus={1} />
      </div>
    );
  }

  // Show empty state when organizer has no events
  if (events.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="17" rx="2" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
              <path d="M8 2v3M16 2v3M3 9h18" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" />
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

  // Render the carousel with navigation controls
  return (
    <div className="flex-1 flex flex-col">
      {/* Carousel counter - shows current position */}
      <div className="flex items-center justify-center mb-2 flex-shrink-0">
        <p className="text-white/20 text-sm font-mono">
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
          const GAP = 24; // space between cards
          const centerX = measuredWidth / 2;
          // Calculate offset to center the active card - account for padding by adding it to the offset
          const PADDING_OFFSET = 215; // px-10 = 40px, ResizeObserver measures content box
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
                      <button className="block w-full text-left" onClick={() => onEventSelect?.(event)}>
                        <EventCard event={event} active formatDate={formatDate} />
                      </button>
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

      </div>

      {/* Dot navigation indicators - shows active slide */}
      {events.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5 flex-shrink-0">
          {events.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${i === activeIndex ? 'w-5 h-2 bg-[#00e5ff]' : 'w-2 h-2 bg-white/15 hover:bg-white/30'}`}
            />
          ))}
        </div>
      )}

    </div>
  );
}

// EventCard: Displays individual event information in carousel card format
function EventCard({ event, active, formatDate }: {
  event: any;
  active?: boolean;
  formatDate: (d: string | null) => string;
}) {
  // Calculate event status flags
  const isFull = event.capacity && event.total_registrations >= event.capacity;
  const isPast = event.date && new Date(event.date) < new Date(new Date().toDateString());

  return (
    <div className={`w-full rounded-2xl border bg-[#0a0a0a] transition-all duration-500 ${active
      ? 'border-[#00e5ff]/80 shadow-[0_0_40px_rgba(0,229,255,0.15),0_0_30px_rgba(0,229,255,0.08)]'
      : 'border-white/2'
      }`}>
      <div className="flex items-stretch gap-0">
        {/* Event cover image */}
        <div className="relative flex-shrink-0 m-3 rounded-xl overflow-hidden" style={{ width: '160px', height: '160px' }}>
          {event.cover_image_url ? (
            <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#111] flex items-center justify-center">
              <span className="text-white/10 text-[10px] uppercase tracking-widest">No Image</span>
            </div>
          )}
        </div>

        {/* Event details section */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-4 pr-4">
          <div>
            {/* Status badges - pricing, past, full indicators */}
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

            {/* Event metadata - date and location */}
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

          {/* Capacity progress bar */}
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

function EditPaymentGate({ event, onPaid, onCancel }: {
  event: any;
  onPaid: () => void;
  onCancel: () => void;
}) {
  const { wallet } = useWallet();
  const [status, setStatus] = useState<'idle' | 'signing' | 'confirming' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const EDIT_FEE_LOVELACE = "5000000"; // 5 ADA
  const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS!;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  function handleCancel() {
    setVisible(false);
    setTimeout(onCancel, 300);
  }

  async function handlePay() {
    setStatus('signing');
    setErrorMsg(null);
    try {
      const { BlockfrostProvider, MeshTxBuilder, deserializeAddress } = await import('@meshsdk/core');
      const provider = new BlockfrostProvider(process.env.NEXT_PUBLIC_BLOCKFROST_KEY!);
      const walletAddress = await wallet.getChangeAddressBech32();
      const utxos = await wallet.getUtxosMesh();
      const { pubKeyHash } = deserializeAddress(walletAddress);

      const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider, verbose: false });

      const unsignedTx = await txBuilder
        .txOut(ADMIN_ADDRESS, [{ unit: 'lovelace', quantity: EDIT_FEE_LOVELACE }])
        .metadataValue(674, {
          msg: ['Tixano Event Edit Fee'],
          event_id: event.id,
          event_title: event.title.slice(0, 64),
        })
        .requiredSignerHash(pubKeyHash)
        .changeAddress(walletAddress)
        .selectUtxosFrom(utxos)
        .complete();

      const signedTx = await wallet.signTxReturnFullTx(unsignedTx, true);

      setStatus('confirming');
      const txHash = await wallet.submitTx(signedTx);

      // Call backend to confirm transaction and validate payment
      const confirmRes = await fetch('/api/transactions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash }),
      });

      if (!confirmRes.ok) {
        const data = await confirmRes.json();
        throw new Error(data.error || 'Transaction confirmation failed');
      }

      setStatus('done');
      setTimeout(() => {
        setVisible(false);
        setTimeout(onPaid, 300);
      }, 800);

    } catch (e: any) {
      setErrorMsg(e?.message?.includes('cancelled') || e?.message?.includes('user') ? 'Transaction cancelled.' : (e?.message || 'Transaction failed.'));
      setStatus('error');
    }
  }

  const isProcessing = status === 'signing' || status === 'confirming';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={!isProcessing ? handleCancel : undefined}>
      <div className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} />

      <div
        className={`relative w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-[#00e5ff]/10 border border-[#00e5ff]/20 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="#00e5ff" fillOpacity="0.7" />
              </svg>
            </div>
            <div>
              <p className="text-[#00e5ff]/60 text-[9px] uppercase tracking-widest">Edit Event</p>
              <h3 className="text-white font-black uppercase tracking-tight text-sm">Confirm Payment</h3>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">

          {/* Fee breakdown */}
          <div className="bg-black/40 border border-white/6 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-white/40 text-xs">Edit event fee</span>
              <span className="text-white font-black text-sm">₳ 5.00</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-white/25 text-[10px]">Event</span>
              <span className="text-white/50 text-[10px] font-mono truncate max-w-[180px]">{event.title}</span>
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2.5 bg-white/3 border border-white/8 rounded-xl px-3 py-2.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
              <path d="M12 8v4M12 16h.01" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-white/30 text-[10px] leading-relaxed">
              A small fee applies to edit event information. <br />This fee is non-refundable.
            </p>
          </div>

          {/* Error */}
          {status === 'error' && errorMsg && (
            <div className="flex items-start gap-2.5 bg-red-500/8 border border-red-500/20 rounded-xl px-3 py-2.5">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
                <circle cx="8" cy="8" r="6" stroke="rgb(248,113,113)" strokeWidth="1.2" />
                <path d="M8 5v3M8 10h.01" stroke="rgb(248,113,113)" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <p className="text-red-400 text-[10px] leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {/* Success */}
          {status === 'done' && (
            <div className="flex items-center gap-2.5 bg-[#00ff88]/8 border border-[#00ff88]/20 rounded-xl px-3 py-2.5">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M2 8l4 4 8-8" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-[#00ff88] text-[10px]">Payment confirmed — opening editor...</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-2">
          <button
            onClick={handleCancel}
            disabled={isProcessing || status === 'done'}
            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/8 border border-white/10 text-white/50 hover:text-white/80 text-xs font-bold uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handlePay}
            disabled={isProcessing || status === 'done'}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00e5ff] hover:bg-[#33ecff] text-black text-xs font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {status === 'idle' || status === 'error' ? (
              <>
                Pay ₳ 5
              </>
            ) : status === 'signing' ? (
              <>
                <div className="w-3 h-3 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                Sign in wallet...
              </>
            ) : status === 'confirming' ? (
              <>
                <div className="w-3 h-3 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Confirmed
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditEventModal({ event, onClose, onSaved, onEventUpdated }: {
  event: any;
  onClose: () => void;
  onSaved: (updated: any) => void;
  onEventUpdated?: (updated: any) => void;
}) {
  const [form, setForm] = useState({
    description: event.description || '',
    date: event.date || '',
    registration_deadline: event.registration_deadline || '',
    start_time: event.start_time ? event.start_time.slice(0, 5) : '',
    end_time: event.end_time ? event.end_time.slice(0, 5) : '',
    city: event.city || '',
    country: event.country || '',
    address: event.address || '',
    organizer_name: event.organizer_name || '',
    organizer_link: event.organizer_link || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Slide in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Sync form state with event prop changes
  useEffect(() => {
    setForm({
      description: event.description || '',
      date: event.date || '',
      registration_deadline: event.registration_deadline || '',
      start_time: event.start_time ? event.start_time.slice(0, 5) : '',
      end_time: event.end_time ? event.end_time.slice(0, 5) : '',
      city: event.city || '',
      country: event.country || '',
      address: event.address || '',
      organizer_name: event.organizer_name || '',
      organizer_link: event.organizer_link || '',
    });
  }, [event]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 350);
  }

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('events')
        .update({
          description: form.description || event.description || null,
          date: form.date || event.date || null,
          registration_deadline: form.registration_deadline || event.registration_deadline || null,
          start_time: form.start_time || event.start_time || null,
          end_time: form.end_time || event.end_time || null,
          city: form.city || event.city || null,
          country: form.country || event.country || null,
          address: form.address || event.address || null,
          organizer_name: form.organizer_name || event.organizer_name || null,
          organizer_link: form.organizer_link || event.organizer_link || null,
        })
        .eq('id', event.id)
        .select()
        .single();

      if (err) throw err;
      onSaved(data);
      onEventUpdated?.(data);
      handleClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save changes.');
    }
    setSaving(false);
  }

  const inputClass = "w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-white text-xs placeholder-white/25 focus:outline-none focus:border-[#00e5ff]/50 focus:ring-1 focus:ring-[#00e5ff]/20 transition-all duration-200";
  const labelClass = "text-white/40 text-[10px] uppercase tracking-widest font-semibold mb-2 block";

  return (
    <div className="fixed inset-0 z-50 flex" onClick={handleClose}>

      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-350 ${visible ? 'opacity-100' : 'opacity-0'}`} />

      {/* Floating Form - slides from left */}
      <div
        className={`fixed left-6 top-[100px] h-[calc(100vh-120px)] w-[520px] bg-[#0a0a0a] border border-white/20 rounded-2xl flex flex-col z-50 shadow-2xl transition-transform duration-350 ease-[cubic-bezier(0.4,0,0.2,1)] ${visible ? 'translate-x-0' : '-translate-x-full'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/20 flex-shrink-0 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[#00e5ff] text-[10px] uppercase tracking-widest font-bold mb-1">Edit Event</p>
            <h2 className="text-white font-black uppercase tracking-tight text-lg line-clamp-2">{event.title}</h2>
          </div>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: 'none' }}>
          <div className="space-y-6">
            {/* Description Section */}
            <div>
              <label className={labelClass}>Event Description</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={4}
                placeholder="Describe your event in detail..."
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Schedule Section */}
            <div>
              <h3 className="text-white/60 text-[11px] uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Schedule
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Event Date</label>
                    <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                      className={inputClass} style={{ colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className={labelClass}>Registration Deadline</label>
                    <input type="date" value={form.registration_deadline} onChange={e => set('registration_deadline', e.target.value)}
                      className={inputClass} style={{ colorScheme: 'dark' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Start Time</label>
                    <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)}
                      className={inputClass} style={{ colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className={labelClass}>End Time</label>
                    <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)}
                      className={inputClass} style={{ colorScheme: 'dark' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div>
              <h3 className="text-white/60 text-[11px] uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5C5.51 1.5 3.5 3.51 3.5 6c0 3.75 4.5 8.5 4.5 8.5S12.5 9.75 12.5 6c0-2.49-2.01-4.5-4.5-4.5z" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                Location
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>City</label>
                    <input type="text" value={form.city} onChange={e => set('city', e.target.value)}
                      placeholder="Amsterdam" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Country</label>
                    <input type="text" value={form.country} onChange={e => set('country', e.target.value)}
                      placeholder="Netherlands" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Address</label>
                  <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
                    placeholder="Street address or venue name" className={inputClass} />
                </div>
              </div>
            </div>

            {/* Organiser Section */}
            <div>
              <h3 className="text-white/60 text-[11px] uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M2 14c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Organiser
              </h3>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Organiser Name</label>
                  <input type="text" value={form.organizer_name} onChange={e => set('organizer_name', e.target.value)}
                    placeholder="Your name or organisation" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Organiser Link</label>
                  <input type="url" value={form.organizer_link} onChange={e => set('organizer_link', e.target.value)}
                    placeholder="https://example.com" className={inputClass} />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-3">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                  <circle cx="8" cy="8" r="6" stroke="rgb(248,113,113)" strokeWidth="1.2" />
                  <path d="M8 5v3M8 10h.01" stroke="rgb(248,113,113)" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <p className="text-red-400 text-[11px] leading-relaxed">{error}</p>
              </div>
            )}

            {/* Bottom padding */}
            <div className="h-2" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/20 flex-shrink-0 flex gap-2">
          <button
            onClick={handleClose}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white text-xs font-bold uppercase tracking-widest transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-[#00e5ff] text-black text-xs font-black uppercase tracking-widest hover:bg-[#33ecff] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                Saving
              </>
            ) : (
              <>
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function EventManagerDashboard({ event, onBack, onEventUpdated }: { event: any; onBack: () => void; onEventUpdated?: (updated: any) => void }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, status: 'upcoming' as 'upcoming' | 'ongoing' | 'ended' });
  const [editStage, setEditStage] = useState<'closed' | 'payment' | 'form'>('closed');
  const [eventData, setEventData] = useState(event);

  const formatDate = (d: string | null) => {
    if (!d) return 'TBA';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Live countdown timer
  useEffect(() => {
    function calculate() {
      if (!event.date) return;
      const eventStartTime = new Date(`${event.date}T${event.start_time || '00:00:00'}`).getTime();
      const eventEndTime = event.end_time
        ? new Date(`${event.date}T${event.end_time}`).getTime()
        : new Date(`${event.date}T23:59:59`).getTime(); // If no end_time, assume end of day
      const nextDayStart = new Date(event.date);
      nextDayStart.setDate(nextDayStart.getDate() + 1);
      nextDayStart.setHours(0, 0, 0, 0);
      const now = Date.now();

      // Determine event status
      let status: 'upcoming' | 'ongoing' | 'ended' = 'upcoming';
      let diff = eventStartTime - now;

      if (now >= eventStartTime && now <= eventEndTime) {
        // Event is currently ongoing
        status = 'ongoing';
        diff = 0; // Don't show countdown during ongoing
      } else if (now > nextDayStart.getTime()) {
        // Event date has passed (it's the next day or later)
        status = 'ended';
        diff = -1;
      } else if (diff <= 0) {
        // Event should have started but hasn't ended yet (shouldn't reach here with above logic, but safety check)
        status = 'ongoing';
        diff = 0;
      }

      setTimeLeft({
        days: Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24))),
        hours: Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))),
        minutes: Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))),
        seconds: Math.max(0, Math.floor((diff % (1000 * 60)) / 1000)),
        status,
      });
    }

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [event.date, event.start_time, event.end_time]);

  const isFull = event.capacity && event.total_registrations >= event.capacity;
  const isEnded = timeLeft.status === 'ended';
  const isOngoing = timeLeft.status === 'ongoing';

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">

      {/* Back button */}
      <div className="flex-shrink-0 mb-5">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors duration-200 text-xs font-mono uppercase tracking-widest"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M12 8H4M8 12l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          My Events
        </button>
      </div>

      {/* Top section */}
      <div className="flex-shrink-0 flex items-start gap-6 mb-6">

        {/* Cover image */}
        <div className="flex-shrink-0 rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0a]" style={{ width: '140px', height: '140px' }}>
          {event.cover_image_url ? (
            <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#111]">
              <span className="text-white/10 text-[9px] uppercase tracking-widest">No Image</span>
            </div>
          )}
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-[140px]">
          <div>
            <h2 className="text-white font-black uppercase tracking-tight text-2xl leading-tight mb-3 line-clamp-2">
              {event.title}
            </h2>
            <div className="flex items-center gap-4 text-xs text-white/40">
              <div className="flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span>{formatDate(event.date)}</span>
              </div>
              {event.city && (
                <div className="flex items-center gap-1.5">
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1.5C5.51 1.5 3.5 3.51 3.5 6c0 3.75 4.5 8.5 4.5 8.5S12.5 9.75 12.5 6c0-2.49-2.01-4.5-4.5-4.5z" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  <span>{event.city}{event.country ? `, ${event.country}` : ''}</span>
                </div>
              )}
              {event.capacity && (
                <div className="flex items-center gap-1.5">
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                    <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M1.5 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M11 7.5c1.5 0 3 1 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    <circle cx="11" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  <span>{event.total_registrations} / {event.capacity} registered</span>
                </div>
              )}
            </div>
          </div>

          {/* Capacity bar */}
          {event.capacity && (
            <div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-[#00e5ff]'}`}
                  style={{ width: `${Math.min((event.total_registrations / event.capacity) * 100, 100)}%` }}
                />
              </div>
              <p className="text-white/20 text-[10px] mt-1">
                {isFull ? 'Event is at full capacity' : `${event.capacity - event.total_registrations} spots remaining`}
              </p>
            </div>
          )}
        </div>

        {/* Countdown + Check-in CTA */}
        <div className="flex-shrink-0 flex flex-col gap-3" style={{ width: '260px' }}>

          {/* Countdown */}
          <div className={`w-full rounded-2xl border px-4 py-3 flex flex-col items-center justify-center ${isEnded ? 'border-white/8 bg-[#0a0a0a]' : isOngoing ? 'border-[#00ff88]/15 bg-[#00ff88]/5' : 'border-[#00e5ff]/15 bg-[#00e5ff]/5'
            }`} style={{ height: '88px' }}>
            {isEnded ? (
              <>
                <p className="text-white/30 text-[9px] uppercase tracking-widest mb-1">Event Status</p>
                <p className="text-white/60 text-xl font-black uppercase tracking-widest">Ended</p>
              </>
            ) : isOngoing ? (
              <>
                <p className="text-[#00ff88]/50 text-[9px] uppercase tracking-widest mb-1">Event Status</p>
                <p className="text-[#00ff88] text-xl font-black uppercase tracking-widest">Ongoing Now</p>
              </>
            ) : (
              <>
                <p className="text-[#00e5ff]/50 text-[9px] uppercase tracking-widest mb-2">Starts in</p>
                <div className="flex items-center justify-center gap-3">
                  {[
                    { value: timeLeft.days, label: 'Days' },
                    { value: timeLeft.hours, label: 'Hrs' },
                    { value: timeLeft.minutes, label: 'Min' },
                    { value: timeLeft.seconds, label: 'Sec' },
                  ].map(({ value, label }, i) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <span className="text-white font-black text-xl leading-none tabular-nums w-8 text-center">
                          {String(value).padStart(2, '0')}
                        </span>
                        <span className="text-white/25 text-[8px] uppercase tracking-widest mt-1">{label}</span>
                      </div>
                      {i < 3 && <span className="text-[#00e5ff]/30 font-black text-base -mt-2">:</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Check-in button */}
          <button
            onClick={() => window.open(`/dashboard/checkin/${eventData.id}`, '_blank')}
            disabled={isEnded || (!isOngoing && !isFull)}
            title={isEnded ? 'Event has ended' : !isOngoing && !isFull ? 'Check-in opens when the event starts' : 'Start scanning attendee tickets'}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all duration-200 ${isEnded || (!isOngoing && !isFull)
              ? 'bg-[#00e5ff]/10 border border-[#00e5ff]/20 text-[#00e5ff]/50 cursor-not-allowed'
              : 'bg-[#00e5ff] text-black hover:bg-[#33ecff] hover:-translate-y-0.5'
              }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 5.4A1.4 1.4 0 0 1 5.4 4H7a1 1 0 0 0 0-2H5.4A3.4 3.4 0 0 0 2 5.4V7a1 1 0 0 0 2 0V5.4ZM17 2a1 1 0 1 0 0 2h1.6A1.4 1.4 0 0 1 20 5.4V7a1 1 0 1 0 2 0V5.4A3.4 3.4 0 0 0 18.6 2H17ZM4 17a1 1 0 1 0-2 0v1.6A3.4 3.4 0 0 0 5.4 22H7a1 1 0 1 0 0-2H5.4A1.4 1.4 0 0 1 4 18.6V17ZM22 17a1 1 0 1 0-2 0v1.6a1.4 1.4 0 0 1-1.4 1.4H17a1 1 0 1 0 0 2h1.6a3.4 3.4 0 0 0 3.4-3.4V17ZM1 11a1 1 0 1 0 0 2h22a1 1 0 1 0 0-2H1Z"
                fill={isEnded || (!isOngoing && !isFull) ? 'rgba(0,229,255,0.5)' : 'black'} />
            </svg>
            {isEnded ? 'Check-in' : 'Check-in'}
          </button>

        </div>

      </div>

      {/* Bottom panels */}
      <div className="flex-1 min-h-0 grid grid-cols-3 gap-4">

        {/* About */}
        <div className="bg-[#0a0a0a] border border-white/8 rounded-2xl p-4 flex flex-col min-h-0">
          <h3 className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-3 flex-shrink-0">About</h3>
          {event.description ? (
            <p className="text-white/50 text-xs flex-1 leading-relaxed">
              {event.description.length > 400 ? event.description.substring(0, 400) + '...' : event.description}
            </p>
          ) : (
            <p className="text-white/15 text-xs italic">No description provided.</p>
          )}
          <Link
            href={`/events/${event.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 w-full bg-[#00e5ff]/10 hover:bg-[#00e5ff]/20 border border-[#00e5ff]/30 hover:border-[#00e5ff]/60 text-[#00e5ff] text-[10px] uppercase tracking-widest font-bold px-3 py-2.5 rounded-lg transition-all duration-200"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path d="M3 13L13 3M13 3H7M13 3v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            View Page
          </Link>
        </div>

        {/* Details */}
        <div className="bg-[#0a0a0a] border border-white/8 rounded-2xl p-4 flex flex-col min-h-0">
          <h3 className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-3 flex-shrink-0">Details</h3>
          <div className="flex flex-col gap-3 flex-1">
            {[
              { label: 'Pricing', value: event.pricing === 'free' ? 'Free Entry' : `₳ ${event.ticket_price}` },
              {
                label: 'Start Time', value: event.start_time ? (() => {
                  const [h, m] = event.start_time.split(':');
                  const hour = parseInt(h);
                  return `${hour % 12 === 0 ? 12 : hour % 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
                })() : 'TBA'
              },
              {
                label: 'End Time', value: event.end_time ? (() => {
                  const [h, m] = event.end_time.split(':');
                  const hour = parseInt(h);
                  return `${hour % 12 === 0 ? 12 : hour % 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
                })() : 'TBA'
              },
              { label: 'Policy ID', value: event.policy_id ? `${event.policy_id.slice(0, 14)}...` : 'N/A', mono: true },
            ].map(({ label, value, mono }) => (
              <div key={label}>
                <p className="text-white/25 text-[9px] uppercase tracking-widest mb-0.5">{label}</p>
                <p className={`text-white/70 text-xs ${mono ? 'font-mono' : 'font-medium'}`}>{value}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setEditStage('payment')}
            disabled={isEnded}
            title={isEnded ? 'Cannot edit event after it has ended' : 'Edit event details'}
            className={`mt-4 flex items-center justify-center gap-2 w-full text-[10px] uppercase tracking-widest font-bold px-3 py-2.5 rounded-lg transition-all duration-200 ${isEnded
              ? 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
              : 'bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 text-white/70 hover:text-white'
              }`}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path d="M11.5 2.5a1.414 1.414 0 012 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Edit
          </button>
        </div>

        {/* Registrations */}
        <div className="bg-[#0a0a0a] border border-white/8 rounded-2xl p-4 flex flex-col min-h-0">
          <h3 className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-3 flex-shrink-0">Registrations</h3>
          <div className="grid grid-cols-2 gap-3 flex-1 content-start">
            {[
              { label: 'Total', value: event.total_registrations, color: 'text-white' },
              { label: 'Capacity', value: event.capacity || '∞', color: 'text-white' },
              { label: 'Remaining', value: event.capacity ? event.capacity - event.total_registrations : '∞', color: isFull ? 'text-red-400' : 'text-[#00ff88]' },
              { label: 'Fill Rate', value: event.capacity ? `${Math.round((event.total_registrations / event.capacity) * 100)}%` : 'N/A', color: 'text-[#00e5ff]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-black/30 rounded-xl px-3 py-2.5">
                <p className="text-white/25 text-[9px] uppercase tracking-widest mb-1">{label}</p>
                <p className={`${color} text-lg font-black tabular-nums`}>{value}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => window.open(`/dashboard/guests/${eventData.id}`, '_blank')}
            className="mt-4 flex items-center justify-center gap-2 w-full bg-[#00e5ff]/10 hover:bg-[#00e5ff]/20 border border-[#00e5ff]/30 hover:border-[#00e5ff]/60 text-[#00e5ff] text-[10px] uppercase tracking-widest font-bold px-3 py-2.5 rounded-lg transition-all duration-200"
          >
            View Guests
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

      </div>

      {editStage === 'payment' && (
        <EditPaymentGate
          event={eventData}
          onPaid={() => setEditStage('form')}
          onCancel={() => setEditStage('closed')}
        />
      )}

      {editStage === 'form' && (
        <EditEventModal
          event={eventData}
          onClose={() => setEditStage('closed')}
          onSaved={(updated) => setEventData(updated)}
          onEventUpdated={(updated) => {
            setEventData(updated);
            onEventUpdated?.(updated);
          }}
        />
      )}
    </div>
  );
}

// Main Dashboard component - displays organizer events and user tickets
export default function Dashboard() {
  // Wallet and navigation
  const { connected, wallet } = useWallet();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // Tab navigation between events and tickets
  const [activeTab, setActiveTab] = useState<DashboardTab>('events');

  // Ticket list state and pagination
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Ticket modal state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [eventTitle, setEventTitle] = useState<string>('');

  // Ticket filtering state
  const [statusFilter, setStatusFilter] = useState<'all' | 'unused' | 'used'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Ticket image loading state for modal
  const [imageLoaded, setImageLoaded] = useState(false);

  // Event detail view state
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<any | null>(null);

  // Carousel state to persist position when navigating back
  const [carouselActiveIndex, setCarouselActiveIndex] = useState(0);

  // Initialize dashboard with a delay for smoother UX
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // Redirect to home if wallet disconnects
  useEffect(() => {
    if (ready && !connected) router.replace('/');
  }, [ready, connected]);

  // Fetch user's tickets when tab changes or wallet connects
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

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  // Apply status and search filters to tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesSearch = searchQuery === '' || ticket.asset_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate pagination for filtered tickets
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

      <div className="fixed inset-0 top-[80px] bg-black overflow-hidden">
        <div className="w-full h-full flex flex-col px-6 py-8">

          {selectedEventForDetail ? (
            <EventManagerDashboard event={selectedEventForDetail} onBack={() => setSelectedEventForDetail(null)} onEventUpdated={(updated) => setSelectedEventForDetail(updated)} />
          ) : (
            <>
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

              {/* Events Carousel Tab */}
              {activeTab === 'events' && (
                <EventsCarousel wallet={wallet} connected={connected} onEventSelect={setSelectedEventForDetail} activeIndex={carouselActiveIndex} setActiveIndex={setCarouselActiveIndex} />
              )}

              {/* Tickets Grid Tab */}
              {activeTab === 'tickets' && (
                <div className="flex-1 min-h-0 flex flex-col">

                  {/* Loading skeleton for tickets */}
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

                  {/* Empty state when no tickets exist */}
                  {!ticketsLoading && tickets.length === 0 && (
                    <div className="flex flex-col items-center justify-center flex-1 text-center">
                      <div className="relative mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
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

                  {/* Tickets grid with filters and pagination */}
                  {!ticketsLoading && tickets.length > 0 && (
                    <div className="flex flex-col justify-between flex-1">

                      {/* No results state for filtered tickets */}
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
                      ) : (                    /* Tickets grid display */                    <div className="grid grid-cols-3 gap-4 content-start" style={{ minHeight: '272px' }}>
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

                      {/* Pagination and filters footer */}
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5 flex-shrink-0 gap-4">

                        <span className="text-white/20 text-xs w-36 flex-shrink-0">
                          {filteredTickets.length === tickets.length
                            ? `${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, filteredTickets.length)} of ${tickets.length} tickets`
                            : `${filteredTickets.length} of ${tickets.length} tickets`
                          }
                        </span>

                        {/* Search and filter controls */}
                        <div className="flex items-center gap-2 justify-center" style={{ width: '380px', flexShrink: 0 }}>
                          {/* Search input */}
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

                          {/* Status filter buttons */}
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

                          {/* Clear filters button */}
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

                        {/* Pagination controls */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {totalPages > 1 && (
                            <>
                              {/* First button */}
                              <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                title="First page"
                                className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:border-white/25 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200"
                              >
                                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                                  <path d="M6 4l-4 4 4 4M12 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>

                              {/* Previous button */}
                              <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                title="Previous page"
                                className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:border-white/25 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200"
                              >
                                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                                  <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>

                              {/* Page indicator */}
                              <div className="px-3 py-1 rounded-lg border border-white/10 bg-white/5">
                                <p className="text-white/60 text-xs font-medium">
                                  Page <span className="text-[#00e5ff] font-bold">{currentPage}</span> of <span className="text-white/80 font-bold">{totalPages}</span>
                                </p>
                              </div>

                              {/* Next button */}
                              <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                title="Next page"
                                className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:border-white/25 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200"
                              >
                                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>

                              {/* Last button */}
                              <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                title="Last page"
                                className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:border-white/25 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200"
                              >
                                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                                  <path d="M10 4l4 4-4 4M4 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
            </>
          )}
        </div>
      </div>

      {/* Ticket detail modal */}
      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ticket NFT image display */}
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
                {/* Status badge overlay on image */}
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

            {/* Ticket details content */}
            <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1" style={{ scrollbarWidth: 'none' }}>
              {/* Event title */}
              <div>
                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-0.5">Event</p>
                <p className="text-white font-black uppercase tracking-tight text-sm leading-tight">{eventTitle}</p>
              </div>

              {/* Ticket metadata grid */}
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

              {/* Policy ID section */}
              {selectedTicket.policy_id && (
                <div className="bg-black/40 rounded-xl px-3 py-2">
                  <p className="text-white/25 text-[10px] uppercase tracking-widest mb-0.5">Policy ID</p>
                  <p className="text-white/30 text-[10px] font-mono break-all leading-relaxed">
                    {selectedTicket.policy_id}
                  </p>
                </div>
              )}

              {/* Info message about wallet details */}
              <div className="flex items-start gap-2 bg-[#00e5ff]/5 border border-[#00e5ff]/15 rounded-xl px-3 py-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" stroke="#00e5ff" strokeWidth="1.5" strokeOpacity="0.5" />
                  <path d="M12 8v4M12 16h.01" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
                </svg>
                <p className="text-white/35 text-[11px] leading-relaxed">
                  See full details of this ticket in your Cardano wallet.
                </p>
              </div>

              {/* Action buttons */}
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