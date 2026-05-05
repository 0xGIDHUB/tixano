import { useState, useEffect } from 'react';
import { useWallet, useWalletList } from '@meshsdk/react';
import { CARDANO_NETWORK, CARDANO_NETWORK_ID } from '@/lib/cardano/network';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';

export default function WalletConnectButton() {
  const { connect, disconnect, connected, connecting } = useWallet();
  const wallets = useWalletList();
  const [showModal, setShowModal] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const { toast, showToast, closeToast } = useToast();

  // Close modal on outside click
  useEffect(() => {
    if (!showModal) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const modal = document.getElementById('wallet-modal');
      if (modal && !modal.contains(e.target as Node)) {
        setShowModal(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showModal]);

  const handleConnect = async (walletId: string) => {
    try {
      await connect(walletId);

      const walletApi = await (window as any).cardano[walletId].enable();
      const networkId = await walletApi.getNetworkId();

      if (networkId !== CARDANO_NETWORK_ID) {
        disconnect();
        setShowModal(false);
        localStorage.removeItem('tixano_wallet');
        showToast(
          `Please switch your wallet to Cardano ${CARDANO_NETWORK.charAt(0).toUpperCase() + CARDANO_NETWORK.slice(1)} and try again.`,
          { title: 'Wrong Network', type: 'error', duration: 6000 }
        );
        return;
      }

      localStorage.setItem('tixano_wallet', walletId);
      setShowModal(false);

    } catch (err) {
      console.error('Wallet connection failed:', err);
    }
  };

  // Connected state — simple button with disconnect option
  if (connected) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDisconnect(!showDisconnect)}
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-white/20 text-white/80 text-sm tracking-wide hover:border-[#00e5ff] hover:text-[#00e5ff] transition-all duration-200"
        >
          <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse" />
          Connected
        </button>

        {showDisconnect && (
          <div className="absolute right-0 mt-2 w-full bg-[#111] border border-white/10 rounded-md shadow-xl overflow-hidden z-50">
            <button
              onClick={() => {
                disconnect();
                localStorage.removeItem('tixano_wallet');
                setShowDisconnect(false);
              }}
              className="w-full text-center px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  // Not connected state
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={connecting}
        className="px-4 py-2 rounded-md border border-white/20 text-white text-sm tracking-wide hover:border-[#00e5ff] hover:text-[#00e5ff] transition-all duration-200 disabled:opacity-50"
      >
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            id="wallet-modal"
            className="relative w-[360px] bg-[#111] border border-white/10 rounded-2xl shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold text-lg tracking-wide">
                Connect Wallet
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/40 hover:text-white transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {wallets.length === 0 ? (
              <p className="text-center text-white/40 text-sm py-6">
                No wallets detected. <br />
                Please install a Cardano wallet extension.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {wallets.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => handleConnect(w.id)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/10 hover:border-[#00e5ff]/50 hover:bg-white/5 transition-all duration-200 group"
                  >
                    <img src={w.icon} alt={w.name} className="w-12 h-12 rounded-xl" />
                    <span className="text-white/60 group-hover:text-white text-xs text-center transition-colors">
                      {w.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast renders via portal — always fixed to viewport */}
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