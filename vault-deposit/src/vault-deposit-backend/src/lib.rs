use candid::types::number::Nat;
use candid::{CandidType, Deserialize, Principal};
use icrc_ledger_types::icrc1::account::Account;
use icrc_ledger_types::icrc1::transfer::{BlockIndex, NumTokens};
use icrc_ledger_types::icrc2::transfer_from::{TransferFromArgs, TransferFromError};
use std::cell::RefCell;
use std::collections::BTreeSet;

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct DepositInfo {
    pub nonce: u128,
    pub depositor: Principal,
    pub token: Principal,
    pub amount: Nat,
    pub timestamp: u128,
    pub destination: String,
    pub deposit_id: String,
}

thread_local! {
    static OWNER: RefCell<Principal> =  const { RefCell::new(Principal::anonymous()) };
    static ADMIN: RefCell<Principal> =  const { RefCell::new(Principal::anonymous()) };
    static FUND_RECEIVER: RefCell<Principal> =  const { RefCell::new(Principal::anonymous()) };
    static WHITELIST_TOKEN: RefCell<BTreeSet<Principal>> = RefCell::default();
    static DEPOSIT_INFOS: RefCell<Vec<DepositInfo>> = RefCell::default();
    static DEPOSIT_COUNTER: RefCell<u128> = const { RefCell::new(0u128) };
}

#[ic_cdk::init]
fn init(init_owner: Principal, init_admin: Principal, init_fund_receiver: Principal) {
    OWNER.with(|owner| {
        *owner.borrow_mut() = init_owner;
    });

    FUND_RECEIVER.with(|fund_receiver| {
        *fund_receiver.borrow_mut() = init_fund_receiver;
    });

    ADMIN.with(|admin| {
        *admin.borrow_mut() = init_admin;
    });

    // add ICP token to whitelist
    let icp_token = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai")
        .expect("Could not decode the principal.");
    WHITELIST_TOKEN.with(|whitelist_token| whitelist_token.borrow_mut().insert(icp_token));
}

#[ic_cdk::update]
pub fn add_token_to_whitelist(token: Principal) {
    assert!(
        ic_cdk::caller() == ADMIN.with(|admin| { *admin.borrow() }),
        "Not admin"
    );
    assert!(
        !WHITELIST_TOKEN
            .with(|whitelist_token| { whitelist_token.borrow_mut().contains(&token.clone()) }),
        "Token already in whitelist"
    );
    WHITELIST_TOKEN.with(|whitelist_token| whitelist_token.borrow_mut().insert(token));
}

#[ic_cdk::update]
pub fn remove_token_from_whitelist(token: Principal) {
    assert!(
        ic_cdk::caller() == ADMIN.with(|admin| { *admin.borrow() }),
        "Not admin"
    );
    assert!(
        WHITELIST_TOKEN
            .with(|whitelist_token| { whitelist_token.borrow_mut().contains(&token.clone()) }),
        "Token not in whitelist"
    );
    WHITELIST_TOKEN.with(|whitelist_token| whitelist_token.borrow_mut().insert(token));
}

#[ic_cdk::update]
pub fn set_admin(new_admin: Principal) {
    OWNER.with(|owner| {
        assert!(ic_cdk::caller() == *owner.borrow(), "Not owner");
    });

    ADMIN.with(|admin| {
        *admin.borrow_mut() = new_admin;
    });
}

#[ic_cdk::update]
pub fn set_fund_receiver(new_fund_receiver: Principal) {
    OWNER.with(|owner| {
        assert!(ic_cdk::caller() == *owner.borrow(), "Not owner");
    });

    FUND_RECEIVER.with(|fund_receiver| {
        *fund_receiver.borrow_mut() = new_fund_receiver;
    });
}

#[ic_cdk::update]
pub fn change_owner(new_owner: Principal) {
    OWNER.with(|owner| {
        assert!(ic_cdk::caller() == *owner.borrow(), "Not owner");
        *owner.borrow_mut() = new_owner;
    });
}

#[ic_cdk::update]
async fn deposit_token(
    amount: NumTokens,
    token: Principal,
    destination: String,
    deposit_id: String,
) -> Result<BlockIndex, String> {
    assert!(
        WHITELIST_TOKEN
            .with(|whitelist_token| { whitelist_token.borrow_mut().contains(&token.clone()) }),
        "Token not in whitelist"
    );

    let transfer_from_args = TransferFromArgs {
        from: Account::from(ic_cdk::caller()),
        memo: None,
        amount: amount.clone(),
        spender_subaccount: None,
        fee: None, // if not specified, the default fee for the canister is used
        to: Account {
            owner: FUND_RECEIVER.with(|f| *f.borrow()),
            subaccount: None,
        },
        created_at_time: None,
    };

    let result = ic_cdk::call::<(TransferFromArgs,), (Result<BlockIndex, TransferFromError>,)>(
        token,
        "icrc2_transfer_from",
        (transfer_from_args,),
    )
    .await
    .map_err(|e| format!("failed to call ledger: {:?}", e))?
    .0
    .map_err(|e| format!("ledger transfer error {:?}", e));

    result.as_ref()?;

    let nonce = DEPOSIT_COUNTER.with(|deposit_counter| *deposit_counter.borrow_mut());

    let deposit_info = DepositInfo {
        nonce,
        depositor: ic_cdk::caller(),
        token,
        amount: amount.clone(),
        timestamp: (ic_cdk::api::time() / 1000000000u64).into(),
        destination: destination.clone(),
        deposit_id: deposit_id.clone(),
    };

    DEPOSIT_INFOS.with(|deposit_infos| {
        deposit_infos.borrow_mut().push(deposit_info);
    });

    DEPOSIT_COUNTER.with(|deposit_counter| *deposit_counter.borrow_mut() += 1);

    result
}

#[ic_cdk::query]
pub fn get_deposit_info_by_nonce(from_nonce: u128, limit: u128) -> Vec<DepositInfo> {
    DEPOSIT_INFOS.with(|deposit_infos| {
        deposit_infos
            .borrow_mut()
            .iter()
            .skip(from_nonce as usize)
            .take(limit as usize)
            .cloned()
            .collect()
    })
}

#[ic_cdk::query]
pub fn get_deposit_counter() -> u128 {
    DEPOSIT_COUNTER.with(|deposit_counter| *deposit_counter.borrow())
}

#[ic_cdk::query]
pub fn get_whitelist() -> Vec<Principal> {
    WHITELIST_TOKEN.with(|whitelist_token| whitelist_token.borrow().iter().cloned().collect())
}

#[ic_cdk::query]
pub fn get_owner() -> Principal {
    OWNER.with(|owner| *owner.borrow())
}

#[ic_cdk::query]
pub fn get_admin() -> Principal {
    ADMIN.with(|admin| *admin.borrow())
}

#[ic_cdk::query]
pub fn get_fund_receiver() -> Principal {
    FUND_RECEIVER.with(|fund_receiver| *fund_receiver.borrow())
}

// Enable Candid export (see https://internetcomputer.org/docs/current/developer-docs/backend/rust/generating-candid)
ic_cdk::export_candid!();
