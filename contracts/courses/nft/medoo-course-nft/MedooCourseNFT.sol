// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "../../../base/MedooNFTBase.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";

contract MedooCourseNFT is MedooNFTBase {
    using ECDSAUpgradeable for bytes32;

    mapping(address => uint256) public nonces; // Tracks nonces for each user to prevent replay attacks

    struct Course {
        uint256 courseId;
        string[] languages;
        mapping(string => string) name; // mapping language to content
        mapping(string => string) description;
        string slug;
        string studyType;
        string avatarUrl;
        mapping(string => string) expectationsAndGoals;
        uint256 syllabusId;
    }

    struct FlatCourseData {
        uint256 courseId;
        string[] languages;
        string[] names;
        string[] descriptions;
        string slug;
        string studyType;
        string avatarUrl;
        string[] expectationsAndGoals;
        uint256 syllabusId;
    }
    mapping(uint256 => Course) public courses; // courseId => course

    function initialize(address admin_) public initializer {
        initialize(
            admin_,
            "MedooCourseNFT", // token name
            "MCourseNFT", // token symbol
            "https://metadata.medoo.io/course/" // uri
        );
    }

    /**
     * @dev Sets the data for a course, including multilingual support.
     * @param flatCourseData The flat struct containing course details, including multilingual fields.
     */
    function setCourseData(FlatCourseData memory flatCourseData) internal {
        Course storage course = courses[flatCourseData.courseId];
        course.courseId = flatCourseData.courseId;
        course.slug = flatCourseData.slug;
        course.studyType = flatCourseData.studyType;
        course.avatarUrl = flatCourseData.avatarUrl;
        course.syllabusId = flatCourseData.syllabusId;

        // Ensure input arrays are of the same length
        require(
            flatCourseData.languages.length != 0 &&
                flatCourseData.languages.length ==
                flatCourseData.names.length &&
                flatCourseData.languages.length ==
                flatCourseData.descriptions.length &&
                flatCourseData.languages.length ==
                flatCourseData.expectationsAndGoals.length,
            "Array lengths must match"
        );

        // Set multilingual data for the course
        for (uint256 i = 0; i < flatCourseData.languages.length; i++) {
            // Add new language if it doesn't exist
            if (bytes(course.name[flatCourseData.languages[i]]).length == 0) {
                course.languages.push(flatCourseData.languages[i]);
            }
            course.name[flatCourseData.languages[i]] = flatCourseData.names[i];
            course.description[flatCourseData.languages[i]] = flatCourseData
                .descriptions[i];
            course.expectationsAndGoals[
                flatCourseData.languages[i]
            ] = flatCourseData.expectationsAndGoals[i];
        }
    }

    /**
     * @dev Updates the data for an existing course, including multilingual support.
     * @param flatCourseData The flat struct containing updated course details.
     */
    function updateCourseData(
        FlatCourseData memory flatCourseData
    ) public onlyAdmin {
        // Ensure the course exists before updating
        require(
            courses[flatCourseData.courseId].courseId != 0,
            "Course does not exist"
        );

        setCourseData(flatCourseData);
    }

    /**
     * Change admin address, only owner has permission.
     *
     * @param receivers array addresses of receiver of new Token.
     * @param courseLists array course data.
     */
    function mintNewTokens(
        address[] memory receivers,
        FlatCourseData[] memory courseLists
    ) public onlyAdmin {
        require(
            receivers.length == courseLists.length && receivers.length != 0,
            "Invalid array length"
        );
        require(receivers.length <= 100, "Mint too many tokens");

        for (uint256 i = 0; i < receivers.length; i++) {
            require(courseLists[i].courseId != 0, "Course Id cant be zero");
        }

        for (uint256 i = 0; i < receivers.length; i++) {
            uint256 courseId = courseLists[i].courseId;
            _mint(receivers[i], courseId);
            setCourseData(courseLists[i]);
        }
    }

    /**
     * User mint new NFT, but only if has signature of admin.
     *
     * @param receiver address of receiver of new Token.
     * @param course_ data of Course.
     * @param nonce current nonce of user, avoid replay attack.
     * @param expiration expiration time of signature.
     */
    function mintNewTokenWithSignature(
        address receiver,
        FlatCourseData memory course_,
        uint256 nonce,
        uint256 expiration,
        bytes memory signature
    ) public {
        require(block.timestamp <= expiration, "Signature has expired");

        // Create the message hash (includes the recipient, tokenId, nonce, expiration)
        bytes32 messageHash = getMessageHash(
            receiver,
            course_.courseId,
            nonce,
            expiration
        );

        // Verify the signature
        require(verifySignature(messageHash, signature), "Invalid signature");

        // Ensure the nonce has not been used
        require(nonces[receiver] == nonce, "Nonce already used or invalid");

        // Increment the nonce for the user to prevent replay attacks
        nonces[receiver]++;

        _mint(receiver, course_.courseId);
        setCourseData(course_);
    }

    // Helper function to create the hash of the minting message
    function getMessageHash(
        address to,
        uint256 tokenId,
        uint256 nonce,
        uint256 expiration
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(to, tokenId, nonce, expiration));
    }

    // Helper function to verify the signature
    function verifySignature(
        bytes32 messageHash,
        bytes memory signature
    ) public view returns (bool) {
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash(); // Ethereum signed message format
        return ethSignedMessageHash.recover(signature) == admin;
    }

    /**
     * @dev Retrieves the course data for a specific course and language.
     * @param courseId The unique ID of the course.
     * @param language The language code for which you want the course data (e.g., "en").
     * @return name The name of the course in the specified language.
     * @return description The description of the course in the specified language.
     * @return expectationsAndGoals The expectations and goals in the specified language.
     * @return slug The course slug.
     * @return studyType The type of study (e.g., online, offline).
     * @return avatarUrl The avatar URL for the course.
     * @return syllabusId The ID of the syllabus associated with the course.
     */
    function getCourseData(
        uint256 courseId,
        string memory language
    )
        public
        view
        returns (
            string memory name,
            string memory description,
            string memory expectationsAndGoals,
            string memory slug,
            string memory studyType,
            string memory avatarUrl,
            uint256 syllabusId
        )
    {
        // Ensure the course exists
        require(courses[courseId].courseId != 0, "Course does not exist");

        Course storage course = courses[courseId];

        return (
            course.name[language],
            course.description[language],
            course.expectationsAndGoals[language],
            course.slug,
            course.studyType,
            course.avatarUrl,
            course.syllabusId
        );
    }

    function getAllLanguagesOfCourse(
        uint256 courseId
    ) public view returns (string[] memory) {
        require(courses[courseId].courseId != 0, "course does not exist");

        return courses[courseId].languages;
    }
}
