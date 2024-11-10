// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "../../../base/MedooNFTBase.sol";

contract MedooSyllabusNFT is MedooNFTBase {
    using ECDSAUpgradeable for bytes32;
    mapping(address => uint256) public nonces; // Tracks nonces for each user to prevent replay attacks
    struct Syllabus {
        uint256 syllabusId;
        string[] languages;
        mapping(string => string) name; // mapping language to content
        mapping(string => string) description;
        SyllabusChildren[] children;
    }

    struct FlatSyllabusData {
        uint256 syllabusId;
        string[] languages;
        string[] names;
        string[] descriptions;
        SyllabusChildren[] children;
    }

    struct SyllabusChildren {
        uint256 learningMaterialId;
        uint256 parentId; // ID of the parent in the flat structure, or 0 if it's a root
        uint256[] childIds; // List of child learningMaterialIds
    }

    mapping(uint256 => Syllabus) private syllabuses; // syllabusId => syllabus

    function initialize(address admin_) public initializer {
        initialize(
            admin_,
            "MedooSyllabusNFT", // token name
            "MSyllabusNFT", // token symbol
            "https://metadata.medoo.io/syllabus/" // uri
        );
    }

    /**
     * @dev Sets the data for a course, including multilingual support.
     * @param flatSyllabusData The flat struct containing syllabus details, including multilingual fields.
     */
    function setSyllabusData(
        FlatSyllabusData memory flatSyllabusData
    ) internal {
        Syllabus storage syllabus = syllabuses[flatSyllabusData.syllabusId];
        syllabus.syllabusId = flatSyllabusData.syllabusId;

        // Ensure input arrays are of the same length
        require(
            flatSyllabusData.languages.length != 0 &&
                flatSyllabusData.languages.length ==
                flatSyllabusData.names.length &&
                flatSyllabusData.languages.length ==
                flatSyllabusData.descriptions.length,
            "Array lengths must match"
        );

        if (flatSyllabusData.children.length > 0) {
            // update all value of children
            delete syllabus.children;
            for (uint256 i = 0; i < flatSyllabusData.children.length; i++) {
                SyllabusChildren memory tempChild = SyllabusChildren({
                    learningMaterialId: flatSyllabusData
                        .children[i]
                        .learningMaterialId,
                    parentId: flatSyllabusData.children[i].parentId,
                    childIds: flatSyllabusData.children[i].childIds
                });
                syllabus.children.push(tempChild);
            }
        }

        // Set multilingual data for the syllabus
        for (uint256 i = 0; i < flatSyllabusData.languages.length; i++) {
            // Add new language if it doesn't exist
            if (
                bytes(syllabus.name[flatSyllabusData.languages[i]]).length == 0
            ) {
                syllabus.languages.push(flatSyllabusData.languages[i]);
            }
            syllabus.name[flatSyllabusData.languages[i]] = flatSyllabusData
                .names[i];
            syllabus.description[
                flatSyllabusData.languages[i]
            ] = flatSyllabusData.descriptions[i];
        }
    }

    /**
     * @dev Updates the data for an existing syllabus, including multilingual support.
     * @param flatSyllabusData The flat struct containing updated syllabus details.
     */
    function updateSyllabusData(
        FlatSyllabusData memory flatSyllabusData
    ) public onlyAdmin {
        // Ensure the syllabus exists before updating
        require(
            syllabuses[flatSyllabusData.syllabusId].syllabusId != 0,
            "Syllabus does not exist"
        );

        setSyllabusData(flatSyllabusData);
    }

    /**
     * Change admin address, only owner has permission.
     *
     * @param receivers array addresses of receiver of new Token.
     * @param _syllabusLists array syllabus data.
     */
    function mintNewTokens(
        address[] memory receivers,
        FlatSyllabusData[] memory _syllabusLists
    ) public onlyAdmin {
        require(
            receivers.length == _syllabusLists.length && receivers.length != 0,
            "Invalid array length"
        );
        require(receivers.length <= 100, "Mint too many tokens");
        for (uint256 i = 0; i < receivers.length; i++) {
            require(
                _syllabusLists[i].syllabusId != 0,
                "Syllabus id cant be zero"
            );
        }

        for (uint256 i = 0; i < receivers.length; i++) {
            uint256 syllabusId = _syllabusLists[i].syllabusId;
            _mint(receivers[i], syllabusId);
            setSyllabusData(_syllabusLists[i]);
        }
    }

    /**
     * User mint new NFT, but only if has signature of admin.
     *
     * @param receiver address of receiver of new Token.
     * @param syllabus_ data of Syllabus.
     * @param nonce current nonce of user, avoid replay attack.
     * @param expiration expiration time of signature.
     */
    function mintNewTokenWithSignature(
        address receiver,
        FlatSyllabusData memory syllabus_,
        uint256 nonce,
        uint256 expiration,
        bytes memory signature
    ) public {
        require(block.timestamp <= expiration, "Signature has expired");

        // Create the message hash (includes the recipient, tokenId, nonce, expiration)
        bytes32 messageHash = getMessageHash(
            receiver,
            syllabus_.syllabusId,
            nonce,
            expiration
        );

        // Verify the signature
        require(verifySignature(messageHash, signature), "Invalid signature");

        // Ensure the nonce has not been used
        require(nonces[receiver] == nonce, "Nonce already used or invalid");

        // Increment the nonce for the user to prevent replay attacks
        nonces[receiver]++;

        _mint(receiver, syllabus_.syllabusId);
        setSyllabusData(syllabus_);
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

    function getSyllabusDataById(
        uint256 syllabusId, // fromIndex, limit
        string memory language
    )
        public
        view
        returns (
            string memory name,
            string memory description,
            uint256 id,
            SyllabusChildren[] memory children
        )
    {
        require(
            syllabuses[syllabusId].syllabusId != 0,
            "Syllabus does not exist"
        );

        Syllabus storage syllabus = syllabuses[syllabusId];

        return (
            syllabus.name[language],
            syllabus.description[language],
            syllabus.syllabusId,
            syllabus.children
        );
    }

    function getAllLanguagesOfSyllabus(
        uint256 syllabusId
    ) public view returns (string[] memory) {
        require(
            syllabuses[syllabusId].syllabusId != 0,
            "syllabus does not exist"
        );

        return syllabuses[syllabusId].languages;
    }
}
