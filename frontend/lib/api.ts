import useSWR, { SWRConfiguration, mutate as globalMutate } from 'swr';

// ─── Base ─────────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sk_token') : null;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'API error');
  }
  return res.json() as Promise<T>;
}

const fetcher = <T>(url: string) => apiFetch<T>(url);

const swrDefaults: SWRConfiguration = {
  revalidateOnFocus: false,
  errorRetryCount: 3,
  errorRetryInterval: 2000,
};

// ─── Response interfaces ──────────────────────────────────────────────────────

export interface Farmer {
  id: string;
  address: string;
  name: string;
  region: string;
  createdAt: string;
}

export interface Animal {
  id: string;
  assetId: string;
  species: 'CATTLE' | 'GOAT' | 'SHEEP';
  name: string;
  weightKg: number;
  kraalId: string;
  verified: boolean;
  deceased: boolean;
  healthStatus: 'HEALTHY' | 'SICK' | 'CRITICAL' | 'DECEASED';
  farmerId: string;
}

export interface Loan {
  id: string;
  loanId: string;
  farmerId: string;
  animalId: string;
  principal: string;
  interestDue: string;
  collateralValue: string;
  ltvRatio: number;
  startTimestamp: string;
  dueTimestamp: string;
  kraalId: string;
  status: 'ACTIVE' | 'REPAID' | 'DEFAULTED' | 'LIQUIDATED' | 'GRACE_PERIOD';
  createdAt: string;
}

export interface LenderPortfolio {
  position: { address: string; balance: string };
  utilizationRate: number;
  lenderApy: number;
}

export interface PoolStats {
  total_deposited: string;
  total_borrowed: string;
  utilization_rate: number;
  lender_apy: number;
}

export interface OracleStatus {
  assetId: string;
  price: string;
  updatedAt: string;
  stale: boolean;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useFarmer(address: string | null) {
  return useSWR<Farmer>(address ? `/farmers/${address}` : null, fetcher, swrDefaults);
}

export function useFarmerLoans(address: string | null) {
  return useSWR<Loan[]>(address ? `/farmers/${address}/loans` : null, fetcher, swrDefaults);
}

export function useFarmerAnimals(address: string | null) {
  return useSWR<Animal[]>(address ? `/farmers/${address}/animals` : null, fetcher, swrDefaults);
}

export function useLoan(id: string | null) {
  return useSWR<Loan>(id ? `/loans/${id}` : null, fetcher, swrDefaults);
}

export function useActiveLoans() {
  return useSWR<Loan[]>('/loans/active', fetcher, swrDefaults);
}

export function useLiquidatableLoans() {
  return useSWR<Loan[]>('/loans/liquidatable', fetcher, swrDefaults);
}

export function useAnimal(id: string | null) {
  return useSWR<Animal>(id ? `/animals/${id}` : null, fetcher, swrDefaults);
}

export function useKraalAnimals(kraalId: string | null) {
  return useSWR<Animal[]>(kraalId ? `/animals/kraal/${kraalId}` : null, fetcher, swrDefaults);
}

export function useLenderPortfolio(address: string | null) {
  return useSWR<LenderPortfolio>(address ? `/lender/${address}/portfolio` : null, fetcher, swrDefaults);
}

export function useOracleStatus(assetId: string | null) {
  return useSWR<OracleStatus>(assetId ? `/oracle/status/${assetId}` : null, fetcher, {
    ...swrDefaults,
    refreshInterval: 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function registerFarmer(data: { address: string; name: string; region: string }) {
  return apiFetch<Farmer>('/farmers/register', { method: 'POST', body: JSON.stringify(data) });
}

export async function borrow(data: {
  farmerAddress: string;
  assetId: string;
  loanAmount: number;
  collateralValue: number;
  kraalId: string;
  durationDays: 30 | 60 | 90;
}) {
  return apiFetch<Loan>('/loans/borrow', { method: 'POST', body: JSON.stringify(data) });
}

/** Optimistic repayment: updates local cache before server confirms. */
export async function repay(loanId: string, amount: number, farmerAddress: string) {
  // Optimistic update
  await globalMutate(
    `/loans/${loanId}`,
    (current: Loan | undefined) =>
      current
        ? { ...current, principal: String(BigInt(current.principal) - BigInt(amount)) }
        : current,
    false,
  );
  await globalMutate(`/farmers/${farmerAddress}/loans`, undefined, false);

  const result = await apiFetch<Loan>(`/loans/${loanId}/repay`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });

  // Revalidate with real data
  await globalMutate(`/loans/${loanId}`);
  await globalMutate(`/farmers/${farmerAddress}/loans`);
  return result;
}

/** Optimistic deposit: updates portfolio cache immediately. */
export async function deposit(address: string, usdcAmount: number) {
  await globalMutate(
    `/lender/${address}/portfolio`,
    (current: LenderPortfolio | undefined) =>
      current
        ? { ...current, position: { ...current.position, balance: String(BigInt(current.position.balance) + BigInt(usdcAmount)) } }
        : current,
    false,
  );

  const result = await apiFetch('/lender/deposit', {
    method: 'POST',
    body: JSON.stringify({ address, usdcAmount }),
  });

  await globalMutate(`/lender/${address}/portfolio`);
  return result;
}

export async function withdraw(address: string, usdcAmount: number) {
  const result = await apiFetch('/lender/withdraw', {
    method: 'POST',
    body: JSON.stringify({ address, usdcAmount }),
  });
  await globalMutate(`/lender/${address}/portfolio`);
  return result;
}

export async function login(address: string, signature: string, role: string) {
  return apiFetch<{ token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ address, signature, role }),
  });
}
