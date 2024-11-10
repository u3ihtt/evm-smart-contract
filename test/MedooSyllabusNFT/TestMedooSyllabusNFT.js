const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = ethers;
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { Interface } = require("ethers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const deployFnc = async () => {
  const [owner, user1, user2, adminMinter] = await ethers.getSigners();

  const MedooProxyAdmin = await ethers.getContractFactory("MedooProxyAdmin");
  const medooProxyAdmin = await MedooProxyAdmin.deploy();
  await medooProxyAdmin.waitForDeployment();
  const medooProxyAdminAddress = await medooProxyAdmin.getAddress();

  const MedooSyllabusNFT = await ethers.getContractFactory("MedooSyllabusNFT");
  const medooSyllabusNFT = await MedooSyllabusNFT.deploy();
  await medooSyllabusNFT.waitForDeployment();
  const medooSyllabusNFTAddress = await medooSyllabusNFT.getAddress();

  const MedooSyllabusNFTProxy = await ethers.getContractFactory(
    "MedooSyllabusNFTProxy",
  );

  const medooSyllabusNFTInterface = new Interface([
    "function initialize(address) public",
  ]);
  const initializeData = medooSyllabusNFTInterface.encodeFunctionData(
    "initialize",
    [adminMinter.address],
  );

  const medooSyllabusNFTProxy = await MedooSyllabusNFTProxy.deploy(
    medooSyllabusNFTAddress,
    medooProxyAdminAddress,
    initializeData,
  );

  await medooSyllabusNFTProxy.waitForDeployment();
  const medooSyllabusNFTProxyAddress = await medooSyllabusNFTProxy.getAddress();

  return {
    medooSyllabusNFT,
    medooSyllabusNFTProxy,
    medooProxyAdmin,
    owner,
    user1,
    user2,
    adminMinter,
  };
};

