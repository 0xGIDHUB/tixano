import { useEffect } from 'react';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

interface ToastProps {
  message: string;
  title?: string;
  type?: ToastType;
  duration?: number;
  txHash?: string;
  onClose: () => void;
}

const icons: Record<ToastType, string> = {
  info:    '!',
  success: '✓',
  error:   '✕',
  warning: '⚠',
};

const colors: Record<ToastType, string> = {
  info:    '#00e5ff',
  success: '#00e5ff',
  error:   '#00e5ff',
  warning: '#00e5ff',
};

export default function Toast({
  message,
  title,
  type = 'info',
  duration = 5000,
  txHash,
  onClose,
}: ToastProps) {
  const color = colors[type];

  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-in">
      <div
        className="flex items-center gap-3 bg-[#111] rounded-xl px-5 py-4 shadow-2xl shadow-black/50 min-w-[300px]"
        style={{ border: `1px solid ${color}30` }}
      >
        {/* Icon */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{
            background: `${color}15`,
            border: `1px solid ${color}40`,
            color: color,
          }}
        >
          {icons[type]}
        </div>

        {/* Text */}
        <div className="flex flex-col">
          {title && (
            <span className="text-white text-sm font-medium">{title}</span>
          )}
          <span className="text-white/50 text-xs mt-0.5">{message}</span>
          {txHash && (
            <a
              href={`https://preprod.cardanoscan.io/transaction/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00e5ff] text-xs mt-1 hover:underline"
            >
              View on Cardanoscan ↗
            </a>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={onClose}
          className="ml-auto flex-shrink-0 text-white/30 hover:text-white/70 transition-colors text-lg leading-none"
        >
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div
        className="mt-1 h-0.5 rounded-full overflow-hidden"
        style={{ background: `${color}20` }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: color,
            animation: `drain ${duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}