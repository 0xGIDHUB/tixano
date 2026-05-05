import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '@meshsdk/react';
import WalletConnectButton from '@/components/wallet/WalletConnectButton';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';

function NavLink({ href, label }: { href: string; label: string }) {
  const { pathname } = useRouter();
  const isActive = pathname === href;  // ← exact match only

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
  const isActive = pathname === href;  // ← exact match only

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

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="/events" label="Explore Events" />
            <ProtectedLink
              href="/events/create"
              label="Create Events"
              connected={connected}
              message="Connect wallet to create events"
              onBlock={(msg) => showToast(msg, { title: 'Wallet Required', type: 'info', duration: 5000 })}
            />
            <ProtectedLink
              href="/dashboard"
              label="Dashboard"
              connected={connected}
              message="Connect wallet to view your dashboard"
              onBlock={(msg) => showToast(msg, { title: 'Wallet Required', type: 'info', duration: 5000 })}
            />
            <NavLink href="/about" label="About" />
          </div>

          {/* Wallet Connect Button */}
          <div className="flex items-center">
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