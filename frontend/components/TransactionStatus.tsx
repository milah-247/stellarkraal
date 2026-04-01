'use client';

import React from 'react';

export type TxState = 'pending' | 'submitted' | 'confirmed' | 'failed';

export interface TransactionStatusProps {
  state: TxState;
  txHash?: string;
  errorMessage?: string;
  network?: 'mainnet' | 'testnet';
}

const EXPLORER: Record<'mainnet' | 'testnet', string> = {
  mainnet: 'https://stellar.expert/explorer/public/tx/',
  testnet: 'https://stellar.expert/explorer/testnet/tx/',
};

const CONFIG: Record<TxState, { icon: string; label: string; color: string; bg: string; border: string }> = {
  pending:   { icon: '🔄', label: 'Preparing transaction…',      color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd' },
  submitted: { icon: '⏳', label: 'Submitted — awaiting ledger', color: '#b45309', bg: '#fffbeb', border: '#fcd34d' },
  confirmed: { icon: '✅', label: 'Confirmed on Stellar',         color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
  failed:    { icon: '❌', label: 'Transaction failed',           color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5' },
};

export function TransactionStatus({
  state,
  txHash,
  errorMessage,
  network = 'mainnet',
}: TransactionStatusProps) {
  const cfg = CONFIG[state];
  const explorerUrl = txHash ? `${EXPLORER[network]}${txHash}` : null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        borderRadius: '0.5rem',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      <span
        style={{ fontSize: '1.25rem', lineHeight: 1, animation: state === 'submitted' ? 'sk-spin 1s linear infinite' : undefined }}
        aria-hidden="true"
      >
        {cfg.icon}
      </span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: cfg.color }}>
          {cfg.label}
        </p>
        {state === 'failed' && errorMessage && (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>{errorMessage}</p>
        )}
        {txHash && (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', fontFamily: 'monospace', color: '#374151', wordBreak: 'break-all' }}>
            {txHash}
          </p>
        )}
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', marginTop: '0.375rem', fontSize: '0.75rem', color: cfg.color, textDecoration: 'underline' }}
          >
            View on Stellar Expert →
          </a>
        )}
      </div>
      <style>{`
        @keyframes sk-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
