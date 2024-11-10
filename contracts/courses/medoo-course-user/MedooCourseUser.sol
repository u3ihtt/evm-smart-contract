// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/metatx/ERC2771ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";

contract MedooCourseUser is
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

    struct CourseUser {
        uint256 medooId;
        uint256 courseId;
        string status;
    }

    struct LearingItemData {
        uint256 learningMaterialId;
        uint256 chapterId; // 0 if top
        string updatedAt;
        uint256 progress;
    }

    struct LearningProgress {
        uint256 medooId;
        uint256 courseId;
        uint256 score;
        uint256 timestamp;
        LearingItemData[] progressTracking;
    }

    mapping(uint256 => CourseUser[]) public courseUsers; // mapping medooId => CourseUser[];

    mapping(uint256 => mapping(uint256 => LearningProgress))
        public learningProgresses; // mapping userid => (mapping courseid => LearningProgress);

    modifier onlyAdmin() {
        require(
            msg.sender == admin || msg.sender == owner(),
            "Ownable: caller is not the admin"
        );
        _;
    }

    event LearningProgressLogged(uint256 medooId, uint256 courseId);

    constructor() ERC2771ContextUpgradeable(address(0)) {
        _disableInitializers();
    }

    function initialize(
        address trustedForwarder_,
        address admin_,
        address medooIDContractAddress,
        address medooCourseNFTContractAddress
    ) public initializer {
        __Ownable_init();
        trustedForwarder = trustedForwarder_;
        setAdmin(admin_);
        medooID = IERC721Upgradeable(medooIDContractAddress);
        medooCourseNFT = IERC721Upgradeable(medooCourseNFTContractAddress);
    }

    function storeCourseUser(CourseUser memory courseUser) public onlyAdmin {
        CourseUser[] storage userCourses = courseUsers[courseUser.medooId];
        bool updated = false;

        // Check for an existing course entry with the same courseId
        for (uint256 i = 0; i < userCourses.length; i++) {
            if (userCourses[i].courseId == courseUser.courseId) {
                // Update the existing entry
                userCourses[i].status = courseUser.status;
                updated = true;
                break;
            }
        }

        // If not found, add as a new entry
        if (!updated) {
            userCourses.push(courseUser);
        }
        // emit CourseUserLogged(courseUser);
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
        LearningProgress storage userLearningProgress = learningProgresses[
            learningProgress.medooId
        ][learningProgress.courseId];
        bool progressUpdated = false;

        // Check if a LearningProgress entry exists for this medooId and courseId
        if (
            userLearningProgress.medooId == learningProgress.medooId &&
            userLearningProgress.courseId == learningProgress.courseId
        ) {
            // Update score and timestamp
            userLearningProgress.score = learningProgress.score;
            userLearningProgress.timestamp = learningProgress.timestamp;

            // Update or add individual LearingItemData entries
            for (
                uint256 j = 0;
                j < learningProgress.progressTracking.length;
                j++
            ) {
                bool itemUpdated = false;

                for (
                    uint256 k = 0;
                    k < userLearningProgress.progressTracking.length;
                    k++
                ) {
                    // Check for existing LearingItemData with the same learningMaterialId and chapterId
                    if (
                        userLearningProgress
                            .progressTracking[k]
                            .learningMaterialId ==
                        learningProgress
                            .progressTracking[j]
                            .learningMaterialId &&
                        userLearningProgress.progressTracking[k].chapterId ==
                        learningProgress.progressTracking[j].chapterId
                    ) {
                        // Update existing tracking data
                        userLearningProgress
                            .progressTracking[k]
                            .updatedAt = learningProgress
                            .progressTracking[j]
                            .updatedAt;
                        userLearningProgress
                            .progressTracking[k]
                            .progress = learningProgress
                            .progressTracking[j]
                            .progress;
                        itemUpdated = true;
                        break;
                    }
                }

                // If no matching item was found, push as a new entry
                if (!itemUpdated) {
                    userLearningProgress.progressTracking.push(
                        learningProgress.progressTracking[j]
                    );
                }
            }

            progressUpdated = true;
        }

        // If no matching LearningProgress was found, add a new LearningProgress entry
        if (!progressUpdated) {
            // Manually initialize and push a new LearningProgress entry
            LearningProgress storage newProgress = userLearningProgress;
            newProgress.medooId = learningProgress.medooId;
            newProgress.courseId = learningProgress.courseId;
            newProgress.score = learningProgress.score;
            newProgress.timestamp = learningProgress.timestamp;

            // Manually add each LearingItemData to progressTracking in storage
            for (
                uint256 j = 0;
                j < learningProgress.progressTracking.length;
                j++
            ) {
                newProgress.progressTracking.push(
                    learningProgress.progressTracking[j]
                );
            }
        }

        emit LearningProgressLogged(
            learningProgress.medooId,
            learningProgress.courseId
        );
    }

    function getLearningProgresses(
        uint256 medooId,
        uint256 courseId
    ) public view returns (LearningProgress memory) {
        return learningProgresses[medooId][courseId];
    }

    function getCourseUsers(
        uint256 medooId // fromIndex, limit
    ) public view returns (CourseUser[] memory) {
        return courseUsers[medooId];
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
     * @dev Sets the value of `isStrictVerify`.
     * Can only be called by the admin.
     * @param _value The new value to set for `isStrictVerify`.
     */
    function setStrictVerify(bool _value) external onlyAdmin {
        isStrictVerify = _value;
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
