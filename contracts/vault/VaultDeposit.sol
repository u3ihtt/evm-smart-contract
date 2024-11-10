// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract VaultDeposit is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable
{
    struct DepositInfo {
        address depositor;
        uint256 nonce;
        address token;
        uint256 amount;
        uint256 timestamp;
    }

    mapping(address => bool) public tokenAddressWhitelist;
    mapping(address => DepositInfo[]) private _userDeposits;
    mapping(uint256 => DepositInfo) private _depositIndexToInfo;

    uint256 public depositCounter;
    address private _fundReceiver;
    address public admin;

    mapping(uint256 => string) public destinations;

    event TokenDeposited(
        address indexed depositor,
        uint256 nonce,
        address indexed token,
        uint256 amount,
        uint256 timestamp,
        string destination
    );
    event WhitelistUpdated(address indexed token, bool isWhitelist);

    // modifier to block deposit token not in whitelist
    modifier onlyTokenWhitelisted(address token) {
        require(tokenAddressWhitelist[token], "Token not in whitelist");
        _;
    }

    // modifier to block deposit token not in whitelist
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        _disableInitializers();
    }

    /**
     *
     * @param fundReceiver_ address to receive deposit tokens, .
     * @param whiteList array of whitelist tokens.
     */
    function initialize(
        address fundReceiver_,
        address[] memory whiteList,
        address admin_
    ) public initializer {
        __Ownable_init();
        __Pausable_init();

        require(fundReceiver_ != address(0), "Invalid fundReceiver address");
        _fundReceiver = fundReceiver_;

        setAdmin(admin_);

        for (uint256 i = 0; i < whiteList.length; i++) {
            addTokenToWhitelist(whiteList[i]);
        }
    }

    /**
     * remove token from whitelist
     *
     * @param token address of a whitelist token.
     */
    function removeTokenFromWhitelist(address token) external onlyAdmin {
        require(
            tokenAddressWhitelist[token] == true,
            "Token already not in whitelist"
        );
        tokenAddressWhitelist[token] = false;
        emit WhitelistUpdated(token, false);
    }

    /**
     * add token to whitelist
     *
     * @param token address of a whitelist token.
     */
    function addTokenToWhitelist(address token) public onlyAdmin {
        require(
            tokenAddressWhitelist[token] == false,
            "Token already in whitelist"
        );
        tokenAddressWhitelist[token] = true;
        emit WhitelistUpdated(token, true);
    }

    /**
     * Change admin whitelist.
     *
     * @param newAdmin address of new admin.
     */
    function setAdmin(address newAdmin) public onlyOwner {
        require(newAdmin != address(0), "Invalid admin address");
        admin = newAdmin;
    }

    /**
     * Change wallet address receive deposit token.
     *
     * @param fundReceiver_ address of new fund receiver wallet address.
     */
    function setFundReceiver(address fundReceiver_) public onlyOwner {
        require(fundReceiver_ != address(0), "Invalid fundReceiver address");
        _fundReceiver = fundReceiver_;
    }

    /**
     * Deposit native token like ETH, BNB,...
     *
     * Emit event DepositInfo with token address is address(0)
     */
    function depositNativeToken(
        string memory destination
    ) external payable whenNotPaused {
        require(msg.value > 0, "Invalid deposit amount");
        uint256 nonce = depositCounter++;
        DepositInfo memory deposit = DepositInfo({
            depositor: msg.sender,
            nonce: nonce,
            token: address(0),
            amount: msg.value,
            timestamp: block.timestamp
        });

        _userDeposits[msg.sender].push(deposit);
        _depositIndexToInfo[nonce] = deposit;
        destinations[nonce] = destination;

        (bool sent, ) = payable(_fundReceiver).call{value: msg.value}("");
        require(sent, "Failed to send native token"); // if fail, maybe because fundreceiver contract not implement receive() or fallback() method

        emit TokenDeposited(
            msg.sender,
            nonce,
            address(0),
            msg.value,
            block.timestamp,
            destination
        );
    }

    /**
     * Deposit whitelist token like Medoo, USDT,...
     *
     * @param token whitelist token address user want to deposit
     * @param amount token amount deposit
     *
     * Emit event DepositInfo with token address is whitelist token address
     *
     * Requirements: User must have balance >= amount and approve smart contract >= amount
     */
    function depositERC20Token(
        address token,
        uint256 amount,
        string memory destination
    ) external onlyTokenWhitelisted(token) whenNotPaused {
        require(amount > 0, "Invalid deposit amount");
        uint256 nonce = depositCounter++;
        IERC20(token).transferFrom(msg.sender, _fundReceiver, amount);

        DepositInfo memory deposit = DepositInfo({
            depositor: msg.sender,
            nonce: nonce,
            token: token,
            amount: amount,
            timestamp: block.timestamp
        });

        _userDeposits[msg.sender].push(deposit);
        _depositIndexToInfo[nonce] = deposit;
        destinations[nonce] = destination;

        emit TokenDeposited(
            msg.sender,
            nonce,
            token,
            amount,
            block.timestamp,
            destination
        );
    }

    // Get deposit count for a specific user address
    function getUserDepositCount(address user) external view returns (uint256) {
        return _userDeposits[user].length;
    }

    /**
     * Get DepositInfo of a user
     *
     * @param user user address want to get deposit info
     * @param startIndex start index of user's Deposit Info array
     * @param endIndex end index of user's Deposit Info array
     */
    function getDepositInfoByUser(
        address user,
        uint256 startIndex,
        uint256 endIndex
    ) external view returns (DepositInfo[] memory) {
        require(
            startIndex <= endIndex && endIndex < _userDeposits[user].length,
            "Invalid indices"
        );

        uint256 subArrayLength = endIndex - startIndex + 1;
        DepositInfo[] memory subArray = new DepositInfo[](subArrayLength);

        for (uint256 i = 0; i < subArrayLength; i++) {
            subArray[i] = _userDeposits[user][startIndex + i];
        }

        return subArray;
    }

    /**
     * Get DepositInfo of system,
     *
     * @param startNonce start nonce to get  DepositInfo
     * @param endNonce end nonce to get system DepositInfo
     */
    function getDepositInfoByNonce(
        uint256 startNonce,
        uint256 endNonce
    ) external view returns (DepositInfo[] memory) {
        require(
            startNonce <= endNonce && endNonce < depositCounter,
            "Invalid nonces"
        );

        uint256 subArrayLength = endNonce - startNonce + 1;
        DepositInfo[] memory subArray = new DepositInfo[](subArrayLength);

        for (uint256 i = 0; i < subArrayLength; i++) {
            subArray[i] = _depositIndexToInfo[startNonce + i];
        }

        return subArray;
    }

    function getDestinations(
        uint256[] memory nonces
    ) external view returns (string[] memory) {
        string[] memory res = new string[](nonces.length);

        for (uint256 i = 0; i < nonces.length; i++) {
            require(nonces[i] < depositCounter, "Invalid nonces");
            res[i] = destinations[nonces[i]];
        }

        return res;
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
