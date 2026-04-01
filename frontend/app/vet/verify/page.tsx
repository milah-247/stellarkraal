'use client';

import React, { useState } from 'react';
import { useOracleStatus, setOracleHealth } from '../../../lib/api';
import { useWallet } from '../../../components/WalletConnect';
import { useTransactionToasts } from '../../../components/Toast';
import { TransactionStatus, TxState } from '../../../components/TransactionStatus';

const HEALTH_OPTIONS = ['HEALTHY', 'SICK', 'CRITICAL', 'DECEASED'] as const;
type HealthStatus = typeof HEALTH_OPTIONS[number];

const HEALTH_COLOR: Record<HealthStatus, string> = {
  HEALTHY:  '#22c55e',
  SICK:     '#f59e0b',
  CRITICAL: '#ef4444',
  DECEASED: '#737373',
};

export default function VetVerifyPage() {
  const { address, role } = useWallet();
  const { notifySubmitted, notifyConfirmed, notifyFailed } = useTransactionToasts();

  const [assetId, setAssetId]         = useState('');
  const [health, setHealth]           = useState<HealthStatus>('HEALTHY');
  const [txState, setTxState]         = useState<TxState | null>(null);
  const [txError, setTxError]         = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [lookupId, setLookupId]       = useState('');

  const { data: oracleStatus } = useOracleStatus(lookupId || null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assetId) return;
    setSubmitting(true);
    setTxState('submitted');
    notifySubmitted();
    try {
      await setOracleHealth(assetId, health);
      setTxState('confirmed');
      notifyConfirmed();
      setAssetId('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Attestation failed';
      setTxState('failed');
      setTxError(msg);
      notifyFailed(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!address) {
    return <p style={{ color: '#737373' }}>Connect your wallet as a vet to submit attestations.</p>;
  }
  if (role !== 'vet' && role !== 'admin') {
    return <p style={{ color: '#ef4444' }}>Access restricted to verified vets.</p>;
  }

  return (
    <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Vet Verification Portal</h1>

      {/* Oracle lookup */}
      <div style={{ border: '1px solid #e5e5e5', borderRadius: '0.5rem', padding: '1rem', background: '#fff' }}>
        <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 0.75rem' }}>Check oracle status</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            value={lookupId}
            onChange={e => setLookupId(e.target.value)}
            placeholder="Asset ID (e.g. CATTLE-001)"
            style={{ flex: 1, border: '1px solid #d4d4d4', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
          />
        </div>
        {oracleStatus && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span>Price: <strong>${(Number(BigInt(oracleStatus.price)) / 1e7).toFixed(2)} USDC</strong></span>
            <span>Updated: <strong>{new Date(oracleStatus.updatedAt).toLocaleString()}</strong></span>
            <span style={{ color: oracleStatus.stale ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
              {oracleStatus.stale ? '⚠ Data is stale (>48h)' : '✓ Data is fresh'}
            </span>
          </div>
        )}
      </div>

      {txState && <TransactionStatus state={txState} errorMessage={txError} />}

      {/* Health attestation form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>Submit health attestation</h2>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 600 }}>
          Asset ID (RFID / NFT ID)
          <input
            value={assetId}
            onChange={e => setAssetId(e.target.value)}
            required
            placeholder="e.g. CATTLE-001"
            style={{ border: '1px solid #d4d4d4', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontWeight: 400 }}
          />
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Health status</span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {HEALTH_OPTIONS.map(h => (
              <button
                key={h}
                type="button"
                onClick={() => setHealth(h)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: 600,
                  border: `2px solid ${health === h ? HEALTH_COLOR[h] : '#d4d4d4'}`,
                  background: health === h ? HEALTH_COLOR[h] + '20' : '#fff',
                  color: health === h ? HEALTH_COLOR[h] : '#525252',
                  cursor: 'pointer',
                }}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !assetId}
          style={{
            background: '#22c55e', color: '#fff', border: 'none', borderRadius: '0.5rem',
            padding: '0.75rem', fontWeight: 700, fontSize: '1rem',
            cursor: submitting || !assetId ? 'not-allowed' : 'pointer',
            opacity: submitting || !assetId ? 0.6 : 1,
          }}
        >
          {submitting ? 'Submitting…' : 'Submit attestation'}
        </button>
      </form>
    </div>
  );
}
