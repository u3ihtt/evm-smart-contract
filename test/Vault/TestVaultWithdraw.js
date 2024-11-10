const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { Interface } = require("ethers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const deployFnc = async () => {
  const [owner, user1, user2, adminWithdraw] = await ethers.getSigners();

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

  // deploy vault transfer contract with medooProxy contract.

  const VaultWithdraw = await ethers.getContractFactory("VaultWithdraw");
  const vaultWithdraw = await VaultWithdraw.deploy();
  await vaultWithdraw.waitForDeployment();
  const vaultWithdrawAddress = await vaultWithdraw.getAddress();

  const vaultWithdrawInterface = new Interface([
    "function initialize(address) public",
  ]);
  const initVaultData = vaultWithdrawInterface.encodeFunctionData(
    "initialize",
    [adminWithdraw.address]
  );

  const VaultWithdrawProxy = await ethers.getContractFactory(
    "VaultWithdrawProxy"
  );

  const vaultWithdrawProxy = await VaultWithdrawProxy.deploy(
    vaultWithdrawAddress,
    medooProxyAdminAddress,
    initVaultData
  );
  await vaultWithdrawProxy.waitForDeployment();
  const vaultWithdrawProxyAddress = await vaultWithdrawProxy.getAddress();

  return {
    medoo,
    medooProxy,
    medooProxyAdmin,
    owner,
    user1,
    user2,
    adminWithdraw,
    medooAddress,
    medooProxyAdminAddress,
    medooProxyAddress,
    vaultWithdrawAddress,
    vaultWithdraw,
    vaultWithdrawProxy,
  };
};

