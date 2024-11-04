use candid::types::number::Nat;
use candid::{CandidType, Deserialize, Principal};
use icrc_ledger_types::icrc1::account::Account;
use icrc_ledger_types::icrc1::transfer::{BlockIndex, NumTokens, TransferArg, TransferError};
use std::cell::RefCell;
use std::collections::BTreeSet;

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct WithdrawInfo {
    pub nonce: u128,
    pub recipient: Principal,
    pub token: Principal,
    pub amount: Nat,
    pub timestamp: u128,
}

thread_local! {
    static OWNER: RefCell<Principal> =  RefCell::new(Principal::anonymous());
    static ADMIN: RefCell<Principal> =  RefCell::new(Principal::anonymous());
    static WITHDRAW_INFOS: RefCell<Vec<WithdrawInfo>> = RefCell::default();
    static WITHDRAW_COUNTER: RefCell<u128> = RefCell::new(0u128);
    static REQUEST_DATAS: RefCell<BTreeSet<String>> = RefCell::default();
}

#[ic_cdk::init]
fn init(init_owner: Principal, init_admin: Principal) {
    OWNER.with(|owner| {
        *owner.borrow_mut() = init_owner;
    });

    ADMIN.with(|admin| {
        *admin.borrow_mut() = init_admin;
    });
}

#[ic_cdk::update]
pub fn set_admin(new_admin: Principal) {
    OWNER.with(|owner| {
        let var_name = assert!(ic_cdk::caller() == owner.borrow().clone(), "Not owner");
    });

    ADMIN.with(|admin| {
        *admin.borrow_mut() = new_admin;
    });
}

#[ic_cdk::update]
pub fn change_owner(new_owner: Principal) {
    OWNER.with(|owner| {
        assert!(ic_cdk::caller() == owner.borrow().clone(), "Not owner");
        *owner.borrow_mut() = new_owner;
    });
}

#[ic_cdk::update]
async fn withdraw_token(
    amount: NumTokens,
    token: Principal,
    recipient: Principal,
    request_data: String,
) -> Result<BlockIndex, String> {
    assert!(amount > 0u128, "Invalid amount");

    ADMIN.with(|admin| {
        assert!(ic_cdk::caller() == admin.borrow().clone(), "Not admin");
    });

    REQUEST_DATAS.with(|request_datas| {
        let is_contain = request_datas.borrow_mut().contains(&request_data);
        assert!(!is_contain, "request data already used");
    });

    let transfer_args = TransferArg {
        from_subaccount: None,
        memo: None,
        amount: amount.clone(),
        fee: None, // if not specified, the default fee for the canister is used
        to: Account {
            owner: recipient.clone(),
            subaccount: None,
        },
        created_at_time: None,
    };

    let result = ic_cdk::call::<(TransferArg,), (Result<BlockIndex, TransferError>,)>(
        token,
        "icrc1_transfer",
        (transfer_args,),
    )
    .await
    .map_err(|e| format!("failed to call ledger: {:?}", e))?
    .0
    .map_err(|e| format!("ledger transfer error {:?}", e));

    if result.is_err() {
        return result;
    }

    let nonce = WITHDRAW_COUNTER.with(|withdraw_counter| withdraw_counter.borrow_mut().clone());

    let withdraw_info = WithdrawInfo {
        nonce: nonce,
        recipient: recipient.clone(),
        token: token,
        amount: Nat::from(amount.clone()),
        timestamp: 0,
    };

    REQUEST_DATAS.with(|request_datas| {
        request_datas.borrow_mut().insert(request_data);
    });

    WITHDRAW_INFOS.with(|withdraw_infos| {
        withdraw_infos.borrow_mut().push(withdraw_info);
    });

    WITHDRAW_COUNTER.with(|withdraw_counter| *withdraw_counter.borrow_mut() += 1);

    result
}

#[ic_cdk::query]
pub fn get_withdraw_info_by_nonce(from_nonce: u128, limit: u128) -> Vec<WithdrawInfo> {
    WITHDRAW_INFOS.with(|withdraw_infos| {
        withdraw_infos
            .borrow_mut()
            .iter()
            .skip(from_nonce as usize)
            .take(limit as usize)
            .cloned()
            .collect()
    })
}

#[ic_cdk::query]
pub fn get_withdraw_counter() -> u128 {
    WITHDRAW_COUNTER.with(|withdraw_counter| withdraw_counter.borrow().clone())
}

#[ic_cdk::query]
pub fn get_owner() -> Principal {
    OWNER.with(|owner| owner.borrow().clone())
}

#[ic_cdk::query]
pub fn get_admin() -> Principal {
    ADMIN.with(|admin| admin.borrow().clone())
}
// Enable Candid export (see https://internetcomputer.org/docs/current/developer-docs/backend/rust/generating-candid)
ic_cdk::export_candid!();
