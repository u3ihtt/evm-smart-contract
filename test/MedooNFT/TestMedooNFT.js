const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = ethers;
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { Interface } = require("ethers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const deployFnc = async () => {
  const [owner, user1, user2, feeReceiver, adminMinter] =
    await ethers.getSigners();

  // deploy medoo proxy token contract
  const Medoo = await ethers.getContractFactory("Medoo");
  const medoo = await Medoo.deploy();
  await medoo.waitForDeployment();
  const medooAddress = await medoo.getAddress();

  const MedooProxyAdmin = await ethers.getContractFactory("MedooProxyAdmin");
  const medooProxyAdmin = await MedooProxyAdmin.deploy();
  await medooProxyAdmin.waitForDeployment();
  const medooProxyAdminAddress = await medooProxyAdmin.getAddress();

  const medooInterface = new Interface(["function initialize() external"]);
  const initData = medooInterface.encodeFunctionData("initialize");

  const MedooProxy = await ethers.getContractFactory("MedooProxy");

  const medooProxy = await MedooProxy.deploy(
    medooAddress,
    medooProxyAdminAddress,
    initData
  );
  await medooProxy.waitForDeployment();
  const medooProxyAddress = await medooProxy.getAddress();

  const MedooNFT = await ethers.getContractFactory("MedooNFT");
  const medooNFT = await MedooNFT.deploy();
  await medooNFT.waitForDeployment();
  const medooNFTAddress = await medooNFT.getAddress();

  const MedooNFTProxy = await ethers.getContractFactory("MedooNFTProxy");

  const medooNFTInterface = new Interface([
    "function initialize(address, address , address , uint256 ) public",
  ]);
  const mintFee = ethers.parseEther("120"); // Replace with your desired value, gia su la 120 medoo token
  const initializeData = medooNFTInterface.encodeFunctionData("initialize", [
    feeReceiver.address,
    adminMinter.address,
    medooProxy.target,
    mintFee,
  ]);

  const medooNFTProxy = await MedooNFTProxy.deploy(
    medooNFTAddress,
    medooProxyAdminAddress,
    initializeData
  );

  await medooNFTProxy.waitForDeployment();
  const medooNFTProxyAddress = await medooNFTProxy.getAddress();

  return {
    medoo,
    medooProxy,
    medooNFT,
    medooNFTProxy,
    medooProxyAdmin,
    owner,
    user1,
    user2,
    feeReceiver,
    adminMinter,
    mintFee,
  };
};

