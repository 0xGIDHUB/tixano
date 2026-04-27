import Link from 'next/link';
import { FaEnvelope, FaTwitter, FaDiscord } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="bg-gray border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-10">

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">

          {/* Logo + tagline */}
          <div className="flex flex-col gap-1.5">
            <Link href="/" className="text-white font-bold text-lg tracking-widest uppercase">
              TIX<span className="text-[#00e5ff]">ANO</span>
            </Link>
            <p className="text-white/30 text-xs tracking-wide">
              NFT ticketing on Cardano
            </p>
          </div>

          {/* Nav links */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-12">

            <div className="flex flex-col gap-2.5">
              <span className="text-white/20 text-[10px] uppercase tracking-[0.15em] font-medium">
                Platform
              </span>
              <Link href="/events" className="text-white/50 hover:text-[#00e5ff] text-sm transition-colors duration-200">
                About Us
              </Link>
              <Link href="/events" className="text-white/50 hover:text-[#00e5ff] text-sm transition-colors duration-200">
                Help
              </Link>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-white/20 text-[10px] uppercase tracking-[0.15em] font-medium">
                Socials
              </span>
              <div className="flex gap-4">
                <a
                  href="mailto:tixano.dapp@gmail.com"
                  aria-label="Email"
                  className="text-white/50 hover:text-[#00e5ff] transition-colors duration-200"
                >
                  <FaEnvelope size={18} />
                </a>
                <a
                  href="https://twitter.com/tixano"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                  className="text-white/50 hover:text-[#00e5ff] transition-colors duration-200"
                >
                  <FaTwitter size={18} />
                </a>
                <a
                  href="https://discord.gg/tixano"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Discord"
                  className="text-white/50 hover:text-[#00e5ff] transition-colors duration-200"
                >
                  <FaDiscord size={18} />
                </a>
              </div>
            </div>

          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/20 text-xs">
            © {new Date().getFullYear()} TIXANO. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <span className="text-white/20 text-xs">
              Built on Cardano
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="text-white/20 text-xs">
              Powered by MeshJS
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}