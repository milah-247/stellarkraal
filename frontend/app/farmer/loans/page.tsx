'use client';

import React, { useState } from 'react';
import { useFarmerLoans, repay } from '../../../lib/api';
import { useWallet } from '../../../components/WalletConnect';
import { useTransactionToasts } from '../../../components/Toast';
import { TransactionStatus, TxState } from '../../../components/TransactionStatus';
import { LoanCardSkeleton } from '../../../components/LoadingSkeleton';
import type { Loan } from '../../../lib/api';

const STATUS_COLOR: Record<Loan['status'], { bg: string; color: string }> = {
  ACTIVE:       { bg: '#f0fdf4', color: '#15803d' },
  REPAID:       { bg: '#eff6ff', color: '#1d4ed8' },
  DEFAULTED:    { bg: '#fef2f2', color: '#b91c1c' },
  LIQUIDATED:   { bg: '#fef2f2', color: '#b91c1c' },
  GRACE_PERIOD: { bg: '#fffbeb', color: '#b45309' },
};

function LoanCard({ loan, onRepay }: { loan: Loan; onRepay: (id: string, amount: number) => void }) {
  const [amount, setAmount] = useState('');
  const totalDue = (Number(BigInt(loan.principal) + BigInt(loan.interestDue)) / 1e7).toFixed(7);
  const sc = STATUS_COLOR[loan.status];

  return (
    <div style={{ border: '1px solid #e5e5e5', borderRadius: '0.5rem', padding: '1.25rem', background: '#fff', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#737373' }}>#{loan.loanId}</span>
        <span style={{ background: sc.bg, color: sc.color, borderRadius: '9999px', padding: '0.125rem 0.625rem', fontSize: '0.75rem', fontWeight: 600 }}>
          {loan.status}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem', fontSize: '0.875rem' }}>
        <span style={{ color: '#737373' }}>Principal</span>
        <span style={{ fontWeight: 600 }}>${(Number(BigInt(loan.principal)) / 1e7).toFixed(2)}</span>
        <span style={{ color: '#737373' }}>Interest due</span>
        <span style={{ fontWeight: 600 }}>${(Number(BigInt(loan.interestDue)) / 1e7).toFixed(4)}</span>
        <span style={{ color: '#737373' }}>LTV</span>
        <span style={{ fontWeight: 600 }}>{(loan.ltvRatio / 100).toFixed(0)}%</span>
        <span style={{ color: '#737373' }}>Due</span>
        <span style={{ fontWeight: 600 }}>{new Date(Number(loan.dueTimestamp) * 1000).toLocaleDateString()}</span>
      </div>
      {loan.status === 'ACTIVE' || loan.status === 'GRACE_PERIOD' ? (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
          <input
            type="number"
            placeholder={`Total due: ${totalDue} USDC`}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ flex: 1, border: '1px solid #d4d4d4', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
          />
          <button
            onClick={() => {
              const stroops = Math.round(parseFloat(amount) * 1e7);
              if (stroops > 0) onRepay(loan.id, stroops);
            }}
            style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Repay
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function FarmerLoansPage() {
  const { address } = useWallet();
  const { data: loans, isLoading, error, mutate } = useFarmerLoans(address);
  const { notifySubmitted, notifyConfirmed, notifyFailed } = useTransactionToasts();
  const [txState, setTxState] = useState<TxState | null>(null);
  const [txError, setTxError] = useState('');

  async function handleRepay(loanId: string, amount: number) {
    if (!address) return;
    setTxState('submitted');
    notifySubmitted();
    try {
      await repay(loanId, amount, address);
      setTxState('confirmed');
      notifyConfirmed();
      mutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Repayment failed';
      setTxState('failed');
      setTxError(msg);
      notifyFailed(msg);
    }
  }

  if (!address) {
    return <p style={{ color: '#737373' }}>Connect your wallet to view loans.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>My Loans</h1>

      {txState && (
        <TransactionStatus state={txState} errorMessage={txError} />
      )}

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map(i => <LoanCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <p style={{ color: '#ef4444' }}>Failed to load loans.</p>
      ) : !loans?.length ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#a3a3a3' }}>
          <p>No loans yet.</p>
          <a href="/farmer/borrow" style={{ color: '#22c55e', fontWeight: 600 }}>Borrow USDC →</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loans.map(loan => (
            <LoanCard key={loan.id} loan={loan} onRepay={handleRepay} />
          ))}
        </div>
      )}
    </div>
  );
}
