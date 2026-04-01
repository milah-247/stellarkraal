'use client';

import React from 'react';
import { useFarmerStats, useActiveLoans } from '../lib/api';
import { PoolStatsSkeleton } from '../components/LoadingSkeleton';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      border: '1px solid #e5e5e5', borderRadius: '0.5rem', padding: '1.25rem',
      background: '#fff', display: 'flex', flexDirection: 'column', gap: '0.25rem',
    }}>
      <span style={{ fontSize: '0.8125rem', color: '#737373' }}>{label}</span>
      <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#171717' }}>{value}</span>
      {sub && <span style={{ fontSize: '0.75rem', color: '#a3a3a3' }}>{sub}</span>}
    </div>
  );
}

function formatStroops(stroops: string): string {
  const usdc = Number(BigInt(stroops)) / 1e7;
  return `$${usdc.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export default function HomePage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useFarmerStats();
  const { data: loans, isLoading: loansLoading } = useActiveLoans();

  const loading = statsLoading || loansLoading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '2rem 0 1rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 700, margin: '0 0 0.75rem', color: '#15803d' }}>
          Where tradition meets the blockchain
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#525252', maxWidth: '560px', margin: '0 auto 1.5rem' }}>
          Tokenize cattle, goats and sheep as RWAs on Soroban. Unlock USDC loans without a bank account.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <a href="/farmer/borrow" style={{
            background: '#22c55e', color: '#fff', padding: '0.625rem 1.5rem',
            borderRadius: '0.5rem', fontWeight: 600, textDecoration: 'none', fontSize: '0.9375rem',
          }}>
            Borrow USDC
          </a>
          <a href="/lender/deposit" style={{
            background: '#fff', color: '#15803d', padding: '0.625rem 1.5rem',
            borderRadius: '0.5rem', fontWeight: 600, textDecoration: 'none', fontSize: '0.9375rem',
            border: '1px solid #22c55e',
          }}>
            Earn 8% APR
          </a>
        </div>
      </section>

      {/* Live stats */}
      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#525252', marginBottom: '0.75rem' }}>
          Protocol stats
        </h2>
        {loading ? (
          <PoolStatsSkeleton />
        ) : statsError ? (
          <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>Failed to load stats. Is the backend running?</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <StatCard label="Total Value Locked" value={stats ? formatStroops(stats.tvl) : '—'} sub="USDC collateral" />
            <StatCard label="Active Loans" value={stats?.activeLoans.toString() ?? '—'} />
            <StatCard label="Registered Farmers" value={stats?.totalFarmers.toString() ?? '—'} />
            <StatCard label="Lender APY" value="8%" sub="Simple interest" />
            <StatCard label="Max LTV" value="60%" sub="Livestock collateral" />
          </div>
        )}
      </section>

      {/* Active loans table */}
      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#525252', marginBottom: '0.75rem' }}>
          Recent active loans
        </h2>
        {loansLoading ? (
          <p style={{ color: '#a3a3a3', fontSize: '0.875rem' }}>Loading…</p>
        ) : !loans?.length ? (
          <p style={{ color: '#a3a3a3', fontSize: '0.875rem' }}>No active loans yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e5e5', color: '#737373' }}>
                  {['Loan ID', 'Kraal', 'Principal (USDC)', 'LTV', 'Due', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loans.slice(0, 10).map(loan => (
                  <tr key={loan.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {loan.loanId.slice(0, 8)}…
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{loan.kraalId}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      ${(Number(BigInt(loan.principal)) / 1e7).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{(loan.ltvRatio / 100).toFixed(0)}%</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      {new Date(Number(loan.dueTimestamp) * 1000).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <span style={{
                        background: '#f0fdf4', color: '#15803d', borderRadius: '9999px',
                        padding: '0.125rem 0.5rem', fontSize: '0.75rem', fontWeight: 600,
                      }}>
                        {loan.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
