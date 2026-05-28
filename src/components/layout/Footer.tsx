import Link from 'next/link';
import { FaEnvelope, FaTwitter, FaDiscord } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="bg-gray border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-10">

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">

          {/* Logo + tagline */}
          <div className="flex flex-col gap-1.5">
            <Link href="/">
              <img
                src="/Tixano Logo.png"
                alt="TIXANO"
                className="h-5 w-auto object-contain"
              />
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
              <Link href="/" className="text-white/50 hover:text-[#00e5ff] text-sm transition-colors duration-200">
                Home
              </Link>
              <Link href="/about" className="text-white/50 hover:text-[#00e5ff] text-sm transition-colors duration-200">
                About
              </Link>
              <Link href="/events" className="text-white/50 hover:text-[#00e5ff] text-sm transition-colors duration-200">
                Help
              </Link>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-white/20 text-[10px] uppercase tracking-[0.15em] font-medium">
                Contact
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.89 1.5H22.5L14.51 10.35L24 22.5H16.62L10.88 15.73L4.12 22.5H0.51L8.91 13.27L0 1.5H7.59L12.89 7.76L18.89 1.5ZM17.05 20.68H19.39L6.31 3.77H3.8L17.05 20.68Z" />
                  </svg>
                </a>
              </div>
            </div>

          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/20 text-xs">
            TIXANO - {new Date().getFullYear()}
          </p>
          <div className="flex items-center gap-5">
            <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 128 128" id="cardano" fill="#D0D0D0">
              <circle cx="45.9" cy="63.84" r="7.82"></circle>
              <circle cx="82.1" cy="63.84" r="7.82"></circle>
              <circle cx="54.95" cy="79.51" r="7.82"></circle>
              <circle cx="73.05" cy="48.17" r="7.82"></circle>
              <circle cx="73.05" cy="79.51" r="7.82"></circle>
              <circle cx="54.95" cy="48.17" r="7.82"></circle>
              <circle cx="103.98" cy="64" r="4.1"></circle>
              <circle cx="24.02" cy="64" r="4.1"></circle>
              <circle cx="9.48" cy="64" r="2.6"></circle>
              <circle cx="118.52" cy="64" r="2.6"></circle>
              <circle cx="83.99" cy="29.37" r="4.1"></circle>
              <circle cx="44.01" cy="98.63" r="4.1"></circle>
              <circle cx="36.74" cy="111.21" r="2.6"></circle>
              <circle cx="91.26" cy="16.79" r="2.6"></circle>
              <circle cx="44.01" cy="29.37" r="4.1"></circle>
              <circle cx="83.99" cy="98.63" r="4.1"></circle>
              <circle cx="91.26" cy="111.21" r="2.6"></circle>
              <circle cx="36.74" cy="16.79" r="2.6"></circle>
              <circle cx="64" cy="32.71" r="4.72"></circle>
              <circle cx="64" cy="14.05" r="3.23"></circle>
              <circle cx="64" cy="95.29" r="4.72"></circle>
              <circle cx="64" cy="113.95" r="3.23"></circle>
              <circle cx="36.9" cy="48.36" r="4.72"></circle>
              <circle cx="20.74" cy="39.02" r="3.23"></circle>
              <circle cx="91.1" cy="79.64" r="4.72"></circle>
              <circle cx="107.26" cy="88.98" r="3.23"></circle>
              <circle cx="36.9" cy="79.64" r="4.72"></circle>
              <circle cx="20.74" cy="88.98" r="3.23"></circle>
              <circle cx="91.1" cy="48.36" r="4.72"></circle>
              <circle cx="107.26" cy="39.02" r="3.23"></circle>
            </svg>

            <svg width="38" height="38" enableBackground="new 0 0 300 200" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" fill="#D0D0D0"><path d="m289 127-45-60-45-60c-.9-1.3-2.4-2-4-2s-3.1.7-4 2l-37 49.3c-2 2.7-6 2.7-8 0l-37-49.3c-.9-1.3-2.4-2-4-2s-3.1.7-4 2l-45 60-45 60c-1.3 1.8-1.3 4.2 0 6l45 60c.9 1.3 2.4 2 4 2s3.1-.7 4-2l37-49.3c2-2.7 6-2.7 8 0l37 49.3c.9 1.3 2.4 2 4 2s3.1-.7 4-2l37-49.3c2-2.7 6-2.7 8 0l37 49.3c.9 1.3 2.4 2 4 2s3.1-.7 4-2l45-60c1.3-1.8 1.3-4.2 0-6zm-90-103.3 32.5 43.3c1.3 1.8 1.3 4.2 0 6l-32.5 43.3c-2 2.7-6 2.7-8 0l-32.5-43.3c-1.3-1.8-1.3-4.2 0-6l32.5-43.3c2-2.7 6-2.7 8 0zm-90 0 32.5 43.3c1.3 1.8 1.3 4.2 0 6l-32.5 43.3c-2 2.7-6 2.7-8 0l-32.5-43.3c-1.3-1.8-1.3-4.2 0-6l32.5-43.3c2-2.7 6-2.7 8 0zm-53 152.6-32.5-43.3c-1.3-1.8-1.3-4.2 0-6l32.5-43.3c2-2.7 6-2.7 8 0l32.5 43.3c1.3 1.8 1.3 4.2 0 6l-32.5 43.3c-2 2.7-6 2.7-8 0zm90 0-32.5-43.3c-1.3-1.8-1.3-4.2 0-6l32.5-43.3c2-2.7 6-2.7 8 0l32.5 43.3c1.3 1.8 1.3 4.2 0 6l-32.5 43.3c-2 2.7-6 2.7-8 0zm90 0-32.5-43.3c-1.3-1.8-1.3-4.2 0-6l32.5-43.3c2-2.7 6-2.7 8 0l32.5 43.3c1.3 1.8 1.3 4.2 0 6l-32.5 43.3c-2 2.7-6 2.7-8 0z" /></svg>
          </div>
        </div>

      </div>
    </footer>
  );
}