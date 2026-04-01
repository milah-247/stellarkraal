import type { Metadata } from 'next';
import { WalletProvider, WalletConnect } from '../components/WalletConnect';
import { ToastProvider } from '../components/Toast';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SkeletonStyles } from '../components/LoadingSkeleton';

export const metadata: Metadata = {
  title: 'StellarKraal — Livestock-backed micro lending on Stellar',
  description: 'Tokenize cattle, goats and sheep as RWAs on Soroban and unlock USDC loans without a bank account.',
};

const NAV_LINKS = [
  { href: '/',                  label: 'Home' },
  { href: '/farmer/borrow',     label: 'Borrow' },
  { href: '/farmer/loans',      label: 'My Loans' },
  { href: '/lender/deposit',    label: 'Lend' },
  { href: '/lender/portfolio',  label: 'Portfolio' },
  { href: '/vet/verify',        label: 'Vet Portal' },
  { href: '/market',            label: 'Marketplace' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Inter, system-ui, sans-serif', background: '#fafafa', color: '#171717' }}>
        <SkeletonStyles />
        <WalletProvider>
          <ToastProvider>
            {/* Nav */}
            <header style={{
              position: 'sticky', top: 0, zIndex: 100,
              background: '#fff', borderBottom: '1px solid #e5e5e5',
              padding: '0 1.5rem', height: '56px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <a href="/" style={{ fontWeight: 700, fontSize: '1.125rem', color: '#15803d', textDecoration: 'none' }}>
                🐄 StellarKraal
              </a>
              <nav style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                {NAV_LINKS.map(l => (
                  <a key={l.href} href={l.href} style={{ fontSize: '0.875rem', color: '#525252', textDecoration: 'none' }}>
                    {l.label}
                  </a>
                ))}
              </nav>
              <WalletConnect />
            </header>

            {/* Page */}
            <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </main>
          </ToastProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
