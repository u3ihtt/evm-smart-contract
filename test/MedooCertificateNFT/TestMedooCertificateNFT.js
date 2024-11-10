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

  const MedooCertificateNFT = await ethers.getContractFactory(
    "MedooCertificateNFT",
  );
  const medooCertificateNFT = await MedooCertificateNFT.deploy();
  await medooCertificateNFT.waitForDeployment();
  const medooCertificateNFTAddress = await medooCertificateNFT.getAddress();

  const MedooCertificateNFTProxy = await ethers.getContractFactory(
    "MedooCertificateNFTProxy",
  );

  const medooCertificateNFTInterface = new Interface([
    "function initialize(address) public",
  ]);
  const initializeData = medooCertificateNFTInterface.encodeFunctionData(
    "initialize",
    [adminMinter.address],
  );

  const medooCertificateNFTProxy = await MedooCertificateNFTProxy.deploy(
    medooCertificateNFTAddress,
    medooProxyAdminAddress,
    initializeData,
  );

  await medooCertificateNFTProxy.waitForDeployment();
  const medooCertificateNFTProxyAddress =
    await medooCertificateNFTProxy.getAddress();

  return {
    medooCertificateNFT,
    medooCertificateNFTProxy,
    medooProxyAdmin,
    owner,
    user1,
    user2,
    adminMinter,
  };
};

