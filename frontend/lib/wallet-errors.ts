export type WalletErrorCode =
  | 'WALLET_NOT_INSTALLED'
  | 'WRONG_NETWORK'
  | 'TRANSACTION_REJECTED'
  | 'INSUFFICIENT_XLM'
  | 'ACCOUNT_NOT_ACTIVATED'
  | 'UNKNOWN';

export interface WalletError {
  code: WalletErrorCode;
  message: string;
  detail: string;
  recoveryAction: string;
}

const WALLET_ERRORS: Record<WalletErrorCode, Omit<WalletError, 'code'>> = {
  WALLET_NOT_INSTALLED: {
    message: 'Stellar wallet not found',
    detail: 'No Stellar wallet extension was detected in your browser.',
    recoveryAction: 'Install Freighter or Lobstr wallet and refresh the page.',
  },
  WRONG_NETWORK: {
    message: 'Wrong network selected',
    detail: 'Your wallet is connected to a different Stellar network.',
    recoveryAction: 'Switch your wallet to Stellar Mainnet and try again.',
  },
  TRANSACTION_REJECTED: {
    message: 'Transaction rejected',
    detail: 'You declined the transaction in your wallet.',
    recoveryAction: 'Approve the transaction in your wallet to continue.',
  },
  INSUFFICIENT_XLM: {
    message: 'Insufficient XLM for fees',
    detail: 'Your account does not have enough XLM to cover the network fee.',
    recoveryAction: 'Add at least 1 XLM to your account and try again.',
  },
  ACCOUNT_NOT_ACTIVATED: {
    message: 'Account not activated',
    detail: 'Your Stellar account has not been funded and activated on the network.',
    recoveryAction: 'Send at least 1 XLM to your address to activate the account.',
  },
  UNKNOWN: {
    message: 'Unexpected wallet error',
    detail: 'An unknown error occurred while communicating with your wallet.',
    recoveryAction: 'Refresh the page and try again. If the problem persists, contact support.',
  },
};

/** Map a raw error thrown by a Stellar wallet SDK to a structured WalletError. */
export function parseWalletError(err: unknown): WalletError {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();

  let code: WalletErrorCode = 'UNKNOWN';

  if (msg.includes('not installed') || msg.includes('freighter') || msg.includes('no wallet')) {
    code = 'WALLET_NOT_INSTALLED';
  } else if (msg.includes('network') || msg.includes('testnet') || msg.includes('wrong network')) {
    code = 'WRONG_NETWORK';
  } else if (msg.includes('rejected') || msg.includes('declined') || msg.includes('user denied')) {
    code = 'TRANSACTION_REJECTED';
  } else if (msg.includes('insufficient') || msg.includes('fee') || msg.includes('xlm')) {
    code = 'INSUFFICIENT_XLM';
  } else if (msg.includes('not activated') || msg.includes('account not found') || msg.includes('no account')) {
    code = 'ACCOUNT_NOT_ACTIVATED';
  }

  return { code, ...WALLET_ERRORS[code] };
}

/** Returns true if the error is a user-initiated rejection (no retry needed). */
export function isUserRejection(err: WalletError): boolean {
  return err.code === 'TRANSACTION_REJECTED';
}
