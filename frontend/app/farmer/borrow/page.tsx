'use client';

import React, { useState } from 'react';
import { useFarmerAnimals, borrow } from '../../../lib/api';
import { useWallet } from '../../../components/WalletConnect';
import { useTransactionToasts } from '../../../components/Toast';
import { TransactionStatus, TxState } from '../../../components/TransactionStatus';

const DURATIONS = [30, 60, 90] as const;

export default function BorrowPage() {
  const { address } = useWallet();
  const { data: animals } = useFarmerAnimals(address);
  const { notifySubmitted, notifyConfirmed, notifyFailed } = useTransactionToasts();

  const [assetId, setAssetId]           = useState('');
  const [loanAmount, setLoanAmount]     = useState('');
  const [duration, setDuration]         = useState<30 | 60 | 90>(30);
  const [txState, setTxState]           = useState<TxState | null>(null);
  const [txError, setTxError]           = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const selectedAnimal = animals?.find(a => a.assetId === assetId);
  const collateralValue = selectedAnimal
    ? Math.round(selectedAnimal.weightKg * 10 * 1e7) // placeholder: $10/kg in stroops
    : 0;
  const loanStroops = Math.round(parseFloat(loanAmount || '0') * 1e7);
  const ltv = collateralValue > 0 ? (loanStroops / collateralValue) * 100 : 0;
  const ltvOk = ltv > 0 && ltv <= 60;

  async function handleBorrow(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !assetId || !loanStroops || !collateralValue) return;
    setSubmitting(true);
    setTxState('submitted');
    notifySubmitted();
    try {
      await borrow({
        farmerAddress: address,
        assetId,
        loanAmount: loanStroops,
        collateralValue,
        kraalId: selectedAnimal?.kraalId ?? '',
        durationDays: duration,
      });
      setTxState('confirmed');
      notifyConfirmed();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Borrow failed';
      setTxState('failed');
      setTxError(msg);
      notifyFailed(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!address) {
    return <p style={{ color: '#737373' }}>Connect your wallet to borrow.</p>;
  }

  return (
    <div style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Borrow USDC</h1>

      {txState && <TransactionStatus state={txState} errorMessage={txError} />}

      <form onSubmit={handleBorrow} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Animal selector */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 600 }}>
          Select animal (collateral)
          <select
            value={assetId}
            onChange={e => setAssetId(e.target.value)}
            required
            style={{ border: '1px solid #d4d4d4', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
          >
            <option value="">— choose an animal —</option>
            {animals?.filter(a => a.verified && !a.deceased).map(a => (
              <option key={a.assetId} value={a.assetId}>
                {a.name} ({a.species}) — {a.assetId}
              </option>
            ))}
          </select>
        </label>

        {/* Collateral value display */}
        {selectedAnimal && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.875rem' }}>
            <strong>Collateral value:</strong> ${(collateralValue / 1e7).toFixed(2)} USDC
            <br />
            <strong>Max borrow (60% LTV):</strong> ${(collateralValue * 0.6 / 1e7).toFixed(2)} USDC
          </div>
        )}

        {/* Loan amount */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 600 }}>
          Loan amount (USDC)
          <input
            type="number"
            min="0"
            step="0.01"
            value={loanAmount}
            onChange={e => setLoanAmount(e.target.value)}
            required
            placeholder="e.g. 500"
            style={{ border: '1px solid #d4d4d4', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
          />
        </label>

        {/* LTV indicator */}
        {loanAmount && collateralValue > 0 && (
          <div style={{
            background: ltvOk ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${ltvOk ? '#86efac' : '#fca5a5'}`,
            borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
            color: ltvOk ? '#15803d' : '#b91c1c',
          }}>
            LTV: {ltv.toFixed(1)}% {ltvOk ? '✓ within limit' : '✗ exceeds 60% max'}
          </div>
        )}

        {/* Duration */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 600 }}>
          Loan duration
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {DURATIONS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                style={{
                  flex: 1, padding: '0.5rem', borderRadius: '0.375rem', fontSize: '0.875rem',
                  border: `1px solid ${duration === d ? '#22c55e' : '#d4d4d4'}`,
                  background: duration === d ? '#f0fdf4' : '#fff',
                  color: duration === d ? '#15803d' : '#374151',
                  fontWeight: duration === d ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {d} days
              </button>
            ))}
          </div>
        </label>

        {/* Interest preview */}
        {loanStroops > 0 && (
          <div style={{ fontSize: '0.8125rem', color: '#737373' }}>
            Interest (8% APR, {duration} days): ~${(loanStroops * 0.08 * duration / 365 / 1e7).toFixed(4)} USDC
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !ltvOk || !assetId}
          style={{
            background: '#22c55e', color: '#fff', border: 'none', borderRadius: '0.5rem',
            padding: '0.75rem', fontWeight: 700, fontSize: '1rem',
            cursor: submitting || !ltvOk || !assetId ? 'not-allowed' : 'pointer',
            opacity: submitting || !ltvOk || !assetId ? 0.6 : 1,
          }}
        >
          {submitting ? 'Submitting…' : 'Borrow USDC'}
        </button>
      </form>
    </div>
  );
}