describe("MedooSyllabusNFTProxy Token", () => {
  let medooSyllabusNFT;
  let medooSyllabusNFTProxy;
  let medooProxyAdmin;
  let owner;
  let user1;
  let user2;
  let adminMinter;

  before(async () => {
    ({
      medooSyllabusNFT,
      medooSyllabusNFTProxy,
      medooProxyAdmin,
      owner,
      user1,
      user2,
      adminMinter,
    } = await loadFixture(deployFnc));
    const MedooSyllabusNFT =
      await ethers.getContractFactory("MedooSyllabusNFT");
    medooSyllabusNFTProxy = MedooSyllabusNFT.attach(
      medooSyllabusNFTProxy.target,
    );
  });

  describe("MedooSyllabusNFTProxy function test", () => {
    const syllabus = {
      syllabusId: 1,
      languages: ["en", "fr"],
      names: ["Intro to Blockchain", "Introduction à la Blockchain"],
      descriptions: ["A beginner's course", "Un cours pour débutants"],
      children: [
        {
          learningMaterialId: 1,
          parentId: 0,
          childIds: [2, 3, 4],
        },
        {
          learningMaterialId: 2,
          parentId: 1,
          childIds: [],
        },
        {
          learningMaterialId: 3,
          parentId: 1,
          childIds: [],
        },
        {
          learningMaterialId: 4,
          parentId: 1,
          childIds: [],
        },
      ],
    };

    describe("MedooSyllabusNFT Contract", () => {
      it("Should revert direct function calls to MedooSyllabusNFT contract", async () => {
        await expect(medooSyllabusNFT.initialize(owner)).to.be.reverted;
      });
    });

    describe("MedooSyllabusNFT Proxy Admin Contract", () => {
      it("Should verify the correct proxy contract owner", async () => {
        const proxyAddress = await medooProxyAdmin.getProxyAdmin(
          medooSyllabusNFTProxy.target,
        );
        expect(proxyAddress).to.be.equal(medooProxyAdmin.target);
      });

      it("Should verify the correct Proxy Implementation address", async () => {
        const implementationAddress =
          await medooProxyAdmin.getProxyImplementation(
            medooSyllabusNFTProxy.target,
          );
        expect(implementationAddress).to.be.equal(medooSyllabusNFT.target);
      });

      it("Should verify the correct deployer address", async () => {
        const deployer = await medooProxyAdmin.owner();
        expect(deployer).to.be.equal(owner.address);
      });
    });

    describe("MedooSyllabusNFT Proxy Contract", () => {
      it("Should validate proxy contract information", async () => {
        const ProxyCallOwner = await medooSyllabusNFTProxy.owner();
        const ProxyCallAdmin = await medooSyllabusNFTProxy.admin();
        const ProxyCallBalanceOfDeployer =
          await medooSyllabusNFTProxy.balanceOf(owner.address);

        expect(ProxyCallOwner).to.be.equal(owner.address);
        expect(ProxyCallAdmin).to.be.equal(adminMinter.address);
        expect(ProxyCallBalanceOfDeployer).to.be.equal(BigInt("0"));
      });

      it("Should allow admin to mint token", async () => {
        const tx = await medooSyllabusNFTProxy
          .connect(adminMinter)
          .mintNewTokens([user1.address], [syllabus]);

        await expect(tx)
          .to.emit(medooSyllabusNFTProxy, "Transfer")
          .withArgs(anyValue, user1.address, syllabus.syllabusId);

        const ProxyCallUri = await medooSyllabusNFTProxy.tokenURI(
          syllabus.syllabusId,
        );
        const ProxyCallBalanceOfDeployer =
          await medooSyllabusNFTProxy.balanceOf(user1.address);

        expect(ProxyCallUri).to.be.equal(
          `https://metadata.medoo.io/syllabus/${syllabus.syllabusId}`,
        );
        expect(ProxyCallBalanceOfDeployer).to.be.equal(BigInt("1"));
      });

      it("Should allow admin to mint multiple tokens", async () => {
        const users = [user1, user2, adminMinter, owner];
        const receivers = [];
        const syllabuses = [];
        const length = 50;

        for (let i = 0; i < length; i++) {
          const randomUser = users[Math.floor(Math.random() * users.length)];
          receivers.push(randomUser.address);
          syllabuses.push({
            ...syllabus,
            syllabusId: i + 894123482,
          });
        }

        const tx = await medooSyllabusNFTProxy
          .connect(adminMinter)
          .mintNewTokens(receivers, syllabuses);

        for (let i = 0; i < length; i++) {
          await expect(tx)
            .to.emit(medooSyllabusNFTProxy, "Transfer")
            .withArgs(anyValue, receivers[i], syllabuses[i].syllabusId);
        }
      });

      it("Should reject unauthorized mint attempt", async () => {
        await expect(
          medooSyllabusNFTProxy
            .connect(user1)
            .mintNewTokens([user1.address], [syllabus]),
        ).to.be.revertedWith("Ownable: caller is not the admin");
      });

      it("Should allow minting with a valid admin signature", async () => {
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

        const tx = await medooSyllabusNFTProxy
          .connect(user2)
          .mintNewTokenWithSignature(
            user1.address,
            { ...syllabus, syllabusId: tokenId },
            nonce,
            expiration,
            signature,
          );

        await expect(tx)
          .to.emit(medooSyllabusNFTProxy, "Transfer")
          .withArgs(anyValue, user1.address, tokenId);

        expect(await medooSyllabusNFTProxy.nonces(user1.address)).to.be.equal(
          BigInt("1"),
        );
      });

      it("Should correctly retrieve syllabus data in specified language", async () => {
        const fakeSyllabusId = 1000;
        await medooSyllabusNFTProxy
          .connect(adminMinter)
          .mintNewTokens(
            [user1.address],
            [{ ...syllabus, syllabusId: fakeSyllabusId }],
          );

        const [name, description] =
          await medooSyllabusNFTProxy.getSyllabusDataById(fakeSyllabusId, "en");

        expect(name).to.equal(syllabus.names[0]);
        expect(description).to.equal(syllabus.descriptions[0]);
      });

      it("Should revert when trying to get syllabus data for a non-existent syllabusId", async () => {
        const nonExistentSyllabusId = 9999; // An ID that hasn't been minted
        await expect(
          medooSyllabusNFTProxy.getSyllabusDataById(
            nonExistentSyllabusId,
            "en",
          ),
        ).to.be.revertedWith("Syllabus does not exist");
      });

      describe("updateSyllabusData function", () => {
        const initialSyllabusData = {
          syllabusId: 18242,
          languages: ["en", "es"],
          names: ["Initial Title", "Título Inicial"],
          descriptions: ["Initial Description", "Descripción Inicial"],
          children: [
            {
              learningMaterialId: 1,
              parentId: 0, // Root level
              childIds: [2, 3],
            },
            {
              learningMaterialId: 2,
              parentId: 1, // Child of learning material 1
              childIds: [],
            },
            {
              learningMaterialId: 3,
              parentId: 1, // Child of learning material 1
              childIds: [],
            },
          ],
        };
        const updatedSyllabusData = {
          syllabusId: 18242,
          languages: ["en", "es"],
          names: ["Updated Title", "Título Actualizado"],
          descriptions: ["Updated Description", "Descripción Actualizada"],
          children: [
            {
              learningMaterialId: 1,
              parentId: 0,
              childIds: [2, 3, 6],
            },
            {
              learningMaterialId: 2,
              parentId: 1,
              childIds: [],
            },
            {
              learningMaterialId: 3,
              parentId: 1,
              childIds: [],
            },
            {
              learningMaterialId: 6,
              parentId: 1,
              childIds: [],
            },
            {
              learningMaterialId: 924,
              parentId: 0,
              childIds: [],
            },
          ],
        };

        before(async () => {
          await medooSyllabusNFTProxy
            .connect(adminMinter)
            .mintNewTokens([user1.address], [initialSyllabusData]);
        });

        it("Should allow admin to update syllabus data", async () => {
          const tx = await medooSyllabusNFTProxy
            .connect(adminMinter)
            .updateSyllabusData(updatedSyllabusData);

          const syllabus = await medooSyllabusNFTProxy.getSyllabusDataById(
            updatedSyllabusData.syllabusId,
            "en",
          );

          expect(syllabus[0]).to.equal(updatedSyllabusData.names[0]);
          expect(syllabus[1]).to.equal(updatedSyllabusData.descriptions[0]);
          expect(syllabus[2]).to.equal(updatedSyllabusData.syllabusId);
          // test children
          syllabus[3].map((children, idx) => {
            const updatedChildren = updatedSyllabusData.children[idx];
            expect(children[0]).to.equal(updatedChildren.learningMaterialId);
            expect(children[1]).to.equal(updatedChildren.parentId);
            children[2].map((childId, childIdx) => {
              expect(childId).to.equal(updatedChildren.childIds[childIdx]);
            });
          });
        });

        it("Should revert when unauthorized user tries to update syllabus data", async () => {
          await expect(
            medooSyllabusNFTProxy
              .connect(user1)
              .updateSyllabusData(updatedSyllabusData),
          ).to.be.revertedWith("Ownable: caller is not the admin");
        });

        it("Should revert when trying to update non-existent syllabus data", async () => {
          await expect(
            medooSyllabusNFTProxy.updateSyllabusData({
              syllabusId: 9999,
              languages: ["en"],
              names: ["Non-existent Title"],
              descriptions: ["Non-existent Description"],
              children: [],
            }),
          ).to.be.revertedWith("Syllabus does not exist");
        });
      });
    });
  });
});
