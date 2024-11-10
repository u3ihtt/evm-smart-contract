const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = ethers;
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { Interface } = require("ethers");

const deployFnc = async () => {
	const Medoo = await ethers.getContractFactory("Medoo");
	const medoo = await Medoo.deploy();
	await medoo.waitForDeployment();
	const medooAddress = await medoo.getAddress();

	// const Medoov2 = await ethers.getContractFactory("Medoov2");
	// const medoov2 = await Medoov2.deploy();
	// await medoo.waitForDeployment();
	// const medooAddressv2 = await medoov2.getAddress();

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

	const [owner, user1, user2, _] = await ethers.getSigners();
	return {
		medoo,
		// medoov2,
		medooProxy,
		medooProxyAdmin,
		owner,
		user1,
		user2,
		medooAddress,
		// medooAddressv2,
		medooProxyAdminAddress,
		medooProxyAddress,
	};
};

describe("MedooProxy Token", () => {
	describe("MedooProxy function test", () => {
		beforeEach(async () => {
			await loadFixture(deployFnc);
		});

		describe("Medoo v1 Contract", () => {
			it("Should revert to call direct function from this medoo contract", async () => {
				const { medoo, owner } = await loadFixture(deployFnc);
				await expect(medoo.initialize()).to.be.reverted;
				const balance = await medoo.balanceOf(owner.address);
				expect(balance).to.equal(0);
			});
		});

		describe("Medoo Proxy Admin Contract", () => {
			let medooProxyAdmin;
			let owner;
			let medooProxyAdminAddress;
			let medooProxyAddress;
			let medooAddress;
			let user1;
			// let medooAddressv2;

			beforeEach(async () => {
				({
					medooProxyAdmin,
					owner,
					medooProxyAdminAddress,
					medooProxyAddress,
					medooAddress,
					owner,
					user1,
					// medooAddressv2,
				} = await loadFixture(deployFnc));
			});

			it("Should the right owner of proxy contract", async () => {
				const proxyAddress =
					await medooProxyAdmin.getProxyAdmin(medooProxyAddress);
				expect(proxyAddress).to.be.equal(medooProxyAdminAddress);
			});

			it("Should the right Proxy Implementation address", async () => {
				const implementationAddress =
					await medooProxyAdmin.getProxyImplementation(medooProxyAddress);
				expect(implementationAddress).to.be.equal(medooAddress);
			});
			it("Should the right deployer address", async () => {
				const deployer = await medooProxyAdmin.owner();
				expect(deployer).to.be.equal(owner);
			});

			// it("Should upgrade new implementation  address", async function () {
			//   // upgrade
			//   const newImplementation = await medooProxyAdmin.upgrade(
			//     medooProxyAddress,
			//     medooAddressv2
			//   );
			//   // call new implementation address just upgrade
			//   const implementationAddress =
			//     await medooProxyAdmin.getProxyImplementation(medooProxyAddress);
			//   expect(implementationAddress).to.be.equal(medooAddressv2);

			//   const MedooV2 = await ethers.getContractFactory("Medoov2");
			//   const medooProxy = await MedooV2.attach(medooProxyAddress);
			//   await expect(medooProxy.connect(user1).mint(BigInt("123456"))).to.be.revertedWith("Ownable: caller is not the owner");
			//   await medooProxy.mint(BigInt("123456"));
			//   const updatedBalanceOwner = await medooProxy.balanceOf(owner.address);
			//   expect(updatedBalanceOwner).to.be.equal(BigInt("1000000000000000000000123456"));

			// });
		});
		describe("Medoo Proxy Contract", () => {
			let medooProxyAdmin;
			let owner;
			let medooProxyAdminAddress;
			let medooProxyAddress;
			let medooAddress;
			let medooProxy;
			let medoo;
			// let medooAddressv2;
			let user1;

			beforeEach(async () => {
				({
					medooProxyAdmin,
					owner,
					medooProxyAdminAddress,
					medooProxyAddress,
					medooAddress,
					owner,
					medooProxy,
					medoo,
					// medooAddressv2,
					user1,
				} = await loadFixture(deployFnc));
			});

			it("Should the right owner of proxy contract", async () => {
				const proxyAddress =
					await medooProxyAdmin.getProxyAdmin(medooProxyAddress);
				expect(proxyAddress).to.be.equal(medooProxyAdminAddress);
			});
			it("Should the right information of medoo contract", async () => {
				const Medoo = await ethers.getContractFactory("Medoo");
				const medooProxy = await Medoo.attach(medooProxyAddress);
				const ProxyCallName = await medooProxy.name();
				const ProxyCallOwner = await medooProxy.owner();
				const ProxyCallSymbol = await medooProxy.symbol();
				const ProxyCallTotalSupply = await medooProxy.totalSupply();
				const ProxyCallBalanceOfDeployer = await medooProxy.balanceOf(
					owner.address,
				);
				expect(ProxyCallName).to.be.equal("Medoo");
				expect(ProxyCallOwner).to.be.equal(owner.address);
				expect(ProxyCallSymbol).to.be.equal("MEDOO");
				expect(ProxyCallTotalSupply).to.be.equal(
					BigInt("1000000000000000000000000000"),
				);
				expect(ProxyCallBalanceOfDeployer).to.be.equal(
					BigInt("1000000000000000000000000000"),
				);
			});

			it("Should work when write burn function through proxy contract", async () => {
				const Medoo = await ethers.getContractFactory("Medoo");
				const medooProxy = await Medoo.attach(medooProxyAddress);
				const tx = await medooProxy.burn(BigInt("200000000000000000000000000"));
				const updatedBalance = await medooProxy.balanceOf(owner.address);

				expect(updatedBalance).to.be.equal(
					BigInt("800000000000000000000000000"),
				);
			});

			it("Should revert when write initialiaze function twice", async () => {
				const Medoo = await ethers.getContractFactory("Medoo");
				const medooProxy = await Medoo.attach(medooProxyAddress);
				try {
					await medooProxy.initialize();
					assert.fail("Expected transaction to fail");
				} catch (error) {
					expect(error.message).to.include(
						"Initializable: contract is already initialized",
					);
				}
			});
			it("Should work when write transfer function", async () => {
				const Medoo = await ethers.getContractFactory("Medoo");
				const medooProxy = await Medoo.attach(medooProxyAddress);
				await medooProxy.transfer(
					user1.address,
					BigInt("200000000000000000000000000"),
				);
				const updatedBalanceOwner = await medooProxy.balanceOf(owner.address);
				const updatedBalanceUser1 = await medooProxy.balanceOf(user1.address);

				expect(updatedBalanceOwner).to.be.equal(
					BigInt("800000000000000000000000000"),
				);
				expect(updatedBalanceUser1).to.be.equal(
					BigInt("200000000000000000000000000"),
				);
			});
		});
	});
});
