// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
use candid::{CandidType, Deserialize, Principal};
use std::cell::RefCell;
use std::collections::HashMap;

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Syllabus {
    pub syllabus_id: u64,
    pub name: String,
    pub description: String,
}

#[derive(Default)]
pub struct MedooSyllabusNFT {
    pub nonces: HashMap<String, u64>, // Tracks nonces for each user to prevent replay attacks
    pub syllabuses: HashMap<u64, Syllabus>, // syllabusId => syllabus
    pub admin: String,
}

// Define NFT struct to hold NFT information
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct NFT {
    token_id: u64,
    syllabus: Syllabus,
}

thread_local! {
    static OWNER: RefCell<Principal> =  const { RefCell::new(Principal::anonymous()) };
    static ADMIN: RefCell<Principal> =  const { RefCell::new(Principal::anonymous()) };
    static NFTS: RefCell<HashMap<u64, NFT>> = RefCell::new(HashMap::new());
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

/**
 * Change admin address, only owner has permission.
 *
 * @param receivers array addresses of receiver of new Token.
 * @param syllabus_lists array syllabus data.
 */
#[ic_cdk::update]
pub fn mint_new_tokens(
    receivers: Vec<String>,
    syllabus_lists: Vec<Syllabus>,
) -> Result<u64, String> {
    assert!(
        receivers.len() == syllabus_lists.len() && !receivers.is_empty(),
        "Invalid array length"
    );
    assert!(receivers.len() <= 100, "Mint too many tokens");

    // Check if the NFT already exists to avoid duplicates
    NFTS.with(|nfts| {
        let mut nfts = nfts.borrow_mut(); // Mutably borrow the nfts HashMap

        for (i, receiver) in receivers.iter().enumerate() {
            let syllabus = syllabus_lists[i].clone();
            let token_id = syllabus.syllabus_id;

            if nfts.contains_key(&token_id) {
                return Err("NFT with this token ID already exists.".to_string());
            }

            let nft = NFT { token_id, syllabus };

            nfts.insert(token_id, nft); // Insert the new NFT
        }

        Ok(()) // Return Ok(()) after inserting
    })?;

    Ok(receivers.len() as u64)
}

#[ic_cdk::query]
pub fn get_syllabus_data_by_id(syllabus_id: u64) -> Option<NFT> {
    NFTS.with(|nfts| {
        let nfts_ref = nfts.borrow(); // Borrow immutable reference to the HashMap
        nfts_ref.get(&syllabus_id).cloned() // Return cloned NFT if found
    })
}
