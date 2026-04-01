'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';

export type ToastType = 'submitted' | 'confirmed' | 'failed' | 'stale_oracle';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  txHash?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (t: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { ...t, id }]);
    const duration = t.duration ?? (t.type === 'failed' ? 8000 : 5000);
    setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EXPLORER = 'https://stellar.expert/explorer/public/tx/';

const META: Record<ToastType, { icon: string; bg: string; border: string; text: string }> = {
  submitted:    { icon: '⏳', bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' },
  confirmed:    { icon: '✅', bg: '#f0fdf4', border: '#22c55e', text: '#15803d' },
  failed:       { icon: '❌', bg: '#fef2f2', border: '#ef4444', text: '#b91c1c' },
  stale_oracle: { icon: '⚠️', bg: '#fffbeb', border: '#f59e0b', text: '#b45309' },
};

// ─── Single Toast ─────────────────────────────────────────────────────────────

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const m = META[toast.type];
  return (
    <div
      role="alert"
      style={{
        background: m.bg,
        border: `1px solid ${m.border}`,
        borderRadius: '0.5rem',
        padding: '0.75rem 1rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        minWidth: '300px',
        maxWidth: '420px',
      }}
    >
      <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{m.icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 600, color: m.text, fontSize: '0.875rem' }}>{toast.title}</p>
        <p style={{ margin: '0.25rem 0 0', color: '#374151', fontSize: '0.8125rem' }}>{toast.message}</p>
        {toast.txHash && (
          <a
            href={`${EXPLORER}${toast.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.75rem', color: m.text, textDecoration: 'underline' }}
          >
            View on Stellar Expert →
          </a>
        )}
      </div>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '1rem', lineHeight: 1, padding: 0 }}
      >
        ×
      </button>
    </div>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

function ToastContainer() {
  const { toasts, removeToast } = useContext(ToastContext)!;
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        zIndex: 9999,
      }}
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

// ─── Convenience hooks ────────────────────────────────────────────────────────

export function useTransactionToasts() {
  const { addToast } = useToast();

  return {
    notifySubmitted: (txHash?: string) =>
      addToast({ type: 'submitted', title: 'Transaction submitted', message: 'Waiting for network confirmation…', txHash }),
    notifyConfirmed: (txHash?: string) =>
      addToast({ type: 'confirmed', title: 'Transaction confirmed', message: 'Your transaction was included in a ledger.', txHash }),
    notifyFailed: (reason: string) =>
      addToast({ type: 'failed', title: 'Transaction failed', message: reason }),
    notifyStaleOracle: (assetId: string) =>
      addToast({ type: 'stale_oracle', title: 'Oracle data stale', message: `Price data for ${assetId} is older than 48 hours.` }),
  };
}
