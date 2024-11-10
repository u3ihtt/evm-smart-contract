const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = ethers;
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { Interface } = require("ethers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const deployFnc = async () => {
  const [owner, user1, user2, admin] = await ethers.getSigners();

  const MedooProxyAdmin = await ethers.getContractFactory("MedooProxyAdmin");
  const medooProxyAdmin = await MedooProxyAdmin.deploy();
  await medooProxyAdmin.waitForDeployment();
  const medooProxyAdminAddress = await medooProxyAdmin.getAddress();

  const MedooForwarder = await ethers.getContractFactory("MedooForwarder");
  const medooForwarder = await MedooForwarder.deploy();
  await medooForwarder.waitForDeployment();
  const medooForwarderAddress = await medooForwarder.getAddress();

  const MedooLearningData =
    await ethers.getContractFactory("MedooLearningData");
  const medooLearningData = await MedooLearningData.deploy();
  await medooLearningData.waitForDeployment();
  const medooLearningDataAddress = await medooLearningData.getAddress();

  const MedooLearningDataProxy = await ethers.getContractFactory(
    "MedooLearningDataProxy",
  );

  const medooLearningDataInterface = new Interface([
    "function initialize(address, address) public",
  ]);
  const initializeData = medooLearningDataInterface.encodeFunctionData(
    "initialize",
    [medooForwarderAddress, admin.address],
  );

  const medooLearningDataProxy = await MedooLearningDataProxy.deploy(
    medooLearningDataAddress,
    medooProxyAdminAddress,
    initializeData,
  );

  await medooLearningDataProxy.waitForDeployment();
  const medooLearningDataProxyAddress =
    await medooLearningDataProxy.getAddress();

  return {
    medooForwarder,
    medooLearningData,
    medooLearningDataProxy,
    medooProxyAdmin,
    owner,
    user1,
    user2,
    admin,
  };
};