describe("MedooNFTProxy Token", function () {
  let medooNFT, medooNFTProxy, medooProxyAdmin;
  let owner, user1, user2, feeReceiver, adminMinter;
  let medooProxy, medoo;
  let mintFee;
  let DENOMINATOR = 1000;
  let MAX_FRAGMENT = 10;

  beforeEach(async function () {
    ({
      medoo,
      medooProxy,
      medooNFT,
      medooNFTProxy,
      medooProxyAdmin,
      owner,
      user1,
      user2,
      feeReceiver,
      adminMinter,
      mintFee,
    } = await loadFixture(deployFnc));
  });

  async function mintNFT(minter, balance, approve, amount) {
    await medooProxy.transfer(minter, balance);
    await medooProxy.connect(minter).approve(medooNFTProxy.target, approve);
    return await medooNFTProxy.connect(minter).mint(amount);
  }

  describe("MedooNFTProxy function test", function () {
    describe("MedooNFT v1 Contract", function () {
      it("Should revert to call direct function from this medooNFT contract", async function () {
        const { medooNFT, owner } = await loadFixture(deployFnc);
        await expect(medooNFT.initialize(owner, owner, owner, "1000000")).to.be
          .reverted;
        // const balance = await medooNFT.balanceOf(owner.address);
        // expect(balance).to.equal(0);
      });
    });

    describe("MedooNFT Proxy Admin Contract", function () {
      it("Should the right owner of proxy contract", async function () {
        const proxyAddress = await medooProxyAdmin.getProxyAdmin(
          medooNFTProxy.target
        );
        expect(proxyAddress).to.be.equal(medooProxyAdmin.target);
        const proxyMedooAddress = await medooProxyAdmin.getProxyAdmin(
          medooProxy.target
        );
        expect(proxyMedooAddress).to.be.equal(medooProxyAdmin.target);
      });

      it("Should the right Proxy Implementation address", async function () {
        const implementationAddress =
          await medooProxyAdmin.getProxyImplementation(medooNFTProxy.target);
        expect(implementationAddress).to.be.equal(medooNFT.target);

        const implementationMedooAddress =
          await medooProxyAdmin.getProxyImplementation(medooProxy.target);
        expect(implementationMedooAddress).to.be.equal(medoo.target);
      });
      it("Should the right deployer address", async function () {
        const deployer = await medooProxyAdmin.owner();
        expect(deployer).to.be.equal(owner);
      });
    });

    describe("MedooNFT Proxy Contract", function () {
      it("Should the right information of medooNFT contract", async function () {
        const MedooNFT = await ethers.getContractFactory("MedooNFT");
        medooNFTProxy = await MedooNFT.attach(medooNFTProxy.target);
        const ProxyCallMedooToken = await medooNFTProxy.medooToken();
        // const ProxyCallUri = await medooNFTProxy.uri(0);
        const ProxyCallOwner = await medooNFTProxy.owner();
        const ProxyCallMintFee = await medooNFTProxy.mintFee();
        const ProxyCallBalanceOfDeployer = await medooNFTProxy.balanceOf(
          owner.address
        );
        expect(ProxyCallOwner).to.be.equal(owner.address);
        expect(ProxyCallMedooToken).to.be.equal(medooProxy.target);
        expect(ProxyCallMintFee).to.be.equal(ethers.parseEther("120"));
        // expect(ProxyCallUri).to.be.equal("https://medoo.io/metadata/0");
        expect(ProxyCallBalanceOfDeployer).to.be.equal(BigInt("0"));
      });

      it("Should be reverted when minter not approve token", async function () {
        const MedooNFT = await ethers.getContractFactory("MedooNFT");
        medooNFTProxy = await MedooNFT.attach(medooNFTProxy.target);
        const Medoo = await ethers.getContractFactory("Medoo");
        medooProxy = await Medoo.attach(medooProxy.target);

        await expect(mintNFT(user1, mintFee, 0, 2)).to.be.revertedWith(
          "ERC20: insufficient allowance"
        );
      });

      it("Should be reverted when minter not have enough token", async function () {
        const MedooNFT = await ethers.getContractFactory("MedooNFT");
        medooNFTProxy = await MedooNFT.attach(medooNFTProxy.target);
        const Medoo = await ethers.getContractFactory("Medoo");
        medooProxy = await Medoo.attach(medooProxy.target);

        await expect(mintNFT(user1, 0, mintFee, 2)).to.be.revertedWith(
          "ERC20: transfer amount exceeds balance"
        );
      });

      it("Should be revereted when mint with amount 0", async function () {
        const MedooNFT = await ethers.getContractFactory("MedooNFT");
        medooNFTProxy = await MedooNFT.attach(medooNFTProxy.target);
        const Medoo = await ethers.getContractFactory("Medoo");
        medooProxy = await Medoo.attach(medooProxy.target);

        await expect(mintNFT(user1, mintFee, mintFee, 0)).to.be.revertedWith(
          "Invalid number fragment."
        );
      });

      it("Should work when mint through proxy contract", async function () {
        const MedooNFT = await ethers.getContractFactory("MedooNFT");
        medooNFTProxy = await MedooNFT.attach(medooNFTProxy.target);
        const Medoo = await ethers.getContractFactory("Medoo");
        medooProxy = await Medoo.attach(medooProxy.target);

        let tx = await mintNFT(user1, mintFee, mintFee, 2);
        await expect(tx)
          .to.emit(medooNFTProxy, "TokenMinted")
          .withArgs(user1.address, 1, 2);

        await expect(tx)
          .to.emit(medooNFTProxy, "Transfer")
          .withArgs(anyValue, user1.address, 1 * DENOMINATOR + 1);
        await expect(tx)
          .to.emit(medooNFTProxy, "Transfer")
          .withArgs(anyValue, user1.address, 1 * DENOMINATOR + 2);

        // emit Transfer(address(0), to, tokenId);

        const ProxyCallUri = await medooNFTProxy.tokenURI(1 * DENOMINATOR + 1);
        const ProxyCallBalanceOfDeployer = await medooNFTProxy.balanceOf(
          user1.address
        );
        expect(ProxyCallUri).to.be.equal(
          "https://nft-storage.medoo.io/" + (1 * DENOMINATOR + 1)
        );
        expect(ProxyCallBalanceOfDeployer).to.be.equal(BigInt("2"));

        const ProxyCallBalanceOfFeeReceiver = await medooProxy.balanceOf(
          feeReceiver.address
        );
        expect(ProxyCallBalanceOfFeeReceiver).to.be.equal(mintFee);
        expect(await medooProxy.balanceOf(user1.address)).to.be.equal(0);
      });

      it("Should work when get tokens from user and get addresses from token", async function () {
        const MedooNFT = await ethers.getContractFactory("MedooNFT");
        medooNFTProxy = await MedooNFT.attach(medooNFTProxy.target);
        const Medoo = await ethers.getContractFactory("Medoo");
        medooProxy = await Medoo.attach(medooProxy.target);

        await mintNFT(user1, mintFee, mintFee, 2);
        await mintNFT(user1, mintFee, mintFee, 7);
        await mintNFT(user1, mintFee, mintFee, 1);
        await mintNFT(user1, mintFee, mintFee, 2);
        await medooNFTProxy
          .connect(user1)
          ["safeTransferFrom(address, address, uint256, bytes)"](
            user1.address, // from
            user2.address, // to
            1 * DENOMINATOR + 1, // tokenId
            "0x" // data
          );
        await medooNFTProxy.connect(user1).batchTransfer(
          // user1.address, // from
          user2.address, // to
          [2 * DENOMINATOR + 1, 2 * DENOMINATOR + 2, 2 * DENOMINATOR + 7] // tokenId
          // "0x" // data
        );

        // expect(await medooNFTProxy.countHolders(1)).to.be.equal(3);
        expect(await medooNFTProxy.countTokens(user1.address)).to.be.equal(8);

        let usersOfToken1 = await medooNFTProxy.usersByToken(2);
        // console.log(usersOfToken1);
        expect(usersOfToken1[0]).to.be.equal(user2.address);
        expect(usersOfToken1[1]).to.be.equal(user2.address);
        expect(usersOfToken1[2]).to.be.equal(user1.address);
        expect(usersOfToken1[3]).to.be.equal(user1.address);
        expect(usersOfToken1[4]).to.be.equal(user1.address);
        expect(usersOfToken1[5]).to.be.equal(user1.address);
        expect(usersOfToken1[6]).to.be.equal(user2.address);

        expect(await medooNFTProxy.totalSupply()).to.be.equal(12);
        expect(await medooNFTProxy["tokenSupply(uint256)"](1)).to.be.equal(2);
        expect(await medooNFTProxy["tokenSupply(uint256)"](2)).to.be.equal(7);
        expect(await medooNFTProxy["tokenSupply(uint256)"](3)).to.be.equal(1);

        let tokensOfUser1 = await medooNFTProxy.tokensByUser(
          user1.address,
          0,
          7
        );
        // console.log(tokensOfUser1);

        await medooNFTProxy.connect(user1).burn(2 * DENOMINATOR + 5);

        usersOfToken1 = await medooNFTProxy.usersByToken(2);
        // console.log(usersOfToken1);

        tokensOfUser1 = await medooNFTProxy.tokensByUser(user1.address, 0, 6);
        // console.log(tokensOfUser1);

        expect(await medooNFTProxy["tokenSupply(uint256)"](2)).to.be.equal(6);
        expect(await medooNFTProxy["maxSupply(uint256)"](2)).to.be.equal(7);
      });

      it("Should be reverted when minter is not admin Minter", async function () {
        const MedooNFT = await ethers.getContractFactory("MedooNFT");
        medooNFTProxy = await MedooNFT.attach(medooNFTProxy.target);
        const Medoo = await ethers.getContractFactory("Medoo");
        medooProxy = await Medoo.attach(medooProxy.target);

        await expect(
          medooNFTProxy.adminMint(12, user2.address)
        ).to.be.revertedWith("Invalid admin minter.");
      });

      it("Should work when admin mint NFT", async function () {
        const MedooNFT = await ethers.getContractFactory("MedooNFT");
        medooNFTProxy = await MedooNFT.attach(medooNFTProxy.target);
        const Medoo = await ethers.getContractFactory("Medoo");
        medooProxy = await Medoo.attach(medooProxy.target);

        let tx = await medooNFTProxy
          .connect(adminMinter)
          .adminMint(5, user1.address);
        await expect(tx)
          .to.emit(medooNFTProxy, "TokenMinted")
          .withArgs(user1.address, 1, 5);

        const ProxyCallUri = await medooNFTProxy.tokenURI(1 * DENOMINATOR + 5);
        const ProxyCallBalanceOfDeployer = await medooNFTProxy.balanceOf(
          user1.address
        );
        expect(ProxyCallUri).to.be.equal(
          "https://nft-storage.medoo.io/" + (1 * DENOMINATOR + 5)
        );
        expect(ProxyCallBalanceOfDeployer).to.be.equal(BigInt("5"));

        const ProxyCallBalanceOfFeeReceiver = await medooProxy.balanceOf(
          feeReceiver.address
        );
        expect(ProxyCallBalanceOfFeeReceiver).to.be.equal(0);
      });
    });
  });
});
