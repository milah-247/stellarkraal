'use client';

import React, { useState } from 'react';
import { deposit } from '../../../lib/api';
import { useWallet } from '../../../components/WalletConnect';
import { useTransactionToasts } from '../../../components/Toast';
import { TransactionStatus, TxState } from '../../../components/TransactionStatus';

export default function DepositPage() {
  const { address } = useWallet();
  const { notifySubmitted, notifyConfirmed, notifyFailed } = useTransactionToasts();
  const [amount, setAmount]         = useState('');
  const [txState, setTxState]       = useState<TxState | null>(null);
  const [txError, setTxError]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    const stroops = Math.round(parseFloat(amount) * 1e7);
    if (stroops <= 0) return;
    setSubmitting(true);
    setTxState('submitted');
    notifySubmitted();
    try {
      await deposit(address, stroops);
      setTxState('confirmed');
      notifyConfirmed();
      setAmount('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Deposit failed';
      setTxState('failed');
      setTxError(msg);
      notifyFailed(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!address) {
    return <p style={{ color: '#737373' }}>Connect your wallet to deposit.</p>;
  }

  return (
    <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Deposit USDC</h1>

      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '0.5rem', padding: '1rem', fontSize: '0.875rem' }}>
        <strong>Earn 8% APR</strong> on your USDC deposit. Funds are lent to verified farmers against livestock collateral.
        Withdraw at any time subject to pool utilization.
      </div>

      {txState && <TransactionStatus state={txState} errorMessage={txError} />}

      <form onSubmit={handleDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 600 }}>
          Amount (USDC)
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
            placeholder="e.g. 1000"
            style={{ border: '1px solid #d4d4d4', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
          />
        </label>

        {amount && parseFloat(amount) > 0 && (
          <div style={{ fontSize: '0.8125rem', color: '#737373' }}>
            Estimated annual yield: ~${(parseFloat(amount) * 0.08).toFixed(2)} USDC
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !amount}
          style={{
            background: '#22c55e', color: '#fff', border: 'none', borderRadius: '0.5rem',
            padding: '0.75rem', fontWeight: 700, fontSize: '1rem',
            cursor: submitting || !amount ? 'not-allowed' : 'pointer',
            opacity: submitting || !amount ? 0.6 : 1,
          }}
        >
          {submitting ? 'Depositing…' : 'Deposit USDC'}
        </button>
      </form>
    </div>
  );
}
