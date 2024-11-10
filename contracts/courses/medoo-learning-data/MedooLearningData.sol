// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/metatx/ERC2771ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";

contract MedooLearningData is
    Initializable,
    OwnableUpgradeable,
    ERC2771ContextUpgradeable
{
    address public trustedForwarder;
    address public admin;
    bool public isStrictVerify;
    IERC721Upgradeable public medooID;
    IERC721Upgradeable public medooCourseNFT;

    uint256 public constant DENOMINATOR = 100;

    enum BuyType {
        COURSE,
        LEARNING_PATH
    }

    struct BuyCourseTransaction {
        uint256 medooId;
        uint256[] courseIds;
        uint256 timestamp;
        BuyType buyType;
        string transactionId;
        uint256 originPrice;
        uint256 discountAmount;
        uint256 discountPercent;
        uint256 price;
        string currency;
        string rootOrgId;
    }

    struct LearningProgress {
        uint256 medooId;
        uint256 courseId;
        uint256 score;
        uint256 timestamp;
    }

    mapping(uint256 => BuyCourseTransaction[]) public buyCourseTransactions; // mapping medooId => BuyCourseTransaction[];

    mapping(uint256 => mapping(uint256 => LearningProgress[]))
        public learningProgresses; // mapping userid => (mapping courseid => LearningProgress[]);

    modifier onlyAdmin() {
        require(msg.sender == admin || msg.sender == owner(), "Not admin");
        _;
    }

    event BuyCourseTransactionLogged(BuyCourseTransaction buyCourseTransaction);
    event LearningProgressLogged(LearningProgress learningProgress);

    constructor() ERC2771ContextUpgradeable(address(0)) {
        _disableInitializers();
    }

    function initialize(
        address trustedForwarder_,
        address admin_
    ) public initializer {
        __Ownable_init();
        trustedForwarder = trustedForwarder_;
        setAdmin(admin_);
    }

    function storeBuyCourseTransaction(
        BuyCourseTransaction memory buyCourseTransaction
    ) public onlyAdmin {
        buyCourseTransactions[buyCourseTransaction.medooId].push(
            buyCourseTransaction
        );
        emit BuyCourseTransactionLogged(buyCourseTransaction);
    }

    function storeLearningProgress(
        LearningProgress memory learningProgress
    ) public {
        require(msg.sender == trustedForwarder, "Invalid forwarder");
        if (isStrictVerify) {
            require(
                medooID.ownerOf(learningProgress.medooId) == _msgSender(),
                "Invalid signer of Medoo ID"
            );
            require(
                medooCourseNFT.ownerOf(learningProgress.courseId) != address(0),
                "Course NFT not exists"
            );
        }

        learningProgress.timestamp = block.timestamp;
        learningProgresses[learningProgress.medooId][learningProgress.courseId]
            .push(learningProgress);

        emit LearningProgressLogged(learningProgress);
    }

    function getLearningProgresses(
        uint256 medooId,
        uint256 courseId
    ) public view returns (LearningProgress[] memory) {
        return learningProgresses[medooId][courseId];
    }

    function getBuyCourseTransactions(
        uint256 medooId // fromIndex, limit
    ) public view returns (BuyCourseTransaction[] memory) {
        return buyCourseTransactions[medooId];
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

    function isTrustedForwarder(
        address forwarder
    ) public view override returns (bool) {
        return forwarder == trustedForwarder;
    }

    function _msgSender()
        internal
        view
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (address)
    {
        return ERC2771ContextUpgradeable._msgSender();
    }

    function _msgData()
        internal
        view
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (bytes calldata)
    {
        return ERC2771ContextUpgradeable._msgData();
    }

    function _contextSuffixLength()
        internal
        view
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (uint256)
    {
        return ERC2771ContextUpgradeable._contextSuffixLength();
    }
}
