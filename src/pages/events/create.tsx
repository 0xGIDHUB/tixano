import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useWallet } from '@meshsdk/react';
import { buildMintOwnerTicketTx } from '@/lib/cardano/mint';
import { waitForConfirmation } from '@/lib/cardano/verify';
import { uploadEventImage } from '@/lib/supabase/storage';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { getEventPrice } from '@/lib/cardano/mint';
import { generateNftImage } from '@/lib/ipfs/generateNftImage';

type PricingType = 'free' | 'paid';

const COUNTRIES = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina',
    'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain',
    'Bangladesh', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
    'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
    'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Chad', 'Chile',
    'China', 'Colombia', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus',
    'Czech Republic', 'Denmark', 'Djibouti', 'Dominican Republic', 'Ecuador',
    'Egypt', 'El Salvador', 'Estonia', 'Ethiopia', 'Finland', 'France', 'Gabon',
    'Georgia', 'Germany', 'Ghana', 'Greece', 'Guatemala', 'Guinea', 'Haiti',
    'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq',
    'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan',
    'Kenya', 'Kuwait', 'Kyrgyzstan', 'Latvia', 'Lebanon', 'Libya', 'Lithuania',
    'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
    'Mexico', 'Moldova', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique',
    'Myanmar', 'Namibia', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua',
    'Niger', 'Nigeria', 'North Korea', 'Norway', 'Oman', 'Pakistan', 'Panama',
    'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania',
    'Russia', 'Rwanda', 'Saudi Arabia', 'Senegal', 'Serbia', 'Singapore',
    'Slovakia', 'Slovenia', 'Somalia', 'South Africa', 'South Korea', 'Spain',
    'Sri Lanka', 'Sudan', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tanzania',
    'Thailand', 'Togo', 'Tunisia', 'Turkey', 'Uganda', 'Ukraine',
    'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
    'Uzbekistan', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
];

function to24Hour(hour: string, minute: string, period: 'AM' | 'PM'): string {
    let h = parseInt(hour);
    const m = minute.padStart(2, '0');
    if (isNaN(h)) return '';
    if (period === 'AM') {
        if (h === 12) h = 0;
    } else {
        if (h !== 12) h += 12;
    }
    return `${String(h).padStart(2, '0')}:${m}`;
}

interface FormData {
    title: string;
    eventAlias: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    city: string;
    country: string;
    address: string;
    capacity: string;
    pricing: PricingType;
    ticketPrice: string;
    registrationDeadline: string;
    image: File | null;
    bannerImage: File | null;
}

