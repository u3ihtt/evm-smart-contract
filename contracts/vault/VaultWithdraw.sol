// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract VaultWithdraw is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable
{
    struct WithdrawInfo {
        address recipient;
        uint256 nonce;
        address token;
        uint256 amount;
        uint256 timestamp;
    }

    address public admin;
    mapping(address => WithdrawInfo[]) private _userWithdraws;
    mapping(uint256 => WithdrawInfo) private _withdrawIndexToInfo;
    uint256 public withdrawCounter;
    mapping(string => bool) private _requestDatas;

    event TokenWithdrawn(
        address indexed token,
        uint256 nonce,
        address indexed recipient,
        uint256 amount
    );

    constructor() {
        _disableInitializers();
    }

    /**
     *
     * @param _admin admin address to call withdraw function.
     */
    function initialize(address _admin) public initializer {
        __Ownable_init();
        __Pausable_init();

        setAdmin(_admin);
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    function setAdmin(address newAdmin) public onlyOwner {
        require(newAdmin != address(0), "Invalid admin address");
        admin = newAdmin;
    }

    function withdrawNativeToken(
        address payable recipient,
        uint256 amount,
        string memory requestData
    ) public payable onlyAdmin whenNotPaused {
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Invalid transfer amount");
        require(
            _requestDatas[requestData] == false,
            string(abi.encodePacked("requestData already used_", requestData))
        );
        require(
            address(this).balance >= amount,
            "Insufficient contract native token"
        );

        _requestDatas[requestData] = true;

        uint256 nonce = withdrawCounter++;
        WithdrawInfo memory withdraw = WithdrawInfo({
            recipient: recipient,
            nonce: nonce,
            token: address(0),
            amount: amount,
            timestamp: block.timestamp
        });

        _userWithdraws[recipient].push(withdraw);
        _withdrawIndexToInfo[nonce] = withdraw;

        recipient.transfer(amount);

        emit TokenWithdrawn(address(0), nonce, recipient, amount);
    }

    function withdrawERC20Token(
        IERC20 token,
        address recipient,
        uint256 amount,
        string memory requestData
    ) public onlyAdmin whenNotPaused {
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Invalid transfer amount");
        require(
            _requestDatas[requestData] == false,
            string(abi.encodePacked("requestData already used_", requestData))
        );

        _requestDatas[requestData] = true;

        token.transfer(recipient, amount);

        uint256 nonce = withdrawCounter++;

        WithdrawInfo memory withdraw = WithdrawInfo({
            recipient: recipient,
            nonce: nonce,
            token: address(token),
            amount: amount,
            timestamp: block.timestamp
        });

        _userWithdraws[recipient].push(withdraw);
        _withdrawIndexToInfo[nonce] = withdraw;

        emit TokenWithdrawn(address(token), nonce, recipient, amount);
    }

    function multiWithdraw(
        IERC20[] memory tokens,
        address[] memory recipients,
        uint256[] memory amounts,
        string[] memory requestDatas
    ) external onlyAdmin whenNotPaused {
        require(
            recipients.length == tokens.length &&
                recipients.length == amounts.length &&
                recipients.length > 0,
            "Invalid input"
        );
        for (uint256 i = 0; i < recipients.length; i++) {
            if (address(tokens[i]) != address(0)) {
                withdrawERC20Token(
                    tokens[i],
                    recipients[i],
                    amounts[i],
                    requestDatas[i]
                );
            } else {
                withdrawNativeToken(
                    payable(recipients[i]),
                    amounts[i],
                    requestDatas[i]
                );
            }
        }
    }

    // Get withdraw count for a specific user address
    function getUserWithdrawCount(
        address user
    ) external view returns (uint256) {
        return _userWithdraws[user].length;
    }

    /**
     * Get WithdrawInfo of a user
     *
     * @param user user address want to get withdraw info
     * @param startIndex start index of user's Withdraw Info array
     * @param endIndex end index of user's Withdraw Info array
     */
    function getWithdrawInfoByUser(
        address user,
        uint256 startIndex,
        uint256 endIndex
    ) external view returns (WithdrawInfo[] memory) {
        require(
            startIndex <= endIndex && endIndex < _userWithdraws[user].length,
            "Invalid indices"
        );

        uint256 subArrayLength = endIndex - startIndex + 1;
        WithdrawInfo[] memory subArray = new WithdrawInfo[](subArrayLength);

        for (uint256 i = 0; i < subArrayLength; i++) {
            subArray[i] = _userWithdraws[user][startIndex + i];
        }

        return subArray;
    }

    /**
     * Get WithdrawInfo of system,
     *
     * @param startNonce start nonce to get  WithdrawInfo
     * @param endNonce end nonce to get system WithdrawInfo
     */
    function getWithdrawInfoByNonce(
        uint256 startNonce,
        uint256 endNonce
    ) external view returns (WithdrawInfo[] memory) {
        require(
            startNonce <= endNonce && endNonce < withdrawCounter,
            "Invalid nonces"
        );

        uint256 subArrayLength = endNonce - startNonce + 1;
        WithdrawInfo[] memory subArray = new WithdrawInfo[](subArrayLength);

        for (uint256 i = 0; i < subArrayLength; i++) {
            subArray[i] = _withdrawIndexToInfo[startNonce + i];
        }

        return subArray;
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

    receive() external payable {}
}
