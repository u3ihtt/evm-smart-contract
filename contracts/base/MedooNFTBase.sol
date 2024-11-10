// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";

contract MedooNFTBase is Initializable, ERC721Upgradeable, OwnableUpgradeable {
    address public admin;
    string public baseUri;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // modifier to block deposit token not in whitelist
    modifier onlyAdmin() {
        require(
            msg.sender == admin || msg.sender == owner(),
            "Ownable: caller is not the admin"
        );
        _;
    }

    function initialize(
        address admin_,
        string memory tokenName_,
        string memory tokenSymbol_,
        string memory uri_
    ) public virtual initializer {
        __Ownable_init();
        __ERC721_init(tokenName_, tokenSymbol_);
        setAdmin(admin_);
        setBaseURI(uri_);
    }

    /**
     * Change admin address, only owner has permission.
     *
     * @param newAdmin address of new admin.
     */
    function setAdmin(address newAdmin) public onlyOwner {
        require(newAdmin != address(0), "Invalid admin address");
        admin = newAdmin;
    }

    /**
     * Owner set base uri of NFT
     *
     * @param newuri new base uri
     */
    function setBaseURI(string memory newuri) public onlyOwner {
        baseUri = newuri;
    }

    /**
     * Note: Base URI for computing {tokenURI}. If set, the resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`. Empty
     * by default, can be overridden in child contracts.
     */
    function _baseURI() internal view override returns (string memory) {
        return baseUri;
    }
}
