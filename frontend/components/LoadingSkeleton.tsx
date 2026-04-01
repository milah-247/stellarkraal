'use client';

import React from 'react';

// ─── Base pulse animation ─────────────────────────────────────────────────────

const pulse: React.CSSProperties = {
  background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
  backgroundSize: '200% 100%',
  animation: 'sk-pulse 1.5s ease-in-out infinite',
  borderRadius: '0.375rem',
};

function Block({ w, h, style }: { w: string | number; h: string | number; style?: React.CSSProperties }) {
  return <div style={{ width: w, height: h, ...pulse, ...style }} aria-hidden="true" />;
}

// ─── KraalCard skeleton ───────────────────────────────────────────────────────

export function KraalCardSkeleton() {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <Block w={48} h={48} style={{ borderRadius: '50%' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Block w="60%" h={16} />
          <Block w="40%" h={12} />
        </div>
      </div>
      <Block w="100%" h={12} />
      <Block w="80%" h={12} />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Block w="50%" h={32} style={{ borderRadius: '0.375rem' }} />
        <Block w="50%" h={32} style={{ borderRadius: '0.375rem' }} />
      </div>
    </div>
  );
}

// ─── LoanCard skeleton ────────────────────────────────────────────────────────

export function LoanCardSkeleton() {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Block w="30%" h={16} />
        <Block w={64} h={24} style={{ borderRadius: '9999px' }} />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Block w="35%" h={12} />
          <Block w="25%" h={12} />
        </div>
      ))}
      <Block w="100%" h={8} style={{ borderRadius: '9999px' }} />
      <Block w="100%" h={36} style={{ borderRadius: '0.375rem' }} />
    </div>
  );
}

// ─── PoolStats skeleton ───────────────────────────────────────────────────────

export function PoolStatsSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Block w="60%" h={12} />
          <Block w="80%" h={28} />
          <Block w="40%" h={10} />
        </div>
      ))}
    </div>
  );
}

// ─── MarketplaceItem skeleton ─────────────────────────────────────────────────

export function MarketplaceItemSkeleton() {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <Block w="100%" h={160} style={{ borderRadius: 0 }} />
      <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Block w="70%" h={16} />
        <Block w="50%" h={12} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
          <Block w="40%" h={20} />
          <Block w="30%" h={20} />
        </div>
      </div>
    </div>
  );
}

// ─── Style injection ──────────────────────────────────────────────────────────

export function SkeletonStyles() {
  return (
    <style>{`
      @keyframes sk-pulse {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  );
}
