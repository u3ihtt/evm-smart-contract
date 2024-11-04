use candid::{CandidType, Deserialize, Principal};
use std::cell::RefCell;
use std::collections::HashMap;

// Define VideoMetadata
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct VideoMetadata {
    url: String,
    duration: u64,
    play_start_at: u64,
    play_end_at: u64,
    questions: Vec<String>,
}

// Define FileMetadata
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct FileMetadata {
    is_image: bool,
    original_name: String,
    url: String,
    file_type: String,
    size: u64,
}

// Define AudioMetadata
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AudioMetadata {
    url: String,
    duration: u64,
    play_start_at: u64,
    play_end_at: u64,
    questions: Vec<String>,
}

// Define MetaData for SCORM content
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct MetaData {
    scorm: String,
}

// Define SCORMMetadata struct
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SCORMMetadata {
    media_id: String,
    url: String,
    meta: MetaData,
}

// Define MetadataLanguage to hold language-specific data
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct MetadataLanguage<T> {
    vn: T,
    en: T,
}

// Define an enum to represent different types of metadata content
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum MetadataContent {
    Video(VideoMetadata),
    File(FileMetadata),
    Audio(AudioMetadata),
    SCORM(SCORMMetadata), // Add SCORM metadata variant
}

// Define Course struct that encapsulates all metadata types
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Course {
    course_id: u64,
    name: MetadataLanguage<String>,        // language -> name
    description: MetadataLanguage<String>, // language -> description
    slug: String,
    study_type: String,
    avatar_url: String,
    expectations_and_goals: MetadataLanguage<String>, // language -> expectations and goals
    syllabus_id: u64,
    metadata: MetadataLanguage<MetadataContent>, // language -> metadata content (Video/File/Audio/SCORM)
}

// Define NFT struct to hold NFT information
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct NFT {
    token_id: u64,
    course: Course,
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

#[ic_cdk::update]
fn mint_nft(course: Course) -> Result<u64, String> {
    // Use course.course_id as the token_id
    let token_id = course.course_id;

    // Check if the NFT already exists to avoid duplicates
    NFTS.with(|nfts| {
        let mut nfts = nfts.borrow_mut(); // Mutably borrow the nfts HashMap

        if nfts.contains_key(&token_id) {
            return Err("NFT with this token ID already exists.".to_string());
        }

        let nft = NFT { token_id, course };

        nfts.insert(token_id, nft); // Insert the new NFT

        Ok(()) // Return Ok(()) after inserting
    })?;

    Ok(token_id)
}

#[ic_cdk::query]
fn get_nft(token_id: u64) -> Option<NFT> {
    NFTS.with(|nfts| {
        let nfts_ref = nfts.borrow(); // Borrow immutable reference to the HashMap
        nfts_ref.get(&token_id).cloned() // Return cloned NFT if found
    })
}

// Enable Candid export (see https://internetcomputer.org/docs/current/developer-docs/backend/rust/generating-candid)
ic_cdk::export_candid!();
