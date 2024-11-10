// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "../../../base/MedooNFTBase.sol";

contract MedooID is MedooNFTBase {
    function initialize(address admin_) public initializer {
        initialize(
            admin_,
            "MedooID", // token name
            "MID", // token symbol
            "https://metadata.medoo.io/medooid/" // uri
        );
    }

    /**
     * Change admin address, only owner has permission.
     *
     * @param receivers array addresses of receiver of new Token.
     * @param tokenIds array ids of new Token.
     */
    function mintNewTokens(
        address[] memory receivers,
        uint256[] memory tokenIds
    ) public onlyAdmin {
        require(
            receivers.length == tokenIds.length && receivers.length != 0,
            "Invalid array length"
        );
        require(receivers.length <= 100, "Mint too many tokens");

        for (uint256 i = 0; i < receivers.length; i++) {
            _mint(receivers[i], tokenIds[i]);
        }
    }

    // Admin can transfer token from wrong owner to the right owner.
    function adminTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public onlyAdmin {
        require(_exists(tokenId), "Token does not exist");
        require(ownerOf(tokenId) == from, "Invalid token owner");

        // Transfer the token without approval or user's permission
        _transfer(from, to, tokenId);
    }
}
