import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useWallet } from '@meshsdk/react';

type PricingType = 'free' | 'paid';

interface FormData {
    title: string;
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

    const { connected } = useWallet();
    const [ready, setReady] = useState(false);

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
        setForm(f => ({ ...f, image: file }));
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleBannerChange = (file: File) => {
        if (!file.type.startsWith('image/')) return;
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Form submitted:', form);
    };

    const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#00e5ff]/50 focus:ring-1 focus:ring-[#00e5ff]/20 transition-all duration-200";
    const labelClass = "block text-white/40 text-[11px] uppercase tracking-[0.12em] font-semibold mb-2";

    return (
        <>
            <Head>
                <title>Create Event — TIXANO</title>
            </Head>

            <div className="min-h-screen bg-black px-6 py-12">
                <div className="max-w-6xl mx-auto">

                    {/* Page Header */}
                    <div className="mb-10">
                        <h1 className="text-white text-3xl font-black uppercase tracking-tight">
                            Create Your Event
                        </h1>
                    </div>

                    <form onSubmit={handleSubmit}>
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
                                            onChange={handleChange}
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
                                            onChange={handleChange}
                                            className={`${inputClass} [color-scheme:dark]`}
                                        />
                                    </div>
                                </div>

                                {/* Start + End Time */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Start Time</label>
                                        <input
                                            type="time"
                                            name="startTime"
                                            value={form.startTime}
                                            onChange={handleChange}
                                            className={`${inputClass} [color-scheme:dark]`}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>End Time</label>
                                        <input
                                            type="time"
                                            name="endTime"
                                            value={form.endTime}
                                            onChange={handleChange}
                                            className={`${inputClass} [color-scheme:dark]`}
                                        />
                                    </div>
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
                                        <input
                                            name="country"
                                            value={form.country}
                                            onChange={handleChange}
                                            placeholder="e.g. Nigeria"
                                            className={inputClass}
                                        />
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
                                                        ? 'bg-[#00b8cc] border-[#00b8cc] text-black'
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
                                        {(['free', 'paid'] as PricingType[]).map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setForm(f => ({ ...f, pricing: type }))}
                                                className={`
                          flex-1 py-3 rounded-lg border text-sm font-bold uppercase tracking-widest transition-all duration-200
                          ${form.pricing === type
                                                        ? 'bg-[#00b8cc] border-[#00b8cc] text-black'
                                                        : 'bg-transparent border-white/10 text-white/40 hover:border-white/30 hover:text-white/60'
                                                    }
                        `}
                                            >
                                                {type}
                                            </button>
                                        ))}
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

                                {/* Submit */}
                                <button
                                    type="submit"
                                    className="w-full mt-2 bg-[#00b8cc] text-black font-black uppercase tracking-[0.1em] py-4 rounded-lg text-sm hover:bg-[#33ecff] transition-all duration-200 hover:-translate-y-0.5"
                                >
                                    Create Event
                                </button>

                            </div>

                            {/* ── RIGHT: Image Upload ── */}
                            <div className="w-full lg:w-[340px] flex-shrink-0 flex flex-col gap-6">

                                {/* Square Cover Image */}
                                <div>
                                    <label className={labelClass}>Event Cover Image</label>
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
                                                <p className="text-white/15 text-[10px] uppercase tracking-widest">PNG · JPG · WEBP</p>
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
                                        Recommended: 1:1 ratio, minimum 600×600px.
                                    </p>
                                </div>

                                {/* Banner Image — used for NFT */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <label className={labelClass + ' mb-0'}>NFT/Banner Image</label>
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
                                                    <p className="text-white/20 text-[10px] uppercase tracking-widest">PNG · JPG · WEBP</p>
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
                                        Recommended: 16:5 ratio, minimum 800×250px.
                                    </p>
                                </div>

                            </div>

                        </div>
                    </form>

                </div>
            </div>
        </>
    );
}