const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = ethers;
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { Interface } = require("ethers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const deployFnc = async () => {
  const [owner, user1, user2, fundTo] = await ethers.getSigners();

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
    initData,
  );
  await medooProxy.waitForDeployment();
  const medooProxyAddress = await medooProxy.getAddress();

  // deploy vault transfer contract with medooProxy contract.

  const VaultDeposit = await ethers.getContractFactory("VaultDeposit");
  const vaultDeposit = await VaultDeposit.deploy();
  await vaultDeposit.waitForDeployment();
  const vaultDepositAddress = await vaultDeposit.getAddress();

  const vaultDepositInterface = new Interface([
    "function initialize(address fundTo_, address[] memory whiteList, address admin_) public",
  ]);

  // fundTo = {
  //   address: medooProxyAdminAddress,
  // };
  const initVaultData = vaultDepositInterface.encodeFunctionData("initialize", [
    fundTo.address,
    [medooProxyAddress],
    owner.address,
  ]);

  const VaultDepositProxy =
    await ethers.getContractFactory("VaultDepositProxy");

  const vaultDepositProxy = await VaultDepositProxy.deploy(
    vaultDepositAddress,
    medooProxyAdminAddress,
    initVaultData,
  );
  await vaultDepositProxy.waitForDeployment();
  const vaultDepositProxyAddress = await vaultDepositProxy.getAddress();

  // const VaultDeposit = await ethers.getContractFactory("VaultDeposit");
  // const vaultDeposit = await VaultDeposit.deploy(fundTo, [medooProxyAddress]);

  // await vaultDeposit.waitForDeployment();
  // const vaultDepositAddress = await vaultDeposit.getAddress();

  return {
    medoo,
    medooProxy,
    medooProxyAdmin,
    owner,
    user1,
    user2,
    fundTo,
    medooAddress,
    medooProxyAdminAddress,
    medooProxyAddress,
    vaultDepositAddress,
    vaultDeposit,
    vaultDepositProxy,
  };
};
describe("Vault Transfer function test", () => {
  beforeEach(async () => {
    await loadFixture(deployFnc);
  });

  describe("Vault transfer", () => {
    let medoo;
    let medooProxy;
    let medooProxyAdmin;
    let owner;
    let user1;
    let user2;
    let fundTo;
    let medooAddress;
    let medooProxyAdminAddress;
    let medooProxyAddress;
    let vaultDepositAddress;
    let vaultDeposit;
    let vaultDepositProxy;
    beforeEach(async () => {
      ({
        medoo,
        medooProxy,
        medooProxyAdmin,
        owner,
        user1,
        user2,
        fundTo,
        medooAddress,
        medooProxyAdminAddress,
        medooProxyAddress,
        vaultDepositAddress,
        vaultDeposit,
        vaultDepositProxy,
      } = await loadFixture(deployFnc));
    });

    it("Should the right information of owner", async () => {
      const Medoo = await ethers.getContractFactory("Medoo");
      const medooProxy = await Medoo.attach(medooProxyAddress);
      const VaultDeposit = await ethers.getContractFactory("VaultDeposit");
      const vaultDeposit = await VaultDeposit.attach(vaultDepositProxy.target);
      const ProxyCallOwner = await vaultDeposit.owner();
      expect(ProxyCallOwner).to.be.equal(owner.address);
      expect(await vaultDeposit.paused()).to.be.equal(false);
    });

    it("Should work when transfer medoo token to this contract", async () => {
      const Medoo = await ethers.getContractFactory("Medoo");
      const medooProxy = await Medoo.attach(medooProxyAddress);
      const VaultDeposit = await ethers.getContractFactory("VaultDeposit");
      const vaultDeposit = await VaultDeposit.attach(vaultDepositProxy.target);

      // expect(await vault.medooToken()).to.equal(medooProxyAddress);

      const checkOwnerAddressBalance = await medooProxy.balanceOf(
        owner.address,
      );
      // checkbbalance of owner
      expect(checkOwnerAddressBalance).to.be.equal(
        BigInt("1000000000000000000000000000"),
      );

      await medooProxy
        .connect(user1)
        .approve(vaultDepositProxy.target, BigInt("100001"));
      // console.log(fundTo.address)
      await expect(
        vaultDeposit
          .connect(user1)
          .depositERC20Token(medooProxyAddress, BigInt("100000"), "des medoo"),
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

      await expect(
        vaultDeposit.depositERC20Token(
          medooProxyAddress,
          BigInt("100001"),
          "medd",
        ),
      ).to.be.revertedWith("ERC20: insufficient allowance");

      await medooProxy.approve(vaultDepositProxy.target, BigInt("100000"));
      let tx = await vaultDeposit.depositERC20Token(
        medooProxyAddress,
        BigInt("100000"),
        "destination",
      );

      await expect(tx)
        .to.emit(vaultDeposit, "TokenDeposited")
        .withArgs(
          owner.address,
          0,
          medooProxyAddress,
          BigInt("100000"),
          anyValue,
          "destination",
        );

      const updateOwnerBbalance = await medooProxy.balanceOf(owner.address);
      const funToAddressBalance = await medooProxy.balanceOf(fundTo.address);

      expect(updateOwnerBbalance).to.be.equal(
        BigInt("1000000000000000000000000000") - BigInt("100000"),
      );
      expect(funToAddressBalance).to.be.equal(BigInt("100000"));

      const ownerETH = await ethers.provider.getBalance(owner.address);
      const fundToETH = await ethers.provider.getBalance(fundTo.address);

      tx = await vaultDeposit
        .connect(owner)
        .depositNativeToken("sass1", { value: BigInt("123456") });

      await expect(tx)
        .to.emit(vaultDeposit, "TokenDeposited")
        .withArgs(
          owner.address,
          1,
          "0x0000000000000000000000000000000000000000",
          BigInt("123456"),
          anyValue,
          "sass1",
        );

      expect(
        await ethers.provider.getBalance(owner.address),
      ).to.lessThanOrEqual(ownerETH - BigInt("123456")); // lessThan because owner has to pay transaction fee.

      expect(await ethers.provider.getBalance(fundTo.address)).to.equal(
        fundToETH + BigInt("123456"),
      );

      // let destinations = await vaultDeposit.getDestinations([0, 1]);
      // console.log(destinations);

      // let ownerDepositInfo = await vaultDeposit.getDepositInfoByUser(
      //   owner.address,
      //   0,
      //   1
      // );
      // console.log(ownerDepositInfo);
      // let systemDepositInfo = await vaultDeposit.getDepositInfoByNonce(0, 1);
      // console.log(systemDepositInfo);
    });

    it("Should work when transfer native token to this contract", async () => {
      const Medoo = await ethers.getContractFactory("Medoo");
      const medooProxy = await Medoo.attach(medooProxyAddress);
      const VaultDeposit = await ethers.getContractFactory("VaultDeposit");
      const vault = await VaultDeposit.attach(vaultDepositProxy.target);

      const tx = await vault
        .connect(user2)
        .depositNativeToken("des", { value: BigInt("100000") });

      await expect(tx)
        .to.emit(vault, "TokenDeposited")
        .withArgs(
          user2.address,
          0,
          "0x0000000000000000000000000000000000000000",
          BigInt("100000"),
          anyValue,
          "des",
        );
    });
  });
});
