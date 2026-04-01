'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { parseWalletError } from '../lib/wallet-errors';
import { login } from '../lib/api';

interface WalletState {
  address: string | null;
  role: 'farmer' | 'lender' | 'vet' | 'admin' | null;
  connecting: boolean;
  error: string | null;
  connect: (role?: WalletState['role']) => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [role, setRole] = useState<WalletState['role']>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sk_address');
    const savedRole = localStorage.getItem('sk_role') as WalletState['role'];
    if (saved) { setAddress(saved); setRole(savedRole); }
  }, []);

  const connect = useCallback(async (selectedRole: WalletState['role'] = 'farmer') => {
    setConnecting(true);
    setError(null);
    try {
      // @ts-expect-error freighter injected global
      const freighter = window.freighter ?? window.freighterApi;
      if (!freighter) throw new Error('Freighter not installed');

      const { isConnected } = await freighter.isConnected();
      if (!isConnected) throw new Error('Freighter not installed');

      const { address: addr } = await freighter.getAddress();
      const { networkPassphrase } = await freighter.getNetwork();

      const isMainnet = networkPassphrase === 'Public Global Stellar Network ; September 2015';
      const isTestnet = networkPassphrase === 'Test SDF Network ; September 2015';
      if (!isMainnet && !isTestnet) throw new Error('Wrong network selected');

      // Sign a challenge string to prove key ownership
      const challenge = `stellarkraal-login-${Date.now()}`;
      const { signedMessage } = await freighter.signMessage(challenge, { address: addr });

      const { token } = await login(addr, signedMessage, selectedRole ?? 'farmer');
      localStorage.setItem('sk_token', token);
      localStorage.setItem('sk_address', addr);
      localStorage.setItem('sk_role', selectedRole ?? 'farmer');

      setAddress(addr);
      setRole(selectedRole);
    } catch (err) {
      const parsed = parseWalletError(err);
      setError(parsed.message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem('sk_token');
    localStorage.removeItem('sk_address');
    localStorage.removeItem('sk_role');
    setAddress(null);
    setRole(null);
  }, []);

  return (
    <WalletContext.Provider value={{ address, role, connecting, error, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}

export function WalletConnect() {
  const { address, role, connecting, error, connect, disconnect } = useWallet();

  if (address) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{
          background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '9999px',
          padding: '0.25rem 0.75rem', fontSize: '0.75rem', color: '#15803d', fontWeight: 600,
        }}>
          {role}
        </span>
        <span style={{
          fontFamily: 'monospace', fontSize: '0.8125rem', color: '#374151',
          background: '#f5f5f5', borderRadius: '0.375rem', padding: '0.25rem 0.5rem',
        }}>
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <button
          onClick={disconnect}
          style={{
            background: 'none', border: '1px solid #d4d4d4', borderRadius: '0.375rem',
            padding: '0.25rem 0.625rem', fontSize: '0.75rem', cursor: 'pointer', color: '#525252',
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
      <button
        onClick={() => connect('farmer')}
        disabled={connecting}
        style={{
          background: '#22c55e', color: '#fff', border: 'none', borderRadius: '0.5rem',
          padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 600,
          cursor: connecting ? 'not-allowed' : 'pointer', opacity: connecting ? 0.7 : 1,
        }}
      >
        {connecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
      {error && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{error}</span>}
    </div>
  );
}