describe("Vault Withdraw", function () {
  let medoo;
  let medooProxy;
  let medooProxyAdmin;
  let owner;
  let user1, user2;
  let adminWithdraw;
  let medooAddress;
  let medooProxyAdminAddress;
  let medooProxyAddress;
  let vaultWithdrawAddress;
  let vaultWithdraw;
  let vaultWithdrawProxy;
  beforeEach(async function () {
    ({
      medoo,
      medooProxy,
      medooProxyAdmin,
      owner,
      user1,
      user2,
      adminWithdraw,
      medooAddress,
      medooProxyAdminAddress,
      medooProxyAddress,
      vaultWithdrawAddress,
      vaultWithdraw,
      vaultWithdrawProxy,
    } = await loadFixture(deployFnc));
  });

  it("Should has the right information of owner", async function () {
    const VaultWithdraw = await ethers.getContractFactory("VaultWithdraw");
    const vaultWithdraw = await VaultWithdraw.attach(vaultWithdrawProxy.target);
    const ProxyCallOwner = await vaultWithdraw.owner();
    expect(ProxyCallOwner).to.be.equal(owner.address);
    expect(await vaultWithdraw.paused()).to.be.equal(false);
  });

  it("should pause and unpause the contract", async function () {
    const Medoo = await ethers.getContractFactory("Medoo");
    const medooProxy = await Medoo.attach(medooProxyAddress);
    const VaultWithdraw = await ethers.getContractFactory("VaultWithdraw");
    const vaultWithdraw = await VaultWithdraw.attach(vaultWithdrawProxy.target);
    await vaultWithdraw.connect(owner).pause();

    await expect(
      vaultWithdraw
        .connect(adminWithdraw)
        .withdrawNativeToken(user1.address, ethers.parseEther("1"), "a")
    ).to.be.revertedWith("Pausable: paused");

    await expect(
      vaultWithdraw
        .connect(adminWithdraw)
        .withdrawERC20Token(
          medooProxyAddress,
          user1.address,
          ethers.parseEther("1"),
          "daeh6"
        )
    ).to.be.revertedWith("Pausable: paused");

    await vaultWithdraw.connect(owner).unpause();

    const initialBalance = await ethers.provider.getBalance(user1);
    await vaultWithdraw
      .connect(adminWithdraw)
      .withdrawNativeToken(user1.address, ethers.parseEther("1"), "bbb", {
        value: ethers.parseEther("1"),
      });
    const finalBalance = await ethers.provider.getBalance(user1);

    expect(finalBalance).to.be.gt(initialBalance);
  });

  it("Should revert when caller is not Admin and update Admin", async function () {
    const Medoo = await ethers.getContractFactory("Medoo");
    const medooProxy = await Medoo.attach(medooProxyAddress);
    const VaultWithdraw = await ethers.getContractFactory("VaultWithdraw");
    const vaultWithdraw = await VaultWithdraw.attach(vaultWithdrawProxy.target);

    await expect(
      vaultWithdraw
        .connect(user1)
        .withdrawERC20Token(
          medooProxy.target,
          user1.address,
          BigInt("100001"),
          "fks9dbj"
        )
    ).to.be.revertedWith("Not admin");

    await expect(
      vaultWithdraw
        .connect(user1)
        .withdrawNativeToken(user1.address, BigInt("100001"), "das")
    ).to.be.revertedWith("Not admin");

    await expect(
      vaultWithdraw.connect(user1).setAdmin(user1.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    // Expect success
    await vaultWithdraw.connect(owner).setAdmin(user1.address);

    await expect(
      vaultWithdraw
        .connect(user1)
        .withdrawERC20Token(
          medooProxy.target,
          user1.address,
          BigInt("100001"),
          "fessdd"
        )
    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
  });

  it("Should fail smart contract not has enough Token", async function () {
    const Medoo = await ethers.getContractFactory("Medoo");
    const medooProxy = await Medoo.attach(medooProxyAddress);
    const VaultWithdraw = await ethers.getContractFactory("VaultWithdraw");
    const vaultWithdraw = await VaultWithdraw.attach(vaultWithdrawProxy.target);

    await expect(
      vaultWithdraw
        .connect(adminWithdraw)
        .withdrawERC20Token(
          medooProxy.target,
          user1.address,
          BigInt("100001"),
          "00ldsam"
        )
    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

    await expect(
      vaultWithdraw
        .connect(adminWithdraw)
        .withdrawNativeToken(user1.address, BigInt("100001"), "dawc")
    ).to.be.revertedWith("Insufficient contract native token");
  });

  it("Should work when withdraw Medoo Token", async function () {
    const Medoo = await ethers.getContractFactory("Medoo");
    const medooProxy = await Medoo.attach(medooProxyAddress);
    const VaultWithdraw = await ethers.getContractFactory("VaultWithdraw");
    const vaultWithdraw = await VaultWithdraw.attach(vaultWithdrawProxy.target);

    // Chuyển Token vào smart contract để mỗi khi admin gọi thì chuyển tiền từ SC sang
    await medooProxy.transfer(vaultWithdraw.target, BigInt("100000000"));

    let tx = await vaultWithdraw
      .connect(adminWithdraw)
      .withdrawERC20Token(
        medooProxyAddress,
        user1.address,
        BigInt("100000"),
        "sd3sacx"
      );

    await expect(tx)
      .to.emit(vaultWithdraw, "TokenWithdrawn")
      .withArgs(medooProxyAddress, 0, user1.address, BigInt("100000"));

    const updateUser1Balance = await medooProxy.balanceOf(user1.address);
    const smartContractBalance = await medooProxy.balanceOf(
      vaultWithdraw.target
    );

    expect(updateUser1Balance).to.be.equal(BigInt("100000"));
    expect(smartContractBalance).to.be.equal(
      BigInt("100000000") - BigInt("100000")
    );
  });

  it("Should work when withdraw ETH (Native token)", async function () {
    const Medoo = await ethers.getContractFactory("Medoo");
    const medooProxy = await Medoo.attach(medooProxyAddress);
    const VaultWithdraw = await ethers.getContractFactory("VaultWithdraw");
    const vaultWithdraw = await VaultWithdraw.attach(vaultWithdrawProxy.target);

    // Chuyển Token vào smart contract để mỗi khi admin gọi thì chuyển tiền từ SC sang
    await adminWithdraw.sendTransaction({
      to: vaultWithdraw.target,
      value: BigInt("100000000"),
    });

    let tx = await vaultWithdraw
      .connect(adminWithdraw)
      .withdrawNativeToken(user1.address, BigInt("100000"), "dafe");

    await expect(tx)
      .to.emit(vaultWithdraw, "TokenWithdrawn")
      .withArgs(anyValue, 0, user1.address, BigInt("100000"));

    const updateUser1Balance = await ethers.provider.getBalance(user1.address);
    const smartContractBalance = await ethers.provider.getBalance(
      vaultWithdraw.target
    );

    // expect(updateUser1Balance).to.be.equal(
    //   BigInt("100000") + ethers.parseEther("10000")
    // );
    expect(smartContractBalance).to.be.equal(
      BigInt("100000000") - BigInt("100000")
    );

    tx = await vaultWithdraw
      .connect(adminWithdraw)
      .multiWithdraw(
        ["0x0000000000000000000000000000000000000000"],
        [user1.address],
        [BigInt("100000")],
        ["dsqd322"]
      );
  });

  it("Should work when get get Withdraw Info from contract", async function () {
    const Medoo = await ethers.getContractFactory("Medoo");
    const medooProxy = await Medoo.attach(medooProxyAddress);
    const VaultWithdraw = await ethers.getContractFactory("VaultWithdraw");
    const vaultWithdraw = await VaultWithdraw.attach(vaultWithdrawProxy.target);

    // Chuyển Token vào smart contract để mỗi khi admin gọi thì chuyển tiền từ SC sang
    await adminWithdraw.sendTransaction({
      to: vaultWithdraw.target,
      value: BigInt("100000000"),
    });
    // Chuyển Token vào smart contract để mỗi khi admin gọi thì chuyển tiền từ SC sang
    await medooProxy.transfer(vaultWithdraw.target, BigInt("100000000"));

    await vaultWithdraw
      .connect(adminWithdraw)
      .withdrawNativeToken(user1.address, BigInt("500"), "defscf");
    await vaultWithdraw
      .connect(adminWithdraw)
      .withdrawERC20Token(
        medooProxyAddress,
        user2.address,
        BigInt("300"),
        "dd2a"
      );
    await vaultWithdraw
      .connect(adminWithdraw)
      .withdrawNativeToken(user1.address, BigInt("900"), "o9jdsc");

    await vaultWithdraw
      .connect(adminWithdraw)
      .multiWithdraw(
        [medooProxyAddress, medooProxyAddress],
        [user2.address, user2.address],
        [BigInt("1000"), BigInt("20000")],
        ["dsdd", "wdqsc"]
      );

    await vaultWithdraw
      .connect(adminWithdraw)
      .withdrawNativeToken(user1.address, BigInt("70000"), "009hds");
    await vaultWithdraw
      .connect(adminWithdraw)
      .withdrawERC20Token(
        medooProxyAddress,
        user2.address,
        BigInt("20000"),
        "gkb9b"
      );

    await vaultWithdraw
      .connect(adminWithdraw)
      .multiWithdraw(
        [
          "0x0000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000",
        ],
        [user1.address, user2.address],
        [BigInt("500"), BigInt("600")],
        ["dsd1d", "dsd1d2"]
      );

    expect(await vaultWithdraw.withdrawCounter()).to.be.equal(9);
    expect(await vaultWithdraw.getUserWithdrawCount(user1.address)).to.be.equal(
      4
    );
    expect(await vaultWithdraw.getUserWithdrawCount(user2.address)).to.be.equal(
      5
    );

    await expect(vaultWithdraw.getWithdrawInfoByNonce(2, 9)).to.be.revertedWith(
      "Invalid nonces"
    );

    let withdrawInfosByNonce = await vaultWithdraw.getWithdrawInfoByNonce(2, 5);

    expect(withdrawInfosByNonce.length).to.equal(4);
    expect(withdrawInfosByNonce[0][0]).to.equal(user1.address);
    expect(withdrawInfosByNonce[0][1]).to.equal(2);
    expect(withdrawInfosByNonce[0][2]).to.equal(
      "0x0000000000000000000000000000000000000000"
    );
    expect(withdrawInfosByNonce[0][3]).to.equal(BigInt("900"));

    expect(withdrawInfosByNonce[2][0]).to.equal(user2.address);
    expect(withdrawInfosByNonce[2][1]).to.equal(4);
    expect(withdrawInfosByNonce[2][2]).to.equal(medooProxyAddress);
    expect(withdrawInfosByNonce[2][3]).to.equal(BigInt("20000"));

    await expect(
      vaultWithdraw
        .connect(adminWithdraw)
        .multiWithdraw(
          [medooProxyAddress, medooProxyAddress],
          [user2.address, user2.address],
          [BigInt("1000"), BigInt("20000")],
          ["dsdd111", "dsdd111"]
        )
    ).to.be.revertedWith("requestData already used_dsdd111");
  });
});