describe("MedooLearningDataProxy Token", () => {
  let medooLearningData,
    medooLearningDataProxy,
    medooProxyAdmin,
    medooForwarder;
  let owner, user1, user2, admin;

  const ForwardRequest = [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "gas", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "data", type: "bytes" },
  ];

  before(async () => {
    ({
      medooForwarder,
      medooLearningData,
      medooLearningDataProxy,
      medooProxyAdmin,
      owner,
      user1,
      user2,
      admin,
    } = await loadFixture(deployFnc));
  });

  describe("MedooLearningDataProxy function test", () => {
    describe("MedooLearningData Contract", () => {
      it("Should revert to call direct function from this medooLearningData contract", async () => {
        const { medooLearningData, owner, admin } =
          await loadFixture(deployFnc);
        await expect(medooLearningData.initialize(owner, admin)).to.be.reverted;
      });
    });

    describe("MedooLearningData Proxy Admin Contract", () => {
      it("Should the right owner of proxy contract", async () => {
        const proxyAddress = await medooProxyAdmin.getProxyAdmin(
          medooLearningDataProxy.target,
        );
        expect(proxyAddress).to.be.equal(medooProxyAdmin.target);
      });

      it("Should the right Proxy Implementation address", async () => {
        const implementationAddress =
          await medooProxyAdmin.getProxyImplementation(
            medooLearningDataProxy.target,
          );
        expect(implementationAddress).to.be.equal(medooLearningData.target);
      });
      it("Should the right deployer address", async () => {
        const deployer = await medooProxyAdmin.owner();
        expect(deployer).to.be.equal(owner);
      });
    });

    describe("MedooLearningData Proxy Contract", () => {
      it("recognize trusted forwarder", async () => {
        const MedooLearningData =
          await ethers.getContractFactory("MedooLearningData");
        medooLearningDataProxy = MedooLearningData.attach(
          medooLearningDataProxy.target,
        );

        expect(
          await medooLearningDataProxy.isTrustedForwarder(
            medooForwarder.target,
          ),
        ).to.be.true;

        expect(await medooLearningDataProxy.trustedForwarder()).to.equal(
          medooForwarder.target,
        );
      });

      it("should work when store buy course transaction", async () => {
        const MedooLearningData =
          await ethers.getContractFactory("MedooLearningData");
        medooLearningDataProxy = MedooLearningData.attach(
          medooLearningDataProxy.target,
        );

        const buyCourseTransaction = {
          medooId: 10,
          courseIds: [11, 12, 13],
          timestamp: 13,
          buyType: 1,
          transactionId: "transactionId",
          originPrice: 100,
          discountAmount: 10,
          discountPercent: 0,
          price: 90,
          currency: "USD",
          rootOrgId: "rootOrgId",
        };

        await expect(
          medooLearningDataProxy
            .connect(admin)
            .storeBuyCourseTransaction(buyCourseTransaction),
        ).to.emit(medooLearningDataProxy, "BuyCourseTransactionLogged");
        //   .withArgs([
        //     10n,
        //     [11n, 12n, 13n],
        //     anyValue,
        //     1n,
        //     "transactionId",
        //     100n,
        //     10n,
        //     0n,
        //     90n,
        //     "USD",
        //     "rootOrgId",
        //   ]);

        // console.log(await medooLearningDataProxy.buyCourseTransactions(10, 0));
        // console.log(await medooLearningDataProxy.getBuyCourseTransactions(10));
      });

      it("should work when get buy course transactions", async () => {
        const MedooLearningData =
          await ethers.getContractFactory("MedooLearningData");
        medooLearningDataProxy = MedooLearningData.attach(
          medooLearningDataProxy.target,
        );

        const buyCourseTransaction = {
          medooId: 10,
          courseIds: [14, 100],
          timestamp: 13,
          buyType: 1,
          transactionId: "transactionId",
          originPrice: 100,
          discountAmount: 10,
          discountPercent: 0,
          price: 90,
          currency: "USD",
          rootOrgId: "rootOrgId",
        };

        await expect(
          medooLearningDataProxy
            .connect(admin)
            .storeBuyCourseTransaction(buyCourseTransaction),
        ).to.emit(medooLearningDataProxy, "BuyCourseTransactionLogged");
        //   .withArgs([
        //     10n,
        //     [11n, 12n, 13n],
        //     anyValue,
        //     1n,
        //     "transactionId",
        //     100n,
        //     10n,
        //     0n,
        //     90n,
        //     "USD",
        //     "rootOrgId",
        //   ]);

        // console.log(await medooLearningDataProxy.buyCourseTransactions(10, 0));
        console.log(await medooLearningDataProxy.getBuyCourseTransactions(10));
      });

      it("should work when store learning progress", async () => {
        const MedooLearningData =
          await ethers.getContractFactory("MedooLearningData");
        medooLearningDataProxy = MedooLearningData.attach(
          medooLearningDataProxy.target,
        );

        const learningProgress = {
          medooId: 10,
          courseId: 11,
          score: 12,
          timestamp: 13,
        };

        const args = [learningProgress];
        const nonce = await medooForwarder.getNonce(user1.address);
        const data = medooLearningDataProxy.interface.encodeFunctionData(
          "storeLearningProgress",
          args,
        );
        const req = {
          from: await user1.address,
          to: await medooLearningDataProxy.getAddress(),
          value: 0n,
          gas: 200000,
          nonce,
          data,
          //   deadline: Math.floor(Date.now() / 1000) + 600,
        };
        const domain = await medooForwarder.eip712Domain();
        const signature = await user1.signTypedData(
          {
            name: domain[1],
            version: domain[2],
            chainId: domain[3],
            verifyingContract: domain[4],
          },
          { ForwardRequest: ForwardRequest },
          req,
        );
        expect(await medooForwarder.verify(req, signature)).to.be.true;

        const estimate = await medooForwarder
          .connect(user2)
          .executeWithRevert.estimateGas(req, signature);

        // console.log("estimate gas: ", estimate);

        expect(
          await medooForwarder.connect(user2).executeWithRevert(req, signature),
        )
          .to.emit(medooLearningDataProxy, "LearningProgressLogged")
          .withArgs([10n, 11n, 12n, anyValue]);

        // console.log(await medooLearningDataProxy.getLearningProgresses(10, 11));
      });

      //   it("Should work when admin mint token", async function () {
      //     const MedooLearningData = await ethers.getContractFactory(
      //       "MedooLearningData"
      //     );
      //     medooLearningDataProxy = MedooLearningData.attach(
      //       medooLearningDataProxy.target
      //     );

      //     let tx = await medooLearningDataProxy
      //       .connect(admin)
      //       .mintNewTokens([user1.address], [1]);
      //     await expect(tx)
      //       .to.emit(medooLearningDataProxy, "Transfer")
      //       .withArgs(anyValue, user1.address, 1);

      //     const ProxyCallUri = await medooLearningDataProxy.tokenURI(1);
      //     const ProxyCallBalanceOfDeployer =
      //       await medooLearningDataProxy.balanceOf(user1.address);
      //     expect(ProxyCallUri).to.be.equal(
      //       "https://metadata.medoo.io/course/" + 1
      //     );
      //     expect(ProxyCallBalanceOfDeployer).to.be.equal(BigInt("1"));
      //   });
    });
  });
});
