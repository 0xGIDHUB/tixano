import { useState, useRef, useCallback } from 'react';
import type { ToastType } from '@/components/ui/Toast';

interface ToastState {
  id: number;
  message: string;
  title?: string;
  type?: ToastType;
  duration?: number;
  txHash?: string;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((
    message: string,
    options?: { title?: string; type?: ToastType; duration?: number; txHash?: string;}
  ) => {
    // Clear any existing timer before setting a new toast
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ id: Date.now(), message, ...options });
  }, []);

  const closeToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, showToast, closeToast };
}