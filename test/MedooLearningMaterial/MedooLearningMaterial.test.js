const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { Interface } = require("ethers");

const deployFnc = async () => {
  const [owner, user1, user2, adminMinter] = await ethers.getSigners();

  const MedooProxyAdmin = await ethers.getContractFactory("MedooProxyAdmin");
  const medooProxyAdmin = await MedooProxyAdmin.deploy();
  await medooProxyAdmin.waitForDeployment();
  const medooProxyAdminAddress = await medooProxyAdmin.getAddress();

  const MedooLearningMaterial = await ethers.getContractFactory(
    "MedooLearningMaterial",
  );
  const medooLearningMaterial = await MedooLearningMaterial.deploy();
  await medooLearningMaterial.waitForDeployment();
  const medooLearningMaterialAddress = await medooLearningMaterial.getAddress();

  const MedooLearningMaterialProxy = await ethers.getContractFactory(
    "MedooLearningMaterialProxy",
  );

  const medooLearningMaterialInterface = new Interface([
    "function initialize(address) public",
  ]);
  const initializeData = medooLearningMaterialInterface.encodeFunctionData(
    "initialize",
    [adminMinter.address],
  );

  const medooLearningMaterialProxy = await MedooLearningMaterialProxy.deploy(
    medooLearningMaterialAddress,
    medooProxyAdminAddress,
    initializeData,
  );
  await medooLearningMaterialProxy.waitForDeployment();
  const medooLearningMaterialProxyAddress =
    await medooLearningMaterialProxy.getAddress();

  return {
    medooLearningMaterial,
    medooLearningMaterialProxy,
    medooProxyAdmin,
    owner,
    user1,
    user2,
    adminMinter,
  };
};

describe("MedooLearningMaterialProxy Contract", () => {
  let medooLearningMaterial;
  let medooLearningMaterialProxy;
  let medooProxyAdmin;
  let owner;
  let user1;
  let user2;
  let adminMinter;

  before(async () => {
    ({
      medooLearningMaterial,
      medooLearningMaterialProxy,
      medooProxyAdmin,
      owner,
      user1,
      user2,
      adminMinter,
    } = await loadFixture(deployFnc));
  });

  describe("MedooLearningMaterial Contract Functionality", () => {
    it("Should revert if trying to call direct function from the MedooLearningMaterial contract", async () => {
      await expect(medooLearningMaterial.initialize(owner.address)).to.be
        .reverted;
    });

    it("Should allow admin to add learning material through proxy", async () => {
      const MedooLearningMaterial = await ethers.getContractFactory(
        "MedooLearningMaterial",
      );
      const medooLearningMaterialProxyInstance = MedooLearningMaterial.attach(
        medooLearningMaterialProxy.target,
      );

      const flatLearningMaterialData = {
        learningMaterialId: 1,
        learningMaterialType: "video",
        languages: ["en"],
        names: ["English Title"],
        contents: ["English Content"],
        articles: ["English Article"],
        quizId: "quiz123",
        metadataValues: ["metadata1"],
      };

      await expect(
        medooLearningMaterialProxyInstance
          .connect(adminMinter)
          .addLearningMaterial(flatLearningMaterialData),
      )
        .to.emit(medooLearningMaterialProxyInstance, "LearningMaterialAdded")
        .withArgs(flatLearningMaterialData.learningMaterialId);
    });

    it("Should retrieve the correct learning material by ID and language through proxy", async () => {
      const MedooLearningMaterial = await ethers.getContractFactory(
        "MedooLearningMaterial",
      );
      const medooLearningMaterialProxyInstance = MedooLearningMaterial.attach(
        medooLearningMaterialProxy.target,
      );

      const learningMaterialId = 1;
      const [
        materialId,
        materialType,
        nameValue,
        contentValue,
        articleValue,
        quizId,
        metadataValues,
      ] =
        await medooLearningMaterialProxyInstance.getLearningMaterialByLanguage(
          learningMaterialId,
          "en",
        );

      expect(materialId).to.equal(learningMaterialId);
      expect(materialType).to.equal("video");
      expect(nameValue).to.equal("English Title");
      expect(contentValue).to.equal("English Content");
      expect(articleValue).to.equal("English Article");
      expect(quizId).to.equal("quiz123");
      expect(metadataValues).to.equal("metadata1");
    });

    it("Should check metadata existence through proxy", async () => {
      const MedooLearningMaterial = await ethers.getContractFactory(
        "MedooLearningMaterial",
      );
      const medooLearningMaterialProxyInstance = MedooLearningMaterial.attach(
        medooLearningMaterialProxy.target,
      );

      const flatLearningMaterialData = {
        learningMaterialId: 2,
        learningMaterialType: "video",
        languages: ["en"],
        names: ["Another Video Title"],
        contents: ["Another video content"],
        articles: ["Another article"],
        quizId: "quiz456",
        metadataValues: ["metadata2"],
      };

      await medooLearningMaterialProxyInstance
        .connect(adminMinter)
        .addLearningMaterial(flatLearningMaterialData);

      const result =
        await medooLearningMaterialProxyInstance.getLearningMaterialByLanguage(
          2,
          "en",
        );
      expect(result).to.exist;

      await expect(
        medooLearningMaterialProxyInstance.getLearningMaterialByLanguage(
          2,
          "fr",
        ),
      ).to.be.revertedWith("Not have data in this language"); // French not added
    });

    it("Should revert if non-admin tries to add learning material", async () => {
      const MedooLearningMaterial = await ethers.getContractFactory(
        "MedooLearningMaterial",
      );
      const medooLearningMaterialProxyInstance = MedooLearningMaterial.attach(
        medooLearningMaterialProxy.target,
      );

      const flatLearningMaterialData = {
        learningMaterialId: 3,
        learningMaterialType: "video",
        languages: ["en"],
        names: ["Unauthorized Video Title"],
        contents: ["Unauthorized content"],
        articles: ["Unauthorized article"],
        quizId: "quiz789",
        metadataValues: ["unauthorizedMetadata"],
      };

      await expect(
        medooLearningMaterialProxyInstance
          .connect(user1)
          .addLearningMaterial(flatLearningMaterialData),
      ).to.be.revertedWith("Ownable: caller is not the admin");
    });

    it("Should allow admin to change admin address through proxy", async () => {
      const MedooLearningMaterial = await ethers.getContractFactory(
        "MedooLearningMaterial",
      );
      const medooLearningMaterialProxyInstance = MedooLearningMaterial.attach(
        medooLearningMaterialProxy.target,
      );

      await medooLearningMaterialProxyInstance
        .connect(owner)
        .setAdmin(user1.address);
      expect(await medooLearningMaterialProxyInstance.admin()).to.equal(
        user1.address,
      );
    });

    it("Should revert if non-owner tries to change admin address", async () => {
      const MedooLearningMaterial = await ethers.getContractFactory(
        "MedooLearningMaterial",
      );
      const medooLearningMaterialProxyInstance = MedooLearningMaterial.attach(
        medooLearningMaterialProxy.target,
      );

      await expect(
        medooLearningMaterialProxyInstance
          .connect(user2)
          .setAdmin(user1.address),
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    describe("updateLearningMaterialLanguages", () => {
      const baseData = {
        learningMaterialId: 100,
        learningMaterialType: "video",
        languages: ["en", "fr", "es"],
        names: ["English Title", "French Title", "Spanish Title"],
        contents: ["English Content", "French Content", "Spanish Content"],
        articles: ["English Article", "French Article", "Spanish Article"],
        metadataValues: ["metadata1", "metadata2", "metadata3"],
        quizId: "quiz123",
      };
      let medooLearningMaterialProxyInstance;

      before(async () => {
        const MedooLearningMaterial = await ethers.getContractFactory(
          "MedooLearningMaterial",
        );
        medooLearningMaterialProxyInstance = MedooLearningMaterial.attach(
          medooLearningMaterialProxy.target,
        );

        // Add initial learning material so we can update it later
        const initialData = {
          ...baseData,
          languages: ["en"], // initial languages
          names: ["Initial Title"], // initial names
          contents: ["Initial Content"], // initial contents
          articles: ["Initial Article"], // initial articles
          metadataValues: ["initialMetadata"], // initial metadataValues
        };

        await medooLearningMaterialProxyInstance
          .connect(adminMinter)
          .addLearningMaterial(initialData);
      });

      it("Should allow admin to update learning material languages", async () => {
        const updatedData = baseData;

        await expect(
          medooLearningMaterialProxyInstance
            .connect(adminMinter)
            .updateLearningMaterialLanguages(updatedData),
        )
          .to.emit(
            medooLearningMaterialProxyInstance,
            "LearningMaterialUpdated",
          )
          .withArgs(baseData.learningMaterialId);

        // Verify that the updates were correctly stored
        const [
          updatedMaterialId,
          updatedMaterialType,
          updatedName,
          updatedContent,
          updatedArticle,
          updatedQuizId,
          updatedMetadata,
        ] =
          await medooLearningMaterialProxyInstance.getLearningMaterialByLanguage(
            updatedData.learningMaterialId,
            updatedData.languages[0],
          );

        expect(updatedMaterialId).to.equal(updatedData.learningMaterialId);
        expect(updatedMaterialType).to.equal(updatedData.learningMaterialType);
        expect(updatedQuizId).to.equal(updatedData.quizId);
        expect(updatedName).to.equal(updatedData.names[0]);
        expect(updatedContent).to.equal(updatedData.contents[0]);
        expect(updatedArticle).to.equal(updatedData.articles[0]);
        expect(updatedMetadata).to.equal(updatedData.metadataValues[0]);
      });

      it("Should revert if learning material does not exist", async () => {
        const nonExistentData = {
          ...baseData,
          learningMaterialId: 999, // Non-existent ID
        };

        await expect(
          medooLearningMaterialProxyInstance
            .connect(adminMinter)
            .updateLearningMaterialLanguages(nonExistentData),
        ).to.be.revertedWith("Learning material does not exist");
      });

      it("Should revert if arrays do not have the same length", async () => {
        const mismatchedData = {
          ...baseData,
          names: ["en"], // only one language
        };

        await expect(
          medooLearningMaterialProxyInstance
            .connect(adminMinter)
            .updateLearningMaterialLanguages(mismatchedData),
        ).to.be.revertedWith("All input arrays must have the same length");
      });

      it("Should revert if non-admin tries to update learning material languages", async () => {
        const updatedData = {
          ...baseData,
        };

        await expect(
          medooLearningMaterialProxyInstance
            .connect(user1)
            .updateLearningMaterialLanguages(updatedData),
        ).to.be.revertedWith("Ownable: caller is not the admin");
      });
    });

    it("Should return all languages for a given learning material", async () => {
      const MedooLearningMaterial = await ethers.getContractFactory(
        "MedooLearningMaterial",
      );
      const medooLearningMaterialProxyInstance = MedooLearningMaterial.attach(
        medooLearningMaterialProxy.target,
      );

      // Set the admin to adminMinter
      await medooLearningMaterialProxyInstance
        .connect(owner)
        .setAdmin(adminMinter.address);

      // Prepare learning material data using FlatLearningMaterialData structure
      const learningMaterialData = {
        learningMaterialId: 45,
        learningMaterialType: "video",
        languages: ["en", "fr", "es"],
        names: ["English Title", "French Title", "Spanish Title"],
        contents: ["English Content", "French Content", "Spanish Content"],
        articles: ["English Article", "French Article", "Spanish Article"],
        quizId: "quiz123",
        metadataValues: ["metadata1", "metadata2", "metadata3"],
      };

      // Add learning material through proxy as adminMinter if not exists
      await medooLearningMaterialProxyInstance
        .connect(adminMinter)
        .addLearningMaterial(learningMaterialData);

      // Retrieve languages for the material
      const result =
        await medooLearningMaterialProxyInstance.getAllLanguagesOfLearningMaterial(
          learningMaterialData.learningMaterialId,
        );

      expect(result).to.deep.equal(learningMaterialData.languages);
    });

    it("Should revert if learning material does not exist", async () => {
      const MedooLearningMaterial = await ethers.getContractFactory(
        "MedooLearningMaterial",
      );
      const medooLearningMaterialProxyInstance = MedooLearningMaterial.attach(
        medooLearningMaterialProxy.target,
      );

      await expect(
        medooLearningMaterialProxyInstance.getAllLanguagesOfLearningMaterial(
          999,
        ),
      ).to.be.revertedWith("Material does not exist");
    });
  });
});
