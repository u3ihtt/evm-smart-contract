// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./IERC721BatchReceiverUpgradeable.sol";

contract MedooNFT is
    Initializable,
    ERC721Upgradeable,
    ERC721PausableUpgradeable,
    ERC721BurnableUpgradeable,
    ERC721EnumerableUpgradeable,
    OwnableUpgradeable
{
    using SafeERC20 for IERC20;
    using Strings for uint256;

    mapping(uint256 => uint256) private _tokenSupply;
    mapping(uint256 => uint256) private _maxSupply;

    IERC20 public medooToken;
    address private _mintFeeReceiver;
    address private _adminMinter;
    uint256 private _tokenCounter;
    uint256 public mintFee;
    string public baseUri;
    uint256 public maxFragment;

    uint256 constant DENOMINATOR = 1000;

    // event
    event TokenMinted(
        address indexed owner,
        uint256 indexed tokenId,
        uint256 amount
    );

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address mintFeeTo_,
        address adminMinter_,
        address medooToken_,
        uint256 mintFee_
    ) public initializer {
        __ERC721_init("Medoo NFT Course Collection", "MDNFT");
        __ERC721Pausable_init();
        __ERC721Burnable_init();
        __ERC721Enumerable_init();
        __Ownable_init();
        _mintFeeReceiver = mintFeeTo_;
        _adminMinter = adminMinter_;
        medooToken = IERC20(medooToken_);
        mintFee = mintFee_;
        baseUri = "https://nft-storage.medoo.io/";
        maxFragment = 10;
    }

    /**
     * User pay Medoo to mint NFT
     *
     * @param numberFragment number fragment of NFT
     *
     * Emit event TokenMinted
     *
     * Requirements: User must have balance >= amount and approve smart contract >= amount
     */
    function mint(
        uint256 numberFragment
    ) public whenNotPaused returns (uint256) {
        require(
            numberFragment > 0 && numberFragment < maxFragment,
            "Invalid number fragment."
        );
        uint256 tokenId = ++_tokenCounter;

        IERC20(medooToken).transferFrom(msg.sender, _mintFeeReceiver, mintFee);

        for (uint8 i = 1; i <= numberFragment; i++) {
            _mint(msg.sender, tokenId * DENOMINATOR + i);
        }

        emit TokenMinted(msg.sender, tokenId, numberFragment);
        return tokenId;
    }

    /**
     * Admin mint NFT to an address
     *
     * @param numberFragment number versions of NFT
     * @param owner address to mint NFT to
     *
     * Emit event TokenMinted
     *
     * Note: Do not need to pay Medoo Token
     */
    function adminMint(
        uint256 numberFragment,
        address owner
    ) public whenNotPaused returns (uint256) {
        require(msg.sender == _adminMinter, "Invalid admin minter.");
        require(
            numberFragment > 0 && numberFragment < maxFragment,
            "Invalid number fragment."
        );

        uint256 tokenId = ++_tokenCounter;

        for (uint8 i = 1; i <= numberFragment; i++) {
            _mint(owner, tokenId * DENOMINATOR + i);
        }

        emit TokenMinted(owner, tokenId, numberFragment);
        return tokenId;
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
     * Owner set maximum fragment of a NFT
     *
     * @param maxFragment_ new max fragment
     */
    function setMaxFragment(uint256 maxFragment_) public onlyOwner {
        maxFragment = maxFragment_;
    }

    /**
     * Note: Base URI for computing {tokenURI}. If set, the resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`. Empty
     * by default, can be overridden in child contracts.
     */
    function _baseURI() internal view override returns (string memory) {
        return baseUri;
    }

    /**
     * Funtion to control ERC721 Enumerable. To get tokens of a address and holders of a token
     *
     * The following functions are overrides required by Solidity.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    )
        internal
        override(
            ERC721Upgradeable,
            ERC721PausableUpgradeable,
            ERC721EnumerableUpgradeable
        )
        whenNotPaused
    {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);

        if (from == address(0)) {
            _tokenSupply[firstTokenId / DENOMINATOR] += 1;
            _maxSupply[firstTokenId / DENOMINATOR] += 1;
        }

        if (to == address(0)) {
            _tokenSupply[firstTokenId / DENOMINATOR] -= 1;
        }
    }

    function batchTransfer(address to, uint256[] memory tokenIds) external {
        require(tokenIds.length > 0, "Invalid token array");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            transferFrom(msg.sender, to, tokenIds[i]);
        }
    }

    function safeBatchTransfer(
        address to,
        uint256[] memory tokenIds,
        bytes memory data
    ) external {
        require(tokenIds.length > 0, "Invalid token array");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            transferFrom(msg.sender, to, tokenIds[i]);
        }
        require(
            _checkOnERC721BatchReceived(msg.sender, to, tokenIds, data),
            "ERC721: transfer to non ERC721Receiver implementer"
        );
    }

    /**
     * @dev Internal function to invoke {IERC721Receiver-onERC721Received} on a target address.
     * The call is not executed if the target address is not a contract.
     *
     * @param from address representing the previous owner of the given token ID
     * @param to target address that will receive the tokens
     * @param tokenIds uint256[] IDs of the array token to be transferred
     * @param data bytes optional data to send along with the call
     * @return bool whether the call correctly returned the expected magic value
     */
    function _checkOnERC721BatchReceived(
        address from,
        address to,
        uint256[] memory tokenIds,
        bytes memory data
    ) private returns (bool) {
        try
            IERC721BatchReceiverUpgradeable(to).onERC721BatchReceived(
                _msgSender(),
                from,
                tokenIds,
                data
            )
        returns (bytes4 retval) {
            return
                retval ==
                IERC721BatchReceiverUpgradeable.onERC721BatchReceived.selector;
        } catch (bytes memory reason) {
            if (reason.length == 0) {
                revert(
                    "ERC721: transfer to non ERC721BatchReceiver implementer"
                );
            } else {
                /// @solidity memory-safe-assembly
                assembly {
                    revert(add(32, reason), mload(reason))
                }
            }
        }
    }

    /**
     * @dev Amount of tokens in with a given id.
     */
    function tokenSupply(uint256 id) public view virtual returns (uint256) {
        return _tokenSupply[id];
    }

    /**
     * @dev Total amount of tokens minted all the time in with a given id.
     */
    function maxSupply(uint256 id) public view virtual returns (uint256) {
        return _maxSupply[id];
    }

    /**
     * @notice query total number of token for given user
     * @param user user address to query
     * @return quantity of tokens
     */
    function countTokens(address user) public view virtual returns (uint256) {
        return balanceOf(user);
    }

    /**
     * @notice query holders of given token
     * @param tokenId token id to query
     * @return list of holder addresses
     */
    function usersByToken(
        uint256 tokenId
    ) public view virtual returns (address[] memory) {
        uint256 arrayLength = _maxSupply[tokenId];
        address[] memory addresses = new address[](arrayLength);
        for (uint256 i = 0; i < arrayLength; i++) {
            addresses[i] = _ownerOf(tokenId * DENOMINATOR + i + 1);
        }
        return addresses;
    }

    /**
     * @notice query tokens held by given address
     * @param user address to query
     * @return list of token ids
     */
    function tokensByUser(
        address user,
        uint256 startIndex,
        uint256 endIndex
    ) public view virtual returns (uint256[] memory) {
        require(
            startIndex <= endIndex && endIndex < balanceOf(user),
            "Invalid indices"
        );
        uint256 subArrayLength = endIndex - startIndex + 1;
        uint256[] memory ids = new uint256[](subArrayLength);
        for (uint256 i = 0; i < subArrayLength; i++) {
            ids[i] = tokenOfOwnerByIndex(user, startIndex + i);
        }
        return ids;
    }

    // Have to override to compile
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * function to set new fee receiver address
     */
    function setMintFeeToAddress(address mintFeeReceiver_) public onlyOwner {
        _mintFeeReceiver = mintFeeReceiver_;
    }

    /**
     * function to set new admin minter address. Mint without fee
     */
    function setAdminMinterAddress(address newAdminMinter) public onlyOwner {
        _adminMinter = newAdminMinter;
    }

    /**
     * function to set mint fee
     */
    function setMintFeeNFT(uint256 _mintFee) public onlyOwner {
        mintFee = _mintFee;
    }

    /**
     * function to pause smart contract
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * function to unpause smartcontract
     */
    function unpause() public onlyOwner {
        _unpause();
    }
}
