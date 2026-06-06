import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '@meshsdk/react';
import WalletConnectButton from '@/components/wallet/WalletConnectButton';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';

function NavLink({ href, label }: { href: string; label: string }) {
  const { pathname } = useRouter();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`text-sm tracking-wide transition-colors duration-200
        ${isActive
          ? 'text-[#00e5ff] font-semibold'
          : 'text-white/60 hover:text-[#00e5ff]'
        }`}
    >
      {label}
    </Link>
  );
}

function ProtectedLink({ href, label, connected, message, onBlock }: {
  href: string;
  label: string;
  connected: boolean;
  message: string;
  onBlock: (message: string) => void;
}) {
  const { pathname } = useRouter();
  const isActive = pathname === href;

  const handleClick = (e: React.MouseEvent) => {
    if (!connected) {
      e.preventDefault();
      onBlock(message);
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`text-sm tracking-wide transition-colors duration-200
        ${isActive
          ? 'text-[#00e5ff] font-semibold'
          : 'text-white/60 hover:text-[#00e5ff]'
        }`}
    >
      {label}
    </Link>
  );
}

function DashboardButton({ connected, onBlock }: {
  connected: boolean;
  onBlock: (message: string) => void;
}) {
  const { pathname } = useRouter();
  const isActive = pathname === '/dashboard' || pathname.startsWith('/dashboard');

  const handleClick = (e: React.MouseEvent) => {
    if (!connected) {
      e.preventDefault();
      onBlock('Connect your wallet to access your dashboard.');
    }
  };

  return (
    <Link
      href="/dashboard"
      onClick={handleClick}
      title="Dashboard"
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-semibold uppercase tracking-wider transition-all duration-200
  ${isActive
          ? 'border-[#00e5ff]/50 bg-[#00e5ff]/10 text-[#00e5ff]'
          : 'border-white/10 bg-white/4 text-white/50 hover:border-[#00e5ff]/40 hover:bg-[#00e5ff]/8 hover:text-[#00e5ff]'
        }`}
        // className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all duration-200
        // ${isActive
        //   ? 'border-[#00e5ff]/50 bg-[#00e5ff]/10 text-[#00e5ff]'
        //   : 'border-white/10 bg-white/4 text-white/50 hover:border-[#00e5ff]/40 hover:bg-[#00e5ff]/8 hover:text-[#00e5ff]'
        // }`}
    >
      {/* Dashboard grid icon */}
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="1" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
        <rect x="1" y="9" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="9" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      </svg>
      <span className="hidden sm:inline">Dashboard</span>
    </Link>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { connected } = useWallet();
  const { toast, showToast, closeToast } = useToast();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        className={`
          fixed top-0 left-0 right-0 z-50
          px-6 py-4
          transition-all duration-300
          ${scrolled
            ? 'bg-black/80 backdrop-blur-md border-b border-white/10'
            : 'bg-transparent border-b border-transparent'
          }
        `}
      >
        <nav className="max-w-7xl mx-auto flex items-center justify-between">

          {/* Logo */}
          <Link href="/">
            <img
              src="/Tixano Logo.png"
              alt="TIXANO"
              className="h-7 w-auto object-contain"
            />
          </Link>

          {/* Center Nav Links — Dashboard removed from here */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="/events" label="Explore Events" />
            <NavLink href="/events/create" label="Create Events" />
            <NavLink href="/about" label="About" />
          </div>

          {/* Right: Dashboard button + Wallet button */}
          <div className="flex items-center gap-3">
            <DashboardButton
              connected={connected}
              onBlock={(msg) => showToast(msg, { title: 'Wallet Required', type: 'info', duration: 5000 })}
            />
            <WalletConnectButton />
          </div>

        </nav>
      </header>

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          title={toast.title}
          type={toast.type}
          duration={toast.duration}
          onClose={closeToast}
        />
      )}
    </>
  );
}