const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { Interface } = require("ethers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const deployFnc = async () => {
  const [owner, user1, user2, user3, adminMinter] = await ethers.getSigners();

  const MedooProxyAdmin = await ethers.getContractFactory("MedooProxyAdmin");
  const medooProxyAdmin = await MedooProxyAdmin.deploy();
  await medooProxyAdmin.waitForDeployment();
  const medooProxyAdminAddress = await medooProxyAdmin.getAddress();

  const MedooCourseNFT = await ethers.getContractFactory("MedooCourseNFT");
  const medooCourseNFT = await MedooCourseNFT.deploy();
  await medooCourseNFT.waitForDeployment();
  const medooCourseNFTAddress = await medooCourseNFT.getAddress();

  const MedooCourseNFTProxy = await ethers.getContractFactory(
    "MedooCourseNFTProxy",
  );

  const medooCourseNFTInterface = new Interface([
    "function initialize(address) public",
  ]);
  const initializeData = medooCourseNFTInterface.encodeFunctionData(
    "initialize",
    [adminMinter.address],
  );

  const medooCourseNFTProxy = await MedooCourseNFTProxy.deploy(
    medooCourseNFTAddress,
    medooProxyAdminAddress,
    initializeData,
  );

  await medooCourseNFTProxy.waitForDeployment();
  const medooCourseNFTProxyAddress = await medooCourseNFTProxy.getAddress();

  return {
    medooCourseNFT,
    medooCourseNFTProxy,
    medooProxyAdmin,
    owner,
    user1,
    user2,
    user3,
    adminMinter,
  };
};

describe("MedooCourseNFTProxy Token", () => {
  let medooCourseNFT;
  let medooCourseNFTProxy;
  let medooProxyAdmin;
  let owner;
  let user1;
  let user2;
  let user3;
  let adminMinter;

  before(async () => {
    ({
      medooCourseNFT,
      medooCourseNFTProxy,
      medooProxyAdmin,
      owner,
      user1,
      user2,
      user3,
      adminMinter,
    } = await loadFixture(deployFnc));
  });

  describe("MedooCourseNFTProxy function test", () => {
    const course = {
      courseId: 1,
      languages: ["en", "fr"],
      names: ["English Name", "French Name"],
      descriptions: ["English Desc", "French Desc"],
      slug: "test-slug",
      studyType: "online",
      avatarUrl: "https://medoo.io",
      expectationsAndGoals: ["English Goal", "French Goal"],
      syllabusId: 2,
    };

    describe("MedooCourseNFT Contract", () => {
      it("Should revert to call direct function from this medooCourseNFT contract", async () => {
        const { medooCourseNFT, owner } = await loadFixture(deployFnc);
        await expect(medooCourseNFT.initialize(owner)).to.be.reverted;
      });
    });

    describe("MedooCourseNFT Proxy Admin Contract", () => {
      it("Should show the right owner of proxy contract", async () => {
        const proxyAddress = await medooProxyAdmin.getProxyAdmin(
          medooCourseNFTProxy.target,
        );
        expect(proxyAddress).to.be.equal(medooProxyAdmin.target);
      });

      it("Should show the right Proxy Implementation address", async () => {
        const implementationAddress =
          await medooProxyAdmin.getProxyImplementation(
            medooCourseNFTProxy.target,
          );
        expect(implementationAddress).to.be.equal(medooCourseNFT.target);
      });

      it("Should show the right deployer address", async () => {
        const deployer = await medooProxyAdmin.owner();
        expect(deployer).to.be.equal(owner);
      });
    });

    describe("MedooCourseNFT Proxy Contract", () => {
      it("Should mint a new token by admin", async () => {
        const MedooCourseNFT =
          await ethers.getContractFactory("MedooCourseNFT");
        medooCourseNFTProxy = MedooCourseNFT.attach(medooCourseNFTProxy.target);

        const tx = await medooCourseNFTProxy
          .connect(adminMinter)
          .mintNewTokens([user3.address], [course]);

        await expect(tx)
          .to.emit(medooCourseNFTProxy, "Transfer")
          .withArgs(anyValue, user3.address, course.courseId);

        const tokenUri = await medooCourseNFTProxy.tokenURI(course.courseId);
        expect(tokenUri).to.be.equal(
          `https://metadata.medoo.io/course/${course.courseId}`,
        );
      });

      it("Should mint multiple tokens by admin", async () => {
        const users = [user1, user2];
        const receivers = [];
        const courses = [];
        const numTokens = 50; // Mint 50 tokens

        for (let i = 0; i < numTokens; i++) {
          receivers.push(users[i % users.length].address); // Alternate between user1 and user2
          courses.push({
            ...course,
            courseId: i + 10,
            syllabusId: i + 1000,
          });
        }

        const tx = await medooCourseNFTProxy
          .connect(adminMinter)
          .mintNewTokens(receivers, courses);

        for (let i = 0; i < numTokens; i++) {
          await expect(tx)
            .to.emit(medooCourseNFTProxy, "Transfer")
            .withArgs(anyValue, receivers[i], courses[i].courseId);
        }

        // Check balances after minting
        const balanceUser1 = await medooCourseNFTProxy.balanceOf(user1.address);
        const balanceUser2 = await medooCourseNFTProxy.balanceOf(user2.address);

        expect(balanceUser1).to.equal(numTokens / 2);
        expect(balanceUser2).to.equal(numTokens / 2);
      });

      it("Should revert minting from non-admin account", async () => {
        await expect(
          medooCourseNFTProxy
            .connect(user1)
            .mintNewTokens([user1.address], [course]),
        ).to.be.revertedWith("Ownable: caller is not the admin");
      });

      it("Should mint using valid signature", async () => {
        const tokenId = 8386;
        const nonce = 0;
        const expiration = Math.floor(Date.now() / 1000) + 600;
        const messageHash = ethers.solidityPackedKeccak256(
          ["address", "uint256", "uint256", "uint256"],
          [user1.address, tokenId, nonce, expiration],
        );
        const signature = await adminMinter.signMessage(
          ethers.getBytes(messageHash),
        );

        const tx = await medooCourseNFTProxy
          .connect(user2)
          .mintNewTokenWithSignature(
            user1.address,
            { ...course, courseId: tokenId },
            nonce,
            expiration,
            signature,
          );

        await expect(tx)
          .to.emit(medooCourseNFTProxy, "Transfer")
          .withArgs(anyValue, user1.address, tokenId);

        expect(await medooCourseNFTProxy.nonces(user1.address)).to.be.equal(
          BigInt("1"),
        );
      });

      it("Should revert minting with reused nonce", async () => {
        const tokenId = 8386;
        const nonce = 0;
        const expiration = Math.floor(Date.now() / 1000) + 600;

        const messageHash = ethers.solidityPackedKeccak256(
          ["address", "uint256", "uint256", "uint256"],
          [user1.address, tokenId, nonce, expiration],
        );
        const signature = await adminMinter.signMessage(
          ethers.getBytes(messageHash),
        );

        await expect(
          medooCourseNFTProxy
            .connect(user2)
            .mintNewTokenWithSignature(
              user1.address,
              { ...course, courseId: tokenId },
              nonce,
              expiration,
              signature,
            ),
        ).to.be.revertedWith("Nonce already used or invalid");
      });

      describe("Retrieving course data", () => {
        it("Should return correct course data for a valid courseId and language", async () => {
          const fakeCourseId = 1000;

          // Mint the course token
          await medooCourseNFTProxy
            .connect(adminMinter)
            .mintNewTokens(
              [user1.address],
              [{ ...course, courseId: fakeCourseId }],
            );

          // Retrieve the course data in English
          const retrievedCourseEn = await medooCourseNFTProxy.getCourseData(
            fakeCourseId,
            "en",
          );

          expect(retrievedCourseEn.name).to.equal(course.names[0]);
          expect(retrievedCourseEn.description).to.equal(
            course.descriptions[0],
          );
          expect(retrievedCourseEn.expectationsAndGoals).to.equal(
            course.expectationsAndGoals[0],
          );
          expect(retrievedCourseEn.slug).to.equal(course.slug);
          expect(retrievedCourseEn.studyType).to.equal(course.studyType);
          expect(retrievedCourseEn.avatarUrl).to.equal(course.avatarUrl);
          expect(retrievedCourseEn.syllabusId).to.equal(course.syllabusId);

          // Retrieve the course data in French
          const retrievedCourseFr = await medooCourseNFTProxy.getCourseData(
            fakeCourseId,
            "fr",
          );

          expect(retrievedCourseFr.name).to.equal(course.names[1]);
          expect(retrievedCourseFr.description).to.equal(
            course.descriptions[1],
          );
          expect(retrievedCourseFr.expectationsAndGoals).to.equal(
            course.expectationsAndGoals[1],
          );
        });

        it("Should revert when retrieving non-existent course data", async () => {
          const nonExistentCourseId = 9999;

          // Expect the retrieval to revert
          await expect(
            medooCourseNFTProxy.getCourseData(nonExistentCourseId, "en"),
          ).to.be.revertedWith("Course does not exist");
        });
      });
    });

    describe("Updating course data", () => {
      const courseId = 7423;
      const initialCourse = {
        courseId,
        languages: ["en", "fr"],
        names: ["Initial English Name", "Nom français initial"],
        descriptions: [
          "Initial English Desc",
          "Description française initiale",
        ],
        slug: "initial-slug",
        studyType: "online",
        avatarUrl: "https://medoo.io/initial",
        expectationsAndGoals: [
          "Initial English Goal",
          "Objectif français initial",
        ],
        syllabusId: 2,
      };

      before(async () => {
        // Mint initial course data
        await medooCourseNFTProxy
          .connect(adminMinter)
          .mintNewTokens([user1.address], [initialCourse]);
      });

      it("Should update course data successfully", async () => {
        const updatedCourse = {
          courseId,
          languages: ["en", "fr"],
          names: ["Updated English Name", "Nom français mis à jour"],
          descriptions: [
            "Updated English Desc",
            "Description française mise à jour",
          ],
          slug: "updated-slug",
          studyType: "offline",
          avatarUrl: "https://medoo.io/updated",
          expectationsAndGoals: [
            "Updated English Goal",
            "Objectif français mis à jour",
          ],
          syllabusId: 3,
        };

        // Call updateCourseData
        await medooCourseNFTProxy
          .connect(adminMinter)
          .updateCourseData(updatedCourse);

        // Verify the updated data
        const retrievedCourseEn = await medooCourseNFTProxy.getCourseData(
          courseId,
          "en",
        );
        expect(retrievedCourseEn.name).to.equal(updatedCourse.names[0]);
        expect(retrievedCourseEn.description).to.equal(
          updatedCourse.descriptions[0],
        );
        expect(retrievedCourseEn.slug).to.equal(updatedCourse.slug);
        expect(retrievedCourseEn.studyType).to.equal(updatedCourse.studyType);
        expect(retrievedCourseEn.avatarUrl).to.equal(updatedCourse.avatarUrl);
        expect(retrievedCourseEn.expectationsAndGoals).to.equal(
          updatedCourse.expectationsAndGoals[0],
        );

        const retrievedCourseFr = await medooCourseNFTProxy.getCourseData(
          courseId,
          "fr",
        );
        expect(retrievedCourseFr.name).to.equal(updatedCourse.names[1]);
        expect(retrievedCourseFr.description).to.equal(
          updatedCourse.descriptions[1],
        );
        expect(retrievedCourseFr.expectationsAndGoals).to.equal(
          updatedCourse.expectationsAndGoals[1],
        );
      });

      it("Should revert when updating non-existent course", async () => {
        const updatedCourse = {
          courseId: 92342, // non exists course id
          languages: ["en"],
          names: ["Some Name"],
          descriptions: ["Some Description"],
          slug: "some-slug",
          studyType: "online",
          avatarUrl: "https://medoo.io",
          expectationsAndGoals: ["Some Goal"],
          syllabusId: 1,
        };

        await expect(
          medooCourseNFTProxy
            .connect(adminMinter)
            .updateCourseData(updatedCourse),
        ).to.be.revertedWith("Course does not exist");
      });

      it("Should revert when input arrays have different lengths", async () => {
        const updatedCourse = {
          courseId,
          languages: ["en", "fr"],
          names: ["Name Only for English"],
          descriptions: ["Description for English"],
          slug: "some-slug",
          studyType: "online",
          avatarUrl: "https://medoo.io",
          expectationsAndGoals: ["Some Goal"],
          syllabusId: 1,
        };

        await expect(
          medooCourseNFTProxy
            .connect(adminMinter)
            .updateCourseData(updatedCourse),
        ).to.be.revertedWith("Array lengths must match");
      });

      it("Should revert when called by non-admin", async () => {
        const updatedCourse = {
          courseId,
          languages: ["en", "fr"],
          names: ["Name Only for English"],
          descriptions: ["Description for English"],
          slug: "some-slug",
          studyType: "online",
          avatarUrl: "https://medoo.io",
          expectationsAndGoals: ["Some Goal"],
          syllabusId: 1,
        };

        await expect(
          medooCourseNFTProxy.connect(user1).updateCourseData(updatedCourse),
        ).to.be.revertedWith("Ownable: caller is not the admin");
      });
    });

    describe("Getting languages of a course", () => {
      const initialCourse = {
        courseId: 1642,
        languages: ["en", "fr"],
        names: ["Initial English Name", "Nom français initial"],
        descriptions: [
          "Initial English Desc",
          "Description française initiale",
        ],
        slug: "initial-slug",
        studyType: "online",
        avatarUrl: "https://medoo.io/initial",
        expectationsAndGoals: [
          "Initial English Goal",
          "Objectif français initial",
        ],
        syllabusId: 2,
      };

      before(async () => {
        // Mint initial course data
        await medooCourseNFTProxy
          .connect(adminMinter)
          .mintNewTokens([user1.address], [initialCourse]);
      });

      it("Should return the correct languages for an existing course", async () => {
        const languages = await medooCourseNFTProxy.getAllLanguagesOfCourse(
          initialCourse.courseId,
        );
        expect(languages).to.deep.equal(initialCourse.languages);
      });

      it("Should revert when querying languages for a non-existent course", async () => {
        await expect(
          medooCourseNFTProxy.getAllLanguagesOfCourse(9999),
        ).to.be.revertedWith("course does not exist");
      });
    });
  });
});
