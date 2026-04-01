'use client';

import React, { useState } from 'react';
import { useLenderPortfolio, withdraw } from '../../../lib/api';
import { useWallet } from '../../../components/WalletConnect';
import { useTransactionToasts } from '../../../components/Toast';
import { TransactionStatus, TxState } from '../../../components/TransactionStatus';
import { PoolStatsSkeleton } from '../../../components/LoadingSkeleton';

export default function PortfolioPage() {
  const { address } = useWallet();
  const { data, isLoading, error, mutate } = useLenderPortfolio(address);
  const { notifySubmitted, notifyConfirmed, notifyFailed } = useTransactionToasts();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [txState, setTxState]   = useState<TxState | null>(null);
  const [txError, setTxError]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    const stroops = Math.round(parseFloat(withdrawAmount) * 1e7);
    if (stroops <= 0) return;
    setSubmitting(true);
    setTxState('submitted');
    notifySubmitted();
    try {
      await withdraw(address, stroops);
      setTxState('confirmed');
      notifyConfirmed();
      setWithdrawAmount('');
      mutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Withdrawal failed';
      setTxState('failed');
      setTxError(msg);
      notifyFailed(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!address) {
    return <p style={{ color: '#737373' }}>Connect your wallet to view your portfolio.</p>;
  }

  if (isLoading) return <PoolStatsSkeleton />;
  if (error) return <p style={{ color: '#ef4444' }}>Failed to load portfolio.</p>;

  const balance = data ? Number(BigInt(data.position.balance)) / 1e7 : 0;
  const utilization = data ? (data.utilizationRate / 100).toFixed(1) : '0';
  const apy = data ? (data.lenderApy / 100).toFixed(0) : '0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Lender Portfolio</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Your balance', value: `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
          { label: 'Pool utilization', value: `${utilization}%` },
          { label: 'Lender APY', value: `${apy}%` },
        ].map(s => (
          <div key={s.label} style={{ border: '1px solid #e5e5e5', borderRadius: '0.5rem', padding: '1rem', background: '#fff' }}>
            <div style={{ fontSize: '0.8125rem', color: '#737373' }}>{s.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {txState && <TransactionStatus state={txState} errorMessage={txError} />}

      <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Withdraw USDC</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={withdrawAmount}
            onChange={e => setWithdrawAmount(e.target.value)}
            placeholder={`Max: $${balance.toFixed(2)}`}
            style={{ flex: 1, border: '1px solid #d4d4d4', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
          />
          <button
            type="button"
            onClick={() => setWithdrawAmount(balance.toFixed(7))}
            style={{ background: '#f5f5f5', border: '1px solid #d4d4d4', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontSize: '0.8125rem', cursor: 'pointer' }}
          >
            Max
          </button>
        </div>
        <button
          type="submit"
          disabled={submitting || !withdrawAmount}
          style={{
            background: '#171717', color: '#fff', border: 'none', borderRadius: '0.5rem',
            padding: '0.75rem', fontWeight: 700, fontSize: '1rem',
            cursor: submitting || !withdrawAmount ? 'not-allowed' : 'pointer',
            opacity: submitting || !withdrawAmount ? 0.6 : 1,
          }}
        >
          {submitting ? 'Withdrawing…' : 'Withdraw'}
        </button>
      </form>
    </div>
  );
}