export default function CreateEvent() {
    const router = useRouter();

    const { connected, wallet } = useWallet();
    const [ready, setReady] = useState(false);
    const { toast, showToast, closeToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState('');
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [processingStep, setProcessingStep] = useState<'signing' | 'confirming' | 'uploading' | 'saving' | null>(null);

    const [startHour, setStartHour] = useState('');
    const [startMinute, setStartMinute] = useState('');
    const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>('AM');

    const [endHour, setEndHour] = useState('');
    const [endMinute, setEndMinute] = useState('');
    const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>('AM');

    const [countryQuery, setCountryQuery] = useState('');
    const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);

    const countrySuggestions = countryQuery.length > 0
        ? COUNTRIES.filter(c =>
            c.toLowerCase().startsWith(countryQuery.toLowerCase())
        ).slice(0, 6)
        : [];


    // Wait for MeshJS to rehydrate before checking wallet state
    useEffect(() => {
        const timer = setTimeout(() => setReady(true), 800);
        return () => clearTimeout(timer);
    }, []);

    // Only redirect after rehydration window has passed
    useEffect(() => {
        if (ready && !connected) {
            router.replace('/');
        }
    }, [ready, connected]);

    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [form, setForm] = useState<FormData>({
        title: '',
        eventAlias: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        city: '',
        country: '',
        address: '',
        capacity: '50',
        pricing: 'free',
        ticketPrice: '',
        registrationDeadline: '',
        image: null,
        bannerImage: null,
    });

    const handleImageChange = (file: File) => {
        if (!file.type.startsWith('image/')) return;

        if (file.size > 1 * 1024 * 1024) {
            showToast('Cover image must be under 1MB. Please compress your image and try again.', {
                title: 'File Too Large',
                type: 'error',
                duration: 5000,
            });
            return;
        }

        setForm(f => ({ ...f, image: file }));
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleBannerChange = (file: File) => {
        if (!file.type.startsWith('image/')) return;

        if (file.size > 1 * 1024 * 1024) {
            showToast('Banner image must be under 1MB. Please compress your image and try again.', {
                title: 'File Too Large',
                type: 'error',
                duration: 5000,
            });
            return;
        }

        setForm(f => ({ ...f, bannerImage: file }));
        const reader = new FileReader();
        reader.onload = (e) => setBannerPreview(e.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleImageChange(file);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
    };

    const handleConfirmedSubmit = async () => {
        setShowConfirmModal(false);
        setSubmitting(true);
        setSubmitError(null);
        setSubmitStatus('');

        try {
            const eventUuid = crypto.randomUUID();

            // Step 1 — Generate watermarked NFT image and upload to IPFS
            setProcessingStep('signing');
            const nftImageUri = await generateNftImage(form.image!, form.eventAlias);

            // Step 2 — Mint owner NFT on-chain with IPFS image in metadata
            const { txHash, policyId } = await buildMintOwnerTicketTx({
                wallet,
                eventUuid,
                eventName: form.eventAlias,
                eventTitle: form.title,
                eventCapacity: parseInt(form.capacity),
                nftImageUri,
            });

            setProcessingStep('confirming');
            await waitForConfirmation(txHash);

            setProcessingStep('uploading');
            let coverImageUrl = null;
            let bannerImageUrl = null;
            if (form.image) coverImageUrl = await uploadEventImage(form.image, 'covers');
            if (form.bannerImage) bannerImageUrl = await uploadEventImage(form.bannerImage, 'banners');

            setProcessingStep('saving');
            const ownerAddress = await wallet.getChangeAddress();

            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: eventUuid,
                    walletAddress: ownerAddress,
                    policyId,
                    txHash,
                    title: form.title,
                    eventAlias: form.eventAlias,
                    description: form.description,
                    date: form.date,
                    startTime: to24Hour(startHour, startMinute, startPeriod),
                    endTime: to24Hour(endHour, endMinute, endPeriod),
                    city: form.city,
                    country: form.country,
                    address: form.address,
                    capacity: form.capacity,
                    pricing: form.pricing,
                    ticketPrice: form.ticketPrice,
                    registrationDeadline: form.registrationDeadline,
                    coverImageUrl,
                    bannerImageUrl,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save event');

            setSubmitting(false);
            setProcessingStep(null);

            const redirectId = data.event.id;

            showToast('Transaction confirmed.', {
                title: 'Event Created Successfully',
                type: 'success',
                duration: 8000,
                txHash,
            });

            // Wait for toast duration before redirecting
            setTimeout(() => {
                router.push(`/events/${redirectId}`);
            }, 8000);

        } catch (err: any) {
            console.error(err);
            setSubmitting(false);
            setProcessingStep(null);
            setSubmitError(err.message || 'Something went wrong');
        }
    };

    const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00e5ff]/50 focus:ring-1 focus:ring-[#00e5ff]/20 transition-all duration-200";
    const labelClass = "block text-white/40 text-[11px] uppercase tracking-[0.12em] font-semibold mb-2";

    return (
        <>
            <Head>
                <title>Create Event — Tixano</title>
            </Head>

            <div className="min-h-screen bg-black px-6 py-12">
                <div className="max-w-6xl mx-auto">

                    {/* Page Header */}
                    <div className="mb-10">
                        <h1 className="text-white text-3xl font-black uppercase tracking-tight">
                            Create Your Event
                        </h1>
                    </div>

                    <form onSubmit={(e) => {
                        e.preventDefault();

                        if (!form.image) {
                            showToast('Please upload an event cover image before continuing.', {
                                title: 'Cover Image Required',
                                type: 'warning',
                                duration: 4000,
                            });
                            return;
                        }

                        if (!form.bannerImage) {
                            showToast('Please upload an NFT banner image before continuing.', {
                                title: 'Banner Image Required',
                                type: 'warning',
                                duration: 4000,
                            });
                            return;
                        }

                        if (!form.eventAlias || form.eventAlias.length < 2) {
                            showToast('Event alias must be at least 2 characters.', {
                                title: 'Alias Required',
                                type: 'warning',
                                duration: 4000,
                            });
                            return;
                        }

                        if (!startHour || !startMinute) {
                            showToast('Please enter a valid start time.', {
                                title: 'Start Time Required',
                                type: 'warning',
                                duration: 4000,
                            });
                            return;
                        }

                        if (!endHour || !endMinute) {
                            showToast('Please enter a valid end time.', {
                                title: 'End Time Required',
                                type: 'warning',
                                duration: 4000,
                            });
                            return;
                        }

                        setShowConfirmModal(true);
                    }}>
                        <div className="flex flex-col lg:flex-row gap-8 items-start">

                            {/* ── LEFT: Form Fields ── */}
                            <div className="flex-1 min-w-0 flex flex-col gap-6">

                                {/* Title */}
                                <div>
                                    <label className={labelClass}>Event Title</label>
                                    <input
                                        name="title"
                                        value={form.title}
                                        onChange={handleChange}
                                        placeholder="What's the name of your event?"
                                        className={inputClass}
                                        required
                                    />
                                </div>

                                {/* Event Alias */}
                                <div>
                                    <label className={labelClass}>
                                        Event Alias
                                        <span className="text-white/20 text-[10px] ml-2 normal-case tracking-normal">
                                            max 10 characters — used for on-chain token name
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            name="eventAlias"
                                            value={form.eventAlias}
                                            onChange={(e) => {
                                                // Strip spaces and limit to 10 chars
                                                const value = e.target.value.replace(/\s/g, '').slice(0, 10);
                                                setForm(f => ({ ...f, eventAlias: value }));
                                            }}
                                            placeholder="e.g. DEVCON25"
                                            className={inputClass}
                                            maxLength={10}
                                            required
                                        />
                                        <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono
      ${form.eventAlias.length === 10 ? 'text-[#ffaa00]' : 'text-white/20'}`}
                                        >
                                            {form.eventAlias.length}/10
                                        </span>
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className={labelClass}>Description</label>
                                    <textarea
                                        name="description"
                                        value={form.description}
                                        onChange={handleChange}
                                        placeholder="What's your event about? Share all the info attendees need to know."
                                        rows={4}
                                        className={`${inputClass} resize-none`}
                                    />
                                </div>

                                {/* Date + Registration Deadline */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Event Date</label>
                                        <input
                                            type="date"
                                            name="date"
                                            value={form.date}
                                            onChange={(e) => {
                                                const selectedDate = e.target.value;
                                                // Auto-fill deadline to one day before event date
                                                const eventDate = new Date(selectedDate);
                                                eventDate.setDate(eventDate.getDate() - 1);
                                                const deadlineValue = eventDate.toISOString().split('T')[0];
                                                setForm(f => ({
                                                    ...f,
                                                    date: selectedDate,
                                                    registrationDeadline: deadlineValue,
                                                }));
                                            }}
                                            className={`${inputClass} [color-scheme:dark]`}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Registration Deadline</label>
                                        <input
                                            type="date"
                                            name="registrationDeadline"
                                            value={form.registrationDeadline}
                                            max={form.date} // ← cannot be after event date
                                            onChange={(e) => {
                                                // Only allow dates up to and including the event date
                                                if (form.date && e.target.value > form.date) return;
                                                setForm(f => ({ ...f, registrationDeadline: e.target.value }));
                                            }}
                                            className={`${inputClass} [color-scheme:dark]`}
                                        />
                                    </div>
                                </div>

                                {/* Start + End Time */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[
                                        {
                                            label: 'Start Time',
                                            hour: startHour, setHour: setStartHour,
                                            minute: startMinute, setMinute: setStartMinute,
                                            period: startPeriod, setPeriod: setStartPeriod,
                                        },
                                        {
                                            label: 'End Time',
                                            hour: endHour, setHour: setEndHour,
                                            minute: endMinute, setMinute: setEndMinute,
                                            period: endPeriod, setPeriod: setEndPeriod,
                                        },
                                    ].map(({ label, hour, setHour, minute, setMinute, period, setPeriod }) => (
                                        <div key={label}>
                                            <label className={labelClass}>{label}</label>
                                            <div className="flex items-center bg-[#0a0a0a] border border-white/10 rounded-lg overflow-hidden focus-within:border-[#00e5ff]/50 focus-within:ring-1 focus-within:ring-[#00e5ff]/20 transition-all duration-200">

                                                {/* Hour */}
                                                <input
                                                    type="number"
                                                    placeholder="12"
                                                    min={1}
                                                    max={12}
                                                    value={hour}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 12)) {
                                                            setHour(val);
                                                        }
                                                    }}
                                                    className="w-full bg-transparent text-white text-sm text-center py-3 focus:outline-none placeholder-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />

                                                <span className="text-white/30 font-bold text-base select-none">:</span>

                                                {/* Minute */}
                                                <input
                                                    type="number"
                                                    placeholder="00"
                                                    min={0}
                                                    max={59}
                                                    value={minute}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                                                            setMinute(val.padStart(2, '0').slice(-2));
                                                        }
                                                    }}
                                                    className="w-full bg-transparent text-white text-sm text-center py-3 focus:outline-none placeholder-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />

                                                {/* AM/PM toggle */}
                                                <div className="flex border-l border-white/10 flex-shrink-0">
                                                    {(['AM', 'PM'] as const).map((p) => (
                                                        <button
                                                            key={p}
                                                            type="button"
                                                            onClick={() => setPeriod(p)}
                                                            className={`px-3 py-3 text-xs font-bold tracking-widest transition-all duration-150
                ${period === p
                                                                    ? 'bg-[#00e5ff] text-black'
                                                                    : 'text-white/30 hover:text-white/60'
                                                                }`}
                                                        >
                                                            {p}
                                                        </button>
                                                    ))}
                                                </div>

                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* City + Country */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>City</label>
                                        <input
                                            name="city"
                                            value={form.city}
                                            onChange={handleChange}
                                            placeholder="e.g. Lagos"
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Country</label>
                                        <div className="relative">
                                            <input
                                                value={countryQuery || form.country}
                                                onChange={(e) => {
                                                    setCountryQuery(e.target.value);
                                                    setForm(f => ({ ...f, country: e.target.value }));
                                                    setShowCountrySuggestions(true);
                                                }}
                                                onFocus={() => setShowCountrySuggestions(true)}
                                                onBlur={() => setTimeout(() => setShowCountrySuggestions(false), 150)}
                                                placeholder="e.g. Nigeria"
                                                className={inputClass}
                                                autoComplete="off"
                                            />

                                            {/* Suggestions dropdown */}
                                            {showCountrySuggestions && countrySuggestions.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-white/10 rounded-lg overflow-hidden z-20 shadow-xl">
                                                    {countrySuggestions.map((country) => (
                                                        <button
                                                            key={country}
                                                            type="button"
                                                            onMouseDown={() => {
                                                                setForm(f => ({ ...f, country }));
                                                                setCountryQuery('');
                                                                setShowCountrySuggestions(false);
                                                            }}
                                                            className="w-full text-left px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors duration-150"
                                                        >
                                                            {country}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Address */}
                                <div>
                                    <label className={labelClass}>Address</label>
                                    <input
                                        name="address"
                                        value={form.address}
                                        onChange={handleChange}
                                        placeholder="Full venue address"
                                        className={inputClass}
                                    />
                                </div>

                                {/* Capacity */}
                                <div>
                                    <label className={labelClass}>Capacity</label>
                                    <div className="flex w-full gap-3">
                                        {['50', '100', '200', '500', '1000'].map((cap) => (
                                            <button
                                                key={cap}
                                                type="button"
                                                onClick={() => setForm(f => ({ ...f, capacity: cap }))}
                                                className={`
          flex-1 py-3 rounded-lg border text-sm font-bold tracking-widest transition-all duration-200
          ${form.capacity === cap
                                                        ? 'bg-[#00e5ff] border-[#00b8cc] text-black'
                                                        : 'bg-transparent border-white/10 text-white/40 hover:border-white/30 hover:text-white/60'
                                                    }
        `}
                                            >
                                                {cap}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Free / Paid Toggle */}
                                <div>
                                    <label className={labelClass}>Ticket Pricing</label>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, pricing: 'free' }))}
                                            className="flex-1 py-3 rounded-lg border text-sm font-bold uppercase tracking-widest transition-all duration-200 bg-[#00e5ff] border-[#00b8cc] text-black"
                                        >
                                            Free
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => showToast('Paid tickets are coming soon.', {
                                                title: 'Not Yet Supported',
                                                type: 'warning',
                                                duration: 4000,
                                            })}
                                            className="flex-1 py-3 rounded-lg border text-sm font-bold uppercase tracking-widest transition-all duration-200 bg-transparent border-white/10 text-white/20 cursor-not-allowed relative group"
                                        >
                                            Paid
                                            <span className="absolute -top-2 -right-2 bg-[#ffaa00] text-black text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full">
                                                soon
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Ticket Price — only shown when paid */}
                                {form.pricing === 'paid' && (
                                    <div>
                                        <label className={labelClass}>Ticket Price (ADA)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00e5ff] text-sm font-bold">₳</span>
                                            <input
                                                type="number"
                                                name="ticketPrice"
                                                value={form.ticketPrice}
                                                onChange={handleChange}
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                                className={`${inputClass} pl-9`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Event Creation Fee Display */}
                                <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0a0a0a] border border-white/10">
                                    <div className="flex flex-col">
                                        <span className="text-white/60 text-[15px] uppercase tracking-widest font-semibold">
                                            Event Creation Fee
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-[#00e5ff] font-black text-xl">
                                            {getEventPrice(parseInt(form.capacity)) / 1_000_000}
                                        </span>
                                        <span className="text-[#00e5ff]/60 text-x1 font-bold">₳</span>
                                    </div>
                                </div>

                                {/* Submit */}
                                {submitError && (
                                    <p className="text-red-400 text-xs text-center">{submitError}</p>
                                )}

                                {submitStatus && !submitError && (
                                    <p className="text-[#00e5ff]/70 text-xs text-center animate-pulse">
                                        {submitStatus}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full mt-2 bg-[#00e5ff] text-black font-black uppercase tracking-[0.1em] py-4 rounded-lg text-sm hover:bg-[#33ecff] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                >
                                    {submitting ? submitStatus || 'Processing...' : 'Create Event'}
                                </button>

                                {toast && (
                                    <Toast
                                        key={toast.id}
                                        message={toast.message}
                                        title={toast.title}
                                        type={toast.type}
                                        duration={toast.duration}
                                        txHash={toast.txHash}
                                        onClose={closeToast}
                                    />
                                )}

                            </div>

                            {/* ── RIGHT: Image Upload ── */}
                            <div className="w-full lg:w-[340px] flex-shrink-0 flex flex-col gap-6">

                                {/* Square Cover Image */}
                                <div>
                                    <label className={labelClass}>
                                        Event Cover Image
                                        <span className="text-red-400 ml-1">*</span>
                                    </label>
                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={handleDrop}
                                        className={`
        relative w-full aspect-square rounded-2xl border-2 border-dashed overflow-hidden
        flex flex-col items-center justify-center cursor-pointer
        transition-all duration-300
        ${isDragging
                                                ? 'border-[#00e5ff] bg-[#00e5ff]/5'
                                                : 'border-white/10 bg-[#0a0a0a] hover:border-white/20'
                                            }
      `}
                                        onClick={() => document.getElementById('imageInput')?.click()}
                                    >
                                        {imagePreview ? (
                                            <>
                                                <img
                                                    src={imagePreview}
                                                    alt="Event cover"
                                                    className="absolute inset-0 w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2">
                                                    <span className="text-white text-sm font-semibold">Change Image</span>
                                                    <span className="text-white/50 text-xs">Click or drag to replace</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-4 px-6 text-center">
                                                <div className="w-14 h-14 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                        <path d="M12 16V8M12 8l-3 3M12 8l3 3" stroke="#00b8cc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M3 16v1a4 4 0 004 4h10a4 4 0 004-4v-1" stroke="#00b8cc" strokeWidth="1.5" strokeLinecap="round" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-white/20 text-xs mt-1">Click or drag to upload</p>
                                                </div>
                                                <p className="text-white/15 text-[10px] uppercase tracking-widest">PNG · JPG</p>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        id="imageInput"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleImageChange(file);
                                        }}
                                    />
                                    <p className="text-white/20 text-[11px] mt-2 leading-relaxed text-center">
                                        Recommended: 1:1 ratio, minimum 600×600px. Max 1MB.
                                    </p>
                                </div>

                                {/* Banner Image — used for NFT */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <label className={labelClass + ' mb-0'}>
                                            NFT/Banner Image
                                            <span className="text-red-400 ml-1">*</span>
                                        </label>
                                    </div>
                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setIsDragging(false);
                                            const file = e.dataTransfer.files[0];
                                            if (file) handleBannerChange(file);
                                        }}
                                        className={`
        relative w-full aspect-[16/5] rounded-2xl border-2 border-dashed overflow-hidden
        flex flex-col items-center justify-center cursor-pointer
        transition-all duration-300
        ${isDragging
                                                ? 'border-[#00e5ff] bg-[#00e5ff]/5'
                                                : 'border-[#00e5ff]/20 bg-[#0a0a0a] hover:border-[#00e5ff]/40'
                                            }
      `}
                                        onClick={() => document.getElementById('bannerInput')?.click()}
                                    >
                                        {bannerPreview ? (
                                            <>
                                                <img
                                                    src={bannerPreview}
                                                    alt="NFT banner"
                                                    className="absolute inset-0 w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2">
                                                    <span className="text-white text-sm font-semibold">Change Banner</span>
                                                    <span className="text-white/50 text-xs">Click or drag to replace</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-row items-center justify-center gap-4 px-6">
                                                <div className="w-10 h-10 rounded-full border border-[#00e5ff]/20 bg-[#00e5ff]/5 flex-shrink-0 flex items-center justify-center">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                        <path d="M12 16V8M12 8l-3 3M12 8l3 3" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M3 16v1a4 4 0 004 4h10a4 4 0 004-4v-1" stroke="rgba(0,229,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
                                                    </svg>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="text-white/50 text-sm font-medium">Click or drag to upload</p>
                                                    <p className="text-white/20 text-[10px] uppercase tracking-widest">PNG · JPG</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        id="bannerInput"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleBannerChange(file);
                                        }}
                                    />
                                    <p className="text-white/20 text-[11px] mt-2 leading-relaxed text-center">
                                        Recommended: 16:5 ratio, minimum 800×250px. Max 1MB.
                                    </p>
                                </div>

                            </div>

                        </div>
                    </form>

                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                    <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl">

                        {/* Icon */}
                        <div className="w-12 h-12 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/20 flex items-center justify-center mb-4">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                                    stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>

                        <h2 className="text-white font-black uppercase tracking-tight text-lg mb-1">
                            Confirm Event Creation
                        </h2>
                        <p className="text-white/40 text-sm mb-6 leading-relaxed">
                            Creating this event requires a payment of{' '}
                            <span className="text-[#00e5ff] font-bold">
                                {getEventPrice(parseInt(form.capacity)) / 1_000_000} ADA
                            </span>{' '}
                            to the TIXANO platform. Additional Cardano network transaction fees will also apply.
                        </p>

                        {/* Event summary */}
                        <div className="bg-black/40 border border-white/5 rounded-lg px-4 py-3 mb-6 flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-white/30">Event</span>
                                <span className="text-white/70 font-medium truncate ml-4">{form.eventAlias}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-white/30">Capacity</span>
                                <span className="text-white/70 font-medium">{form.capacity} attendees</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-white/30">Creation Fee</span>
                                <span className="text-[#00e5ff] font-bold">
                                    {getEventPrice(parseInt(form.capacity)) / 1_000_000} ADA
                                </span>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-3 rounded-lg border border-white/10 text-white/50 text-sm font-bold uppercase tracking-widest hover:border-white/30 hover:text-white/70 transition-all duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmedSubmit}
                                className="flex-1 py-3 rounded-lg bg-[#00e5ff] text-black text-sm font-black uppercase tracking-widest hover:bg-[#33ecff] transition-all duration-200"
                            >
                                Confirm & Pay
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* Processing Modal */}
            {submitting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm px-4">
                    <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl text-center">

                        {/* Spinner */}
                        <div className="w-16 h-16 rounded-full border-2 border-white/5 border-t-[#00e5ff] animate-spin mx-auto mb-6" />

                        <h2 className="text-white font-black uppercase tracking-tight text-lg mb-2">
                            {processingStep === 'signing' && 'Waiting for Signature'}
                            {processingStep === 'confirming' && 'Transaction Processing'}
                            {processingStep === 'uploading' && 'Uploading Images'}
                            {processingStep === 'saving' && 'Almost Done'}
                            {!processingStep && 'Processing...'}
                        </h2>

                        <p className="text-white/40 text-sm leading-relaxed mb-6">
                            {processingStep === 'signing' &&
                                'Please sign the transaction in your wallet to proceed.'}
                            {processingStep === 'confirming' &&
                                'Your transaction has been submitted and is being confirmed on the Cardano blockchain. This may take 30–60 seconds. Please do not close or refresh this page.'}
                            {processingStep === 'uploading' &&
                                'Transaction confirmed. Uploading your event images...'}
                            {processingStep === 'saving' &&
                                'Images uploaded. Saving your event details...'}
                            {!processingStep && 'Please wait...'}
                        </p>

                        {/* Warning banner — only show during blockchain confirmation */}
                        {processingStep === 'confirming' && (
                            <div className="flex items-center gap-2 bg-[#ffaa00]/10 border border-[#ffaa00]/20 rounded-lg px-4 py-3">
                                <span className="text-[#ffaa00] text-lg flex-shrink-0">⚠</span>
                                <p className="text-[#ffaa00]/80 text-xs text-left leading-relaxed">
                                    Do not close this tab or navigate away. Leaving during confirmation may result in a lost transaction.
                                </p>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </>
    );
}