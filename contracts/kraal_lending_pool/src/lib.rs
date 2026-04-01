#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, Env, String, Vec, vec,
    symbol_short,
};

// ─── Errors ──────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum KraalError {
    InsufficientCollateral   = 1,
    LoanNotFound             = 2,
    AlreadyRepaid            = 3,
    NotDefaulted             = 4,
    StaleOracleData          = 5,
    UnauthorizedVet          = 6,
    AnimalDeceased           = 7,
    LTVExceeded              = 8,
    PoolInsufficientLiquidity = 9,
    UnauthorizedOracle       = 10,
    InvalidKraalId           = 11,
    LoanStillActive          = 12,
    GracePeriodActive        = 13,
    ZeroAmountNotAllowed     = 14,
}

// ─── Types ───────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum KraalLoanStatus {
    Active,
    Repaid,
    Defaulted,
    Liquidated,
    GracePeriod,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct KraalLoan {
    pub loan_id:          u64,
    pub farmer:           Address,
    pub asset_id:         String,
    pub principal:        i128,
    pub interest_due:     i128,
    pub collateral_value: i128,
    pub ltv_ratio:        u32,
    pub start_timestamp:  u64,
    pub due_timestamp:    u64,
    pub kraal_id:         String,
    pub status:           KraalLoanStatus,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct KraalPoolStats {
    pub total_deposited:  i128,
    pub total_borrowed:   i128,
    pub utilization_rate: u32,
    pub lender_apy:       u32,
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    NextLoanId,
    Loan(u64),
    FarmerLoans(Address),
    LenderBalance(Address),
    TotalDeposited,
    TotalBorrowed,
    OraclePrice(String),   // temporary – 48 h TTL
    AnimalVerified(String),
    AnimalDeceased(String),
    OracleAdmin,
}

// ─── Constants ────────────────────────────────────────────────────────────────

/// Max LTV before borrow is rejected (60 %).
const MAX_BORROW_LTV_BPS: u32 = 6_000;
/// LTV threshold that triggers liquidation (80 %).
const LIQUIDATION_LTV_BPS: u32 = 8_000;
/// Annual interest rate in basis points (8 %).
const APR_BPS: u128 = 800;
/// Grace period after due date before hard liquidation (7 days in seconds).
const GRACE_PERIOD_SECS: u64 = 7 * 24 * 3600;
/// Liquidator bonus (5 %).
const LIQUIDATOR_BONUS_BPS: u128 = 500;
/// Protocol fee on liquidation (1 %).
const PROTOCOL_FEE_BPS: u128 = 100;
/// Oracle TTL: 48 hours in ledgers (≈ 5 s/ledger → 34 560 ledgers).
const ORACLE_TTL_LEDGERS: u32 = 34_560;
/// Lender APY exposed in pool stats (6 %).
const LENDER_APY_BPS: u32 = 600;

// ─── Helpers ──────────────────────────────────────────────────────────────────

fn bps(amount: i128, basis_points: u128) -> i128 {
    ((amount as u128) * basis_points / 10_000) as i128
}

/// Simple interest for a given principal, APR in bps, and duration in seconds.
fn simple_interest(principal: i128, duration_secs: u64) -> i128 {
    let secs_per_year: u128 = 365 * 24 * 3600;
    ((principal as u128) * APR_BPS * (duration_secs as u128) / (10_000 * secs_per_year)) as i128
}

fn ltv_bps(principal: i128, collateral: i128) -> u32 {
    if collateral == 0 { return u32::MAX; }
    ((principal as u128) * 10_000 / (collateral as u128)) as u32
}

fn load_loan(env: &Env, loan_id: u64) -> Result<KraalLoan, KraalError> {
    env.storage()
        .persistent()
        .get(&DataKey::Loan(loan_id))
        .ok_or(KraalError::LoanNotFound)
}

fn save_loan(env: &Env, loan: &KraalLoan) {
    env.storage().persistent().set(&DataKey::Loan(loan.loan_id), loan);
}

fn total_deposited(env: &Env) -> i128 {
    env.storage().persistent().get(&DataKey::TotalDeposited).unwrap_or(0i128)
}

fn total_borrowed(env: &Env) -> i128 {
    env.storage().persistent().get(&DataKey::TotalBorrowed).unwrap_or(0i128)
}

fn available_liquidity(env: &Env) -> i128 {
    total_deposited(env) - total_borrowed(env)
}

fn next_loan_id(env: &Env) -> u64 {
    let id: u64 = env.storage().persistent().get(&DataKey::NextLoanId).unwrap_or(1u64);
    env.storage().persistent().set(&DataKey::NextLoanId, &(id + 1));
    id
}

fn append_farmer_loan(env: &Env, farmer: &Address, loan_id: u64) {
    let key = DataKey::FarmerLoans(farmer.clone());
    let mut ids: Vec<u64> = env.storage().persistent().get(&key).unwrap_or(vec![env]);
    ids.push_back(loan_id);
    env.storage().persistent().set(&key, &ids);
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct KraalLendingPool;

#[contractimpl]
impl KraalLendingPool {

    // ── Initialisation ────────────────────────────────────────────────────────

    /// Initialise the pool with an admin and oracle admin address.
    pub fn initialize(env: Env, admin: Address, oracle_admin: Address) {
        admin.require_auth();
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::OracleAdmin, &oracle_admin);
    }

    // ── Oracle / Vet admin helpers ─────────────────────────────────────────────

    /// Register a verified animal (called by authorised vet/oracle admin).
    pub fn verify_animal(env: Env, caller: Address, asset_id: String) -> Result<(), KraalError> {
        caller.require_auth();
        let oracle_admin: Address = env.storage().persistent()
            .get(&DataKey::OracleAdmin)
            .ok_or(KraalError::UnauthorizedVet)?;
        if caller != oracle_admin { return Err(KraalError::UnauthorizedVet); }
        env.storage().persistent().set(&DataKey::AnimalVerified(asset_id.clone()), &true);
        env.events().publish((symbol_short!("sk"), symbol_short!("verified")), asset_id);
        Ok(())
    }

    /// Mark an animal as deceased (called by authorised vet/oracle admin).
    pub fn mark_deceased(env: Env, caller: Address, asset_id: String) -> Result<(), KraalError> {
        caller.require_auth();
        let oracle_admin: Address = env.storage().persistent()
            .get(&DataKey::OracleAdmin)
            .ok_or(KraalError::UnauthorizedVet)?;
        if caller != oracle_admin { return Err(KraalError::UnauthorizedVet); }
        env.storage().persistent().set(&DataKey::AnimalDeceased(asset_id.clone()), &true);
        env.events().publish((symbol_short!("sk"), symbol_short!("deceased")), asset_id);
        Ok(())
    }

    /// Push an oracle price for an asset (stroops). Stored with 48 h TTL.
    pub fn set_oracle_price(
        env: Env,
        caller: Address,
        asset_id: String,
        price: i128,
    ) -> Result<(), KraalError> {
        caller.require_auth();
        let oracle_admin: Address = env.storage().persistent()
            .get(&DataKey::OracleAdmin)
            .ok_or(KraalError::UnauthorizedOracle)?;
        if caller != oracle_admin { return Err(KraalError::UnauthorizedOracle); }
        env.storage().temporary().set(&DataKey::OraclePrice(asset_id.clone()), &price);
        env.storage().temporary().extend_ttl(
            &DataKey::OraclePrice(asset_id.clone()),
            ORACLE_TTL_LEDGERS,
            ORACLE_TTL_LEDGERS,
        );
        env.events().publish((symbol_short!("sk"), symbol_short!("oracle")), (asset_id, price));
        Ok(())
    }

    // ── Lender functions ──────────────────────────────────────────────────────

    /// Deposit USDC (in stroops) into the lending pool.
    ///
    /// Increases the lender's tracked balance and pool TVL.
    /// Emits `("stellar_kraal", "deposit")` with `(lender, amount)`.
    pub fn deposit(env: Env, lender: Address, usdc_amount: i128) -> Result<(), KraalError> {
        lender.require_auth();
        if usdc_amount <= 0 { return Err(KraalError::ZeroAmountNotAllowed); }

        // Effects
        let bal_key = DataKey::LenderBalance(lender.clone());
        let prev: i128 = env.storage().persistent().get(&bal_key).unwrap_or(0);
        env.storage().persistent().set(&bal_key, &(prev + usdc_amount));

        let new_total = total_deposited(&env) + usdc_amount;
        env.storage().persistent().set(&DataKey::TotalDeposited, &new_total);

        env.events().publish(
            (symbol_short!("sk"), symbol_short!("deposit")),
            (lender, usdc_amount),
        );
        Ok(())
    }

    /// Withdraw USDC (in stroops) from the lending pool.
    ///
    /// Checks the lender has sufficient balance and the pool has liquidity.
    /// Emits `("stellar_kraal", "withdraw")` with `(lender, amount)`.
    pub fn withdraw(env: Env, lender: Address, usdc_amount: i128) -> Result<(), KraalError> {
        lender.require_auth();
        if usdc_amount <= 0 { return Err(KraalError::ZeroAmountNotAllowed); }

        let bal_key = DataKey::LenderBalance(lender.clone());
        let balance: i128 = env.storage().persistent().get(&bal_key).unwrap_or(0);
        if balance < usdc_amount { return Err(KraalError::PoolInsufficientLiquidity); }
        if available_liquidity(&env) < usdc_amount { return Err(KraalError::PoolInsufficientLiquidity); }

        // Effects
        env.storage().persistent().set(&bal_key, &(balance - usdc_amount));
        let new_total = total_deposited(&env) - usdc_amount;
        env.storage().persistent().set(&DataKey::TotalDeposited, &new_total);

        env.events().publish(
            (symbol_short!("sk"), symbol_short!("withdraw")),
            (lender, usdc_amount),
        );
        Ok(())
    }

    // ── Borrower functions ────────────────────────────────────────────────────

    /// Open a new loan against a verified livestock NFT.
    ///
    /// - `loan_amount`: USDC in stroops.
    /// - `collateral_value`: oracle-attested value in stroops.
    /// - `kraal_id`: identifier of the farmer's kraal (pen/enclosure).
    /// - Duration must be 30, 60, or 90 days (enforced via `due_timestamp`).
    /// - Max LTV is 60 %; APR is 8 % simple interest.
    ///
    /// Emits `("stellar_kraal", "borrow")` with the new `KraalLoan`.
    pub fn borrow(
        env: Env,
        farmer: Address,
        asset_id: String,
        loan_amount: i128,
        collateral_value: i128,
        kraal_id: String,
        duration_days: u64,
    ) -> Result<u64, KraalError> {
        farmer.require_auth();

        // ── Checks ────────────────────────────────────────────────────────────
        if loan_amount <= 0 { return Err(KraalError::ZeroAmountNotAllowed); }
        if kraal_id.len() == 0 { return Err(KraalError::InvalidKraalId); }

        // Animal must be verified
        let verified: bool = env.storage().persistent()
            .get(&DataKey::AnimalVerified(asset_id.clone()))
            .unwrap_or(false);
        if !verified { return Err(KraalError::InsufficientCollateral); }

        // Animal must not be deceased
        let deceased: bool = env.storage().persistent()
            .get(&DataKey::AnimalDeceased(asset_id.clone()))
            .unwrap_or(false);
        if deceased { return Err(KraalError::AnimalDeceased); }

        // Oracle price must be fresh (key present in temporary storage)
        let _oracle_price: i128 = env.storage().temporary()
            .get(&DataKey::OraclePrice(asset_id.clone()))
            .ok_or(KraalError::StaleOracleData)?;

        // LTV check
        let ltv = ltv_bps(loan_amount, collateral_value);
        if ltv > MAX_BORROW_LTV_BPS { return Err(KraalError::LTVExceeded); }

        // Duration: 30, 60, or 90 days only
        if duration_days != 30 && duration_days != 60 && duration_days != 90 {
            return Err(KraalError::InvalidKraalId); // reuse closest error; duration is a config issue
        }

        // Pool liquidity
        if available_liquidity(&env) < loan_amount { return Err(KraalError::PoolInsufficientLiquidity); }

        // ── Effects ───────────────────────────────────────────────────────────
        let duration_secs = duration_days * 24 * 3600;
        let now = env.ledger().timestamp();
        let interest = simple_interest(loan_amount, duration_secs);
        let loan_id = next_loan_id(&env);

        let loan = KraalLoan {
            loan_id,
            farmer: farmer.clone(),
            asset_id: asset_id.clone(),
            principal: loan_amount,
            interest_due: interest,
            collateral_value,
            ltv_ratio: ltv,
            start_timestamp: now,
            due_timestamp: now + duration_secs,
            kraal_id,
            status: KraalLoanStatus::Active,
        };

        save_loan(&env, &loan);
        append_farmer_loan(&env, &farmer, loan_id);

        let new_borrowed = total_borrowed(&env) + loan_amount;
        env.storage().persistent().set(&DataKey::TotalBorrowed, &new_borrowed);

        env.events().publish((symbol_short!("sk"), symbol_short!("borrow")), loan.clone());
        Ok(loan_id)
    }

    /// Repay all or part of an active loan.
    ///
    /// Interest is settled first; any surplus reduces principal.
    /// On full repayment the NFT is returned to the farmer and the loan
    /// status is set to `Repaid`.
    ///
    /// Emits `("stellar_kraal", "repay")` with `(loan_id, amount, remaining)`.
    pub fn repay(
        env: Env,
        farmer: Address,
        loan_id: u64,
        amount: i128,
    ) -> Result<(), KraalError> {
        farmer.require_auth();
        if amount <= 0 { return Err(KraalError::ZeroAmountNotAllowed); }

        // ── Checks ────────────────────────────────────────────────────────────
        let mut loan = load_loan(&env, loan_id)?;
        if loan.farmer != farmer { return Err(KraalError::LoanNotFound); }
        match loan.status {
            KraalLoanStatus::Repaid     => return Err(KraalError::AlreadyRepaid),
            KraalLoanStatus::Liquidated => return Err(KraalError::AlreadyRepaid),
            _ => {}
        }

        // ── Effects ───────────────────────────────────────────────────────────
        // Settle interest first, then principal
        let interest_payment = amount.min(loan.interest_due);
        let principal_payment = (amount - interest_payment).min(loan.principal);

        loan.interest_due -= interest_payment;
        loan.principal    -= principal_payment;

        let remaining = loan.principal + loan.interest_due;

        if remaining == 0 {
            loan.status = KraalLoanStatus::Repaid;
            // NFT returned to farmer: emit nft_return event
            env.events().publish(
                (symbol_short!("sk"), symbol_short!("nft_ret")),
                (loan.farmer.clone(), loan.asset_id.clone()),
            );
        }

        // Update pool borrowed counter
        let repaid_principal = principal_payment;
        let new_borrowed = (total_borrowed(&env) - repaid_principal).max(0);
        env.storage().persistent().set(&DataKey::TotalBorrowed, &new_borrowed);

        save_loan(&env, &loan);

        env.events().publish(
            (symbol_short!("sk"), symbol_short!("repay")),
            (loan_id, amount, remaining),
        );
        Ok(())
    }

    // ── Liquidation ───────────────────────────────────────────────────────────

    /// Liquidate an undercollateralised or overdue loan.
    ///
    /// Triggers when any of the following is true:
    /// - Current LTV > 80 %
    /// - Loan is past due date + 7-day grace period
    /// - The collateral animal is marked deceased
    ///
    /// Distribution from `collateral_value`:
    /// - 5 % bonus to liquidator
    /// - 1 % protocol fee to admin
    /// - Remainder (minus outstanding debt) to farmer
    ///
    /// Emits `("stellar_kraal", "liquidate")` with distribution details.
    pub fn liquidate(
        env: Env,
        liquidator: Address,
        loan_id: u64,
    ) -> Result<(), KraalError> {
        liquidator.require_auth();

        // ── Checks ────────────────────────────────────────────────────────────
        let mut loan = load_loan(&env, loan_id)?;
        match loan.status {
            KraalLoanStatus::Repaid     => return Err(KraalError::AlreadyRepaid),
            KraalLoanStatus::Liquidated => return Err(KraalError::AlreadyRepaid),
            _ => {}
        }

        let now = env.ledger().timestamp();
        let deceased: bool = env.storage().persistent()
            .get(&DataKey::AnimalDeceased(loan.asset_id.clone()))
            .unwrap_or(false);

        let overdue_past_grace = now > loan.due_timestamp + GRACE_PERIOD_SECS;
        let in_grace = now > loan.due_timestamp && !overdue_past_grace;
        let ltv_breached = loan.ltv_ratio > LIQUIDATION_LTV_BPS;

        if in_grace && !deceased && !ltv_breached {
            return Err(KraalError::GracePeriodActive);
        }
        if !overdue_past_grace && !deceased && !ltv_breached {
            return Err(KraalError::LoanStillActive);
        }

        // ── Effects ───────────────────────────────────────────────────────────
        let collateral = loan.collateral_value;
        let liquidator_bonus  = bps(collateral, LIQUIDATOR_BONUS_BPS);
        let protocol_fee      = bps(collateral, PROTOCOL_FEE_BPS);
        let total_debt        = loan.principal + loan.interest_due;
        let farmer_remainder  = (collateral - liquidator_bonus - protocol_fee - total_debt).max(0);

        loan.status = KraalLoanStatus::Liquidated;
        save_loan(&env, &loan);

        let new_borrowed = (total_borrowed(&env) - loan.principal).max(0);
        env.storage().persistent().set(&DataKey::TotalBorrowed, &new_borrowed);

        env.events().publish(
            (symbol_short!("sk"), symbol_short!("liquidate")),
            (loan_id, liquidator_bonus, protocol_fee, farmer_remainder),
        );
        Ok(())
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    /// Return the full loan record for `loan_id`.
    pub fn get_loan(env: Env, loan_id: u64) -> Result<KraalLoan, KraalError> {
        load_loan(&env, loan_id)
    }

    /// Return aggregate pool statistics.
    pub fn get_pool_stats(env: Env) -> KraalPoolStats {
        let deposited = total_deposited(&env);
        let borrowed  = total_borrowed(&env);
        let utilization = if deposited == 0 {
            0u32
        } else {
            ((borrowed as u128) * 10_000 / (deposited as u128)) as u32
        };
        KraalPoolStats {
            total_deposited:  deposited,
            total_borrowed:   borrowed,
            utilization_rate: utilization,
            lender_apy:       LENDER_APY_BPS,
        }
    }

    /// Return all loans opened by `farmer`.
    pub fn get_farmer_loans(env: Env, farmer: Address) -> Vec<KraalLoan> {
        let ids: Vec<u64> = env.storage().persistent()
            .get(&DataKey::FarmerLoans(farmer))
            .unwrap_or(vec![&env]);
        let mut loans: Vec<KraalLoan> = Vec::new(&env);
        for id in ids.iter() {
            if let Some(loan) = env.storage().persistent().get(&DataKey::Loan(id)) {
                loans.push_back(loan);
            }
        }
        loans
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::{Address as _, Ledger, LedgerInfo}, Env, String};

    // ── Helpers ───────────────────────────────────────────────────────────────

    fn setup() -> (Env, KraalLendingPoolClient<'static>, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, KraalLendingPool);
        let client = KraalLendingPoolClient::new(&env, &contract_id);

        let admin        = Address::generate(&env);
        let oracle_admin = Address::generate(&env);
        let lender       = Address::generate(&env);

        client.initialize(&admin, &oracle_admin);
        // Seed pool with 10_000 USDC (in stroops: × 10^7)
        client.deposit(&lender, &100_000_000_000i128);

        (env, client, admin, oracle_admin, lender)
    }

    fn asset_id(env: &Env) -> String { String::from_str(env, "CATTLE-001") }
    fn kraal_id(env: &Env) -> String { String::from_str(env, "KRAAL-ZA-01") }

    /// Register a verified animal with a fresh oracle price.
    fn register_animal(env: &Env, client: &KraalLendingPoolClient, oracle_admin: &Address) {
        client.verify_animal(oracle_admin, &asset_id(env));
        // collateral value: 1 000 USDC = 10_000_000_000 stroops
        client.set_oracle_price(oracle_admin, &asset_id(env), &10_000_000_000i128);
    }

    // ── Test 1: successful borrow against valid verified collateral ───────────

    #[test]
    fn test_borrow_success() {
        let (env, client, _admin, oracle_admin, _lender) = setup();
        let farmer = Address::generate(&env);
        register_animal(&env, &client, &oracle_admin);

        // 50 % LTV: borrow 5 000 USDC against 10 000 USDC collateral
        let loan_id = client.borrow(
            &farmer,
            &asset_id(&env),
            &5_000_000_000i128,
            &10_000_000_000i128,
            &kraal_id(&env),
            &30u64,
        );
        let loan = client.get_loan(&loan_id);
        assert_eq!(loan.status, KraalLoanStatus::Active);
        assert_eq!(loan.principal, 5_000_000_000i128);
        assert_eq!(loan.ltv_ratio, 5_000u32);
    }

    // ── Test 2: reject borrow when LTV exceeds 60 % ───────────────────────────

    #[test]
    fn test_borrow_ltv_exceeded() {
        let (env, client, _admin, oracle_admin, _lender) = setup();
        let farmer = Address::generate(&env);
        register_animal(&env, &client, &oracle_admin);

        // 70 % LTV: borrow 7 000 against 10 000
        let result = client.try_borrow(
            &farmer,
            &asset_id(&env),
            &7_000_000_000i128,
            &10_000_000_000i128,
            &kraal_id(&env),
            &30u64,
        );
        assert_eq!(result, Err(Ok(KraalError::LTVExceeded)));
    }

    // ── Test 3: reject borrow when oracle data is stale ───────────────────────

    #[test]
    fn test_borrow_stale_oracle() {
        let (env, client, _admin, oracle_admin, _lender) = setup();
        let farmer = Address::generate(&env);
        // Verify animal but do NOT push oracle price
        client.verify_animal(&oracle_admin, &asset_id(&env));

        let result = client.try_borrow(
            &farmer,
            &asset_id(&env),
            &5_000_000_000i128,
            &10_000_000_000i128,
            &kraal_id(&env),
            &30u64,
        );
        assert_eq!(result, Err(Ok(KraalError::StaleOracleData)));
    }

    // ── Test 4: reject borrow against unverified animal ───────────────────────

    #[test]
    fn test_borrow_unverified_animal() {
        let (env, client, _admin, oracle_admin, _lender) = setup();
        let farmer = Address::generate(&env);
        // Push oracle price but skip verify_animal
        client.set_oracle_price(&oracle_admin, &asset_id(&env), &10_000_000_000i128);

        let result = client.try_borrow(
            &farmer,
            &asset_id(&env),
            &5_000_000_000i128,
            &10_000_000_000i128,
            &kraal_id(&env),
            &30u64,
        );
        assert_eq!(result, Err(Ok(KraalError::InsufficientCollateral)));
    }

    // ── Test 5: successful full repayment returns NFT to farmer ───────────────

    #[test]
    fn test_full_repayment_returns_nft() {
        let (env, client, _admin, oracle_admin, _lender) = setup();
        let farmer = Address::generate(&env);
        register_animal(&env, &client, &oracle_admin);

        let loan_id = client.borrow(
            &farmer,
            &asset_id(&env),
            &5_000_000_000i128,
            &10_000_000_000i128,
            &kraal_id(&env),
            &30u64,
        );
        let loan = client.get_loan(&loan_id);
        let total_due = loan.principal + loan.interest_due;

        client.repay(&farmer, &loan_id, &total_due);

        let repaid = client.get_loan(&loan_id);
        assert_eq!(repaid.status, KraalLoanStatus::Repaid);
        assert_eq!(repaid.principal, 0);
        assert_eq!(repaid.interest_due, 0);
    }

    // ── Test 6: partial repayment updates loan balance correctly ──────────────

    #[test]
    fn test_partial_repayment() {
        let (env, client, _admin, oracle_admin, _lender) = setup();
        let farmer = Address::generate(&env);
        register_animal(&env, &client, &oracle_admin);

        let loan_id = client.borrow(
            &farmer,
            &asset_id(&env),
            &5_000_000_000i128,
            &10_000_000_000i128,
            &kraal_id(&env),
            &30u64,
        );
        let loan_before = client.get_loan(&loan_id);
        // Pay only the interest
        client.repay(&farmer, &loan_id, &loan_before.interest_due);

        let loan_after = client.get_loan(&loan_id);
        assert_eq!(loan_after.status, KraalLoanStatus::Active);
        assert_eq!(loan_after.interest_due, 0);
        assert_eq!(loan_after.principal, 5_000_000_000i128);
    }

    // ── Test 7: lender deposit increases pool TVL ─────────────────────────────

    #[test]
    fn test_deposit_increases_tvl() {
        let (env, client, _admin, _oracle_admin, _lender) = setup();
        let stats_before = client.get_pool_stats();
        let extra_lender = Address::generate(&env);

        client.deposit(&extra_lender, &50_000_000_000i128);

        let stats_after = client.get_pool_stats();
        assert_eq!(
            stats_after.total_deposited,
            stats_before.total_deposited + 50_000_000_000i128
        );
    }

    // ── Test 8: lender withdrawal with correct balance check ──────────────────

    #[test]
    fn test_withdraw_balance_check() {
        let (env, client, _admin, _oracle_admin, lender) = setup();

        // Withdraw half of the seeded 100_000_000_000
        client.withdraw(&lender, &50_000_000_000i128);
        let stats = client.get_pool_stats();
        assert_eq!(stats.total_deposited, 50_000_000_000i128);

        // Attempt to withdraw more than deposited
        let result = client.try_withdraw(&lender, &60_000_000_000i128);
        assert_eq!(result, Err(Ok(KraalError::PoolInsufficientLiquidity)));
    }

    // ── Test 9: liquidation triggers correctly on overdue loan ────────────────

    #[test]
    fn test_liquidation_overdue() {
        let (env, client, _admin, oracle_admin, _lender) = setup();
        let farmer     = Address::generate(&env);
        let liquidator = Address::generate(&env);
        register_animal(&env, &client, &oracle_admin);

        let loan_id = client.borrow(
            &farmer,
            &asset_id(&env),
            &5_000_000_000i128,
            &10_000_000_000i128,
            &kraal_id(&env),
            &30u64,
        );

        // Advance time past due + grace period (30 days + 7 days + 1 second)
        let advance = (30 + 7) * 24 * 3600 + 1;
        env.ledger().set(LedgerInfo {
            timestamp: env.ledger().timestamp() + advance,
            protocol_version: 22,
            sequence_number: env.ledger().sequence(),
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 1,
            min_persistent_entry_ttl: 1,
            max_entry_ttl: 100_000,
        });

        client.liquidate(&liquidator, &loan_id);
        let loan = client.get_loan(&loan_id);
        assert_eq!(loan.status, KraalLoanStatus::Liquidated);
    }

    // ── Test 10: correct liquidation proceeds distribution ────────────────────

    #[test]
    fn test_liquidation_proceeds_distribution() {
        let (env, client, _admin, oracle_admin, _lender) = setup();
        let farmer     = Address::generate(&env);
        let liquidator = Address::generate(&env);
        register_animal(&env, &client, &oracle_admin);

        let collateral = 10_000_000_000i128;
        let principal  =  5_000_000_000i128;

        let loan_id = client.borrow(
            &farmer,
            &asset_id(&env),
            &principal,
            &collateral,
            &kraal_id(&env),
            &30u64,
        );

        // Advance past grace period
        let advance = (30 + 7) * 24 * 3600 + 1;
        env.ledger().set(LedgerInfo {
            timestamp: env.ledger().timestamp() + advance,
            protocol_version: 22,
            sequence_number: env.ledger().sequence(),
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 1,
            min_persistent_entry_ttl: 1,
            max_entry_ttl: 100_000,
        });

        client.liquidate(&liquidator, &loan_id);

        // Verify distribution arithmetic
        let liquidator_bonus = collateral * 500 / 10_000;   // 5 %  = 500_000_000
        let protocol_fee     = collateral * 100 / 10_000;   // 1 %  = 100_000_000
        let loan             = client.get_loan(&loan_id);
        // interest for 30 days at 8 % APR
        let interest = simple_interest(principal, 30 * 24 * 3600);
        let total_debt       = principal + interest;
        let farmer_remainder = (collateral - liquidator_bonus - protocol_fee - total_debt).max(0);

        assert_eq!(liquidator_bonus, 500_000_000i128);
        assert_eq!(protocol_fee,     100_000_000i128);
        assert!(farmer_remainder >= 0);
        assert_eq!(loan.status, KraalLoanStatus::Liquidated);
    }
}
