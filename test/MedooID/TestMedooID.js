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

  const MedooID = await ethers.getContractFactory("MedooID");
  const medooID = await MedooID.deploy();
  await medooID.waitForDeployment();
  const medooIDAddress = await medooID.getAddress();

  const MedooIDProxy = await ethers.getContractFactory("MedooIDProxy");

  const medooIDInterface = new Interface([
    "function initialize(address) public",
  ]);
  const initializeData = medooIDInterface.encodeFunctionData("initialize", [
    adminMinter.address,
  ]);

  const medooIDProxy = await MedooIDProxy.deploy(
    medooIDAddress,
    medooProxyAdminAddress,
    initializeData,
  );

  await medooIDProxy.waitForDeployment();
  const medooIDProxyAddress = await medooIDProxy.getAddress();

  return {
    medooID,
    medooIDProxy,
    medooProxyAdmin,
    owner,
    user1,
    user2,
    adminMinter,
  };
};

describe("MedooIDProxy Token", () => {
  let medooID;
  let medooIDProxy;
  let medooProxyAdmin;
  let owner;
  let user1;
  let user2;
  let adminMinter;

  before(async () => {
    ({
      medooID,
      medooIDProxy,
      medooProxyAdmin,
      owner,
      user1,
      user2,
      adminMinter,
    } = await loadFixture(deployFnc));
  });

  describe("MedooIDProxy function test", () => {
    describe("MedooID Contract", () => {
      it("Should revert to call direct function from this medooID contract", async () => {
        const { medooID, owner } = await loadFixture(deployFnc);
        await expect(medooID.initialize(owner)).to.be.reverted;
      });
    });

    describe("MedooID Proxy Admin Contract", () => {
      it("Should the right owner of proxy contract", async () => {
        const proxyAddress = await medooProxyAdmin.getProxyAdmin(
          medooIDProxy.target,
        );
        expect(proxyAddress).to.be.equal(medooProxyAdmin.target);
      });

      it("Should the right Proxy Implementation address", async () => {
        const implementationAddress =
          await medooProxyAdmin.getProxyImplementation(medooIDProxy.target);
        expect(implementationAddress).to.be.equal(medooID.target);
      });
      it("Should the right deployer address", async () => {
        const deployer = await medooProxyAdmin.owner();
        expect(deployer).to.be.equal(owner);
      });
    });

    describe("MedooID Proxy Contract", () => {
      it("Should the right information of medooID contract", async () => {
        const MedooID = await ethers.getContractFactory("MedooID");
        medooIDProxy = MedooID.attach(medooIDProxy.target);
        const ProxyCallOwner = await medooIDProxy.owner();
        const ProxyCallAdmin = await medooIDProxy.admin();
        const ProxyCallBalanceOfDeployer = await medooIDProxy.balanceOf(
          owner.address,
        );
        expect(ProxyCallOwner).to.be.equal(owner.address);
        expect(ProxyCallAdmin).to.be.equal(adminMinter.address);
        expect(ProxyCallBalanceOfDeployer).to.be.equal(BigInt("0"));
      });

      it("Should work when admin mint token", async () => {
        const MedooID = await ethers.getContractFactory("MedooID");
        medooIDProxy = MedooID.attach(medooIDProxy.target);

        const tx = await medooIDProxy
          .connect(adminMinter)
          .mintNewTokens([user1.address], [1]);
        await expect(tx)
          .to.emit(medooIDProxy, "Transfer")
          .withArgs(anyValue, user1.address, 1);

        const ProxyCallUri = await medooIDProxy.tokenURI(1);
        const ProxyCallBalanceOfDeployer = await medooIDProxy.balanceOf(
          user1.address,
        );
        expect(ProxyCallUri).to.be.equal(
          "https://metadata.medoo.io/medooid/" + 1,
        );
        expect(ProxyCallBalanceOfDeployer).to.be.equal(BigInt("1"));
      });

      it("Should work when admin mint multiple tokens", async () => {
        const MedooID = await ethers.getContractFactory("MedooID");
        medooIDProxy = MedooID.attach(medooIDProxy.target);
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

        const tx = await medooIDProxy
          .connect(adminMinter)
          .mintNewTokens(receivers, tokenIds);

        for (let i = 0; i < length; i++) {
          await expect(tx)
            .to.emit(medooIDProxy, "Transfer")
            .withArgs(anyValue, receivers[i], tokenIds[i]);
        }

        // console.log(await medooIDProxy.balanceOf(user1.address));
        // console.log(await medooIDProxy.balanceOf(user2.address));
        // console.log(await medooIDProxy.balanceOf(adminMinter.address));
        // console.log(await medooIDProxy.balanceOf(owner.address));
      });

      it("Should fail when not admin mint token", async () => {
        const MedooID = await ethers.getContractFactory("MedooID");
        medooIDProxy = MedooID.attach(medooIDProxy.target);

        await expect(
          medooIDProxy.connect(user1).mintNewTokens([user1.address], [1]),
        ).to.be.revertedWith("Ownable: caller is not the admin");
      });

      it("Should work admin force transfer token", async () => {
        const MedooID = await ethers.getContractFactory("MedooID");
        medooIDProxy = MedooID.attach(medooIDProxy.target);

        const tx = await medooIDProxy
          .connect(adminMinter)
          .adminTransferFrom(user1.address, user2.address, 1);
        await expect(tx)
          .to.emit(medooIDProxy, "Transfer")
          .withArgs(user1.address, user2.address, 1);
      });

      it("Should fail when not admin force transfer token", async () => {
        const MedooID = await ethers.getContractFactory("MedooID");
        medooIDProxy = MedooID.attach(medooIDProxy.target);

        await expect(
          medooIDProxy
            .connect(user1)
            .adminTransferFrom(user2.address, user1.address, 1),
        ).to.be.revertedWith("Ownable: caller is not the admin");
      });
    });
  });
});
