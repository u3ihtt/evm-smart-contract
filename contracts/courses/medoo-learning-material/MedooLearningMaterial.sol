// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MedooLearningMaterial is Initializable, OwnableUpgradeable {
    struct LearningMaterial {
        uint256 learningMaterialId;
        string learningMaterialType;
        string[] languages;
        mapping(string => string) name;
        mapping(string => string) content;
        mapping(string => string) article;
        string quizId;
        mapping(string => string) metadata; // Video, File,...
    }

    struct FlatLearningMaterialData {
        uint256 learningMaterialId;
        string learningMaterialType;
        string[] languages;
        string[] names;
        string[] contents;
        string[] articles;
        string quizId;
        string[] metadataValues;
    }
    address public admin;
    // State variables
    mapping(uint256 => LearningMaterial) private learningMaterials; // Mapping of learning materials by ID

    // Event for logging when a learning material is added
    event LearningMaterialAdded(uint256 indexed learningMaterialId);
    event LearningMaterialUpdated(uint256 indexed learningMaterialId);

    constructor() {
        _disableInitializers();
    }

    function initialize(address admin_) public virtual initializer {
        __Ownable_init();
        setAdmin(admin_);
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Ownable: caller is not the admin");
        _;
    }

    /// @notice Adds a new learning material to the system.
    /// @param newMaterial A struct containing all data required to create a new learning material.
    /// @dev This function can only be called by an admin. It checks that the learning material ID is not zero,
    ///      and that there is no existing learning material with the same ID.
    ///      After validation, it stores the language data and emits an event indicating that a new learning material has been added.
    function addLearningMaterial(
        FlatLearningMaterialData memory newMaterial
    ) public onlyAdmin {
        require(
            newMaterial.learningMaterialId != 0,
            "Learning material ID can't be zero"
        );
        require(
            learningMaterials[newMaterial.learningMaterialId]
                .learningMaterialId == 0,
            "Duplicate learning material ID"
        );

        // Use the private function to store language data
        setLearningMaterialData(newMaterial);

        emit LearningMaterialAdded(newMaterial.learningMaterialId);
    }

    /**
     * @dev Function to update or add language data for an existing learning material.
     * @param newMaterial A struct containing all data required to update the learning material.
     * @notice The learning material must exist before updating. All input arrays in the struct must have the same length and must not be empty.
     */
    function updateLearningMaterialLanguages(
        FlatLearningMaterialData memory newMaterial
    ) public onlyAdmin {
        // Ensure the learning material exists
        require(
            learningMaterials[newMaterial.learningMaterialId]
                .learningMaterialId != 0,
            "Learning material does not exist"
        );

        // Use the private function to store language data
        setLearningMaterialData(newMaterial);

        emit LearningMaterialUpdated(newMaterial.learningMaterialId);
    }

    /**
     * @dev Private function to store language data in a Learning Material.
     * @param newMaterial A struct containing all data required to create or update a learning material.
     * @notice All input arrays in the struct must have the same length and must not be empty.
     */
    function setLearningMaterialData(
        FlatLearningMaterialData memory newMaterial
    ) private {
        // Ensure all input arrays are of the same length and not empty
        uint256 arrayLength = newMaterial.languages.length;
        require(
            arrayLength > 0 && newMaterial.names.length != 0,
            "Arrays must not be empty"
        );
        require(
            arrayLength == newMaterial.names.length &&
                arrayLength == newMaterial.contents.length &&
                arrayLength == newMaterial.articles.length &&
                arrayLength == newMaterial.metadataValues.length,
            "All input arrays must have the same length"
        );

        // Use learningMaterialId from the struct
        uint256 learningMaterialId = newMaterial.learningMaterialId;
        LearningMaterial storage material = learningMaterials[
            learningMaterialId
        ];

        material.learningMaterialId = learningMaterialId;
        material.learningMaterialType = newMaterial.learningMaterialType;
        material.quizId = newMaterial.quizId;

        // Update or add data for each language
        for (uint256 i = 0; i < arrayLength; i++) {
            // Add new language if it doesn't exist
            if (bytes(material.name[newMaterial.languages[i]]).length == 0) {
                material.languages.push(newMaterial.languages[i]);
            }

            // Update the mappings with the provided data
            material.name[newMaterial.languages[i]] = newMaterial.names[i];
            material.content[newMaterial.languages[i]] = newMaterial.contents[
                i
            ];
            material.article[newMaterial.languages[i]] = newMaterial.articles[
                i
            ];
            material.metadata[newMaterial.languages[i]] = newMaterial
                .metadataValues[i];
        }
    }

    /**
     * @dev Function to retrieve a learning material by its ID and language.
     * @param materialId The ID of the requested learning material.
     * @param language The language code for which to retrieve the material.
     * @return Returns various details about the requested learning material.
     */

    function getLearningMaterialByLanguage(
        uint256 materialId,
        string memory language
    )
        public
        view
        returns (
            uint256,
            string memory,
            string memory,
            string memory,
            string memory,
            string memory,
            string memory
        )
    {
        LearningMaterial storage material = learningMaterials[materialId];
        require(
            bytes(material.metadata[language]).length > 0,
            "Not have data in this language"
        );

        // Retrieve name, content, and article based on the specified language
        string memory nameValue = material.name[language];
        string memory contentValue = material.content[language];
        string memory articleValue = material.article[language];
        string memory learningMaterialType = material.learningMaterialType;

        string memory metadataValues = material.metadata[language]; // Retrieve metadata based on the specified language

        return (
            material.learningMaterialId,
            learningMaterialType,
            nameValue,
            contentValue,
            articleValue,
            material.quizId,
            metadataValues
        );
    }

    function getAllLanguagesOfLearningMaterial(
        uint256 materialId
    ) public view returns (string[] memory) {
        require(
            learningMaterials[materialId].learningMaterialId != 0,
            "Material does not exist"
        );

        return learningMaterials[materialId].languages;
    }

    /**
     * @dev Change admin address. Only owner has permission.
     * @param newAdmin Address of the new admin.
     */
    function setAdmin(address newAdmin) public onlyOwner {
        require(newAdmin != address(0), "Invalid admin address");
        admin = newAdmin;
    }
}