describe("MedooCertificateNFTProxy Token", () => {
  let medooCertificateNFT;
  let medooCertificateNFTProxy;
  let medooProxyAdmin;
  let owner;
  let user1;
  let user2;
  let adminMinter;

  before(async () => {
    ({
      medooCertificateNFT,
      medooCertificateNFTProxy,
      medooProxyAdmin,
      owner,
      user1,
      user2,
      adminMinter,
    } = await loadFixture(deployFnc));
  });

  describe("MedooCertificateNFTProxy function test", () => {
    describe("MedooCertificateNFT Contract", () => {
      it("Should revert to call direct function from this medooCertificateNFT contract", async () => {
        const { medooCertificateNFT, owner } = await loadFixture(deployFnc);
        await expect(medooCertificateNFT.initialize(owner)).to.be.reverted;
      });
    });

    describe("MedooCertificateNFT Proxy Admin Contract", () => {
      it("Should the right owner of proxy contract", async () => {
        const proxyAddress = await medooProxyAdmin.getProxyAdmin(
          medooCertificateNFTProxy.target,
        );
        expect(proxyAddress).to.be.equal(medooProxyAdmin.target);
      });

      it("Should the right Proxy Implementation address", async () => {
        const implementationAddress =
          await medooProxyAdmin.getProxyImplementation(
            medooCertificateNFTProxy.target,
          );
        expect(implementationAddress).to.be.equal(medooCertificateNFT.target);
      });
      it("Should the right deployer address", async () => {
        const deployer = await medooProxyAdmin.owner();
        expect(deployer).to.be.equal(owner);
      });
    });

    describe("MedooCertificateNFT Proxy Contract", () => {
      it("Should the right information of medooCertificateNFT contract", async () => {
        const MedooCertificateNFT = await ethers.getContractFactory(
          "MedooCertificateNFT",
        );
        medooCertificateNFTProxy = MedooCertificateNFT.attach(
          medooCertificateNFTProxy.target,
        );
        const ProxyCallOwner = await medooCertificateNFTProxy.owner();
        const ProxyCallAdmin = await medooCertificateNFTProxy.admin();
        const ProxyCallBalanceOfDeployer =
          await medooCertificateNFTProxy.balanceOf(owner.address);
        expect(ProxyCallOwner).to.be.equal(owner.address);
        expect(ProxyCallAdmin).to.be.equal(adminMinter.address);
        expect(ProxyCallBalanceOfDeployer).to.be.equal(BigInt("0"));
      });

      it("Should work when admin mint token", async () => {
        const MedooCertificateNFT = await ethers.getContractFactory(
          "MedooCertificateNFT",
        );
        medooCertificateNFTProxy = MedooCertificateNFT.attach(
          medooCertificateNFTProxy.target,
        );

        const tx = await medooCertificateNFTProxy
          .connect(adminMinter)
          .mintNewTokens([user1.address], [1]);
        await expect(tx)
          .to.emit(medooCertificateNFTProxy, "Transfer")
          .withArgs(anyValue, user1.address, 1);

        const ProxyCallUri = await medooCertificateNFTProxy.tokenURI(1);
        const ProxyCallBalanceOfDeployer =
          await medooCertificateNFTProxy.balanceOf(user1.address);
        expect(ProxyCallUri).to.be.equal(
          "https://metadata.medoo.io/certificate/" + 1,
        );
        expect(ProxyCallBalanceOfDeployer).to.be.equal(BigInt("1"));
      });

      it("Should work when admin mint multiple tokens", async () => {
        const MedooCertificateNFT = await ethers.getContractFactory(
          "MedooCertificateNFT",
        );
        medooCertificateNFTProxy = MedooCertificateNFT.attach(
          medooCertificateNFTProxy.target,
        );
        const users = [user1, user2, adminMinter, owner];
        const receivers = [];
        const tokenIds = [];
        const length = 100;

        const randomArray = [];
        for (let i = 0; i < length; i++) {
          const randomValue = Math.floor(Math.random() * 4); // Generates a random number between 0 and 3
          receivers.push(users[randomValue].address);
          tokenIds.push(i + 10);
        }

        const tx = await medooCertificateNFTProxy
          .connect(adminMinter)
          .mintNewTokens(receivers, tokenIds);

        for (let i = 0; i < length; i++) {
          await expect(tx)
            .to.emit(medooCertificateNFTProxy, "Transfer")
            .withArgs(anyValue, receivers[i], tokenIds[i]);
        }

        // console.log(await medooCertificateNFTProxy.balanceOf(user1.address));
        // console.log(await medooCertificateNFTProxy.balanceOf(user2.address));
        // console.log(await medooCertificateNFTProxy.balanceOf(adminMinter.address));
        // console.log(await medooCertificateNFTProxy.balanceOf(owner.address));
      });

      it("Should fail when not admin mint token", async () => {
        const MedooCertificateNFT = await ethers.getContractFactory(
          "MedooCertificateNFT",
        );
        medooCertificateNFTProxy = MedooCertificateNFT.attach(
          medooCertificateNFTProxy.target,
        );

        await expect(
          medooCertificateNFTProxy
            .connect(user1)
            .mintNewTokens([user1.address], [1]),
        ).to.be.revertedWith("Ownable: caller is not the admin");
      });

      it("Should work admin force transfer token", async () => {
        const MedooCertificateNFT = await ethers.getContractFactory(
          "MedooCertificateNFT",
        );
        medooCertificateNFTProxy = MedooCertificateNFT.attach(
          medooCertificateNFTProxy.target,
        );

        const tx = await medooCertificateNFTProxy
          .connect(adminMinter)
          .adminTransferFrom(user1.address, user2.address, 1);
        await expect(tx)
          .to.emit(medooCertificateNFTProxy, "Transfer")
          .withArgs(user1.address, user2.address, 1);
      });

      it("Should fail when not admin force transfer token", async () => {
        const MedooCertificateNFT = await ethers.getContractFactory(
          "MedooCertificateNFT",
        );
        medooCertificateNFTProxy = MedooCertificateNFT.attach(
          medooCertificateNFTProxy.target,
        );

        await expect(
          medooCertificateNFTProxy
            .connect(user1)
            .adminTransferFrom(user2.address, user1.address, 1),
        ).to.be.revertedWith("Ownable: caller is not the admin");
      });

      it("Should fail when normal user transfer token", async () => {
        const MedooCertificateNFT = await ethers.getContractFactory(
          "MedooCertificateNFT",
        );
        medooCertificateNFTProxy = MedooCertificateNFT.attach(
          medooCertificateNFTProxy.target,
        );

        await expect(
          medooCertificateNFTProxy
            .connect(user1)
            .transferFrom(user1.address, user2.address, 1),
        ).to.be.revertedWith("Transfers are disabled for this certificate");

        await expect(
          medooCertificateNFTProxy
            .connect(user1)
            .safeTransferFrom(user1.address, user2.address, 1),
        ).to.be.revertedWith("Transfers are disabled for this certificate");
      });
    });
  });
});
