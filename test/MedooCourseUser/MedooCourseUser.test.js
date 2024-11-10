const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { Interface } = require("ethers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const addressZero = "0x0000000000000000000000000000000000000000";

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

  const MedooCourseUser = await ethers.getContractFactory("MedooCourseUser");
  const medooCourseUser = await MedooCourseUser.deploy();
  await medooCourseUser.waitForDeployment();
  const medooCourseUserAddress = await medooCourseUser.getAddress();

  const medooCourseUserInterface = new Interface([
    "function initialize(address, address, address, address) public",
  ]);

  const initializeData = medooCourseUserInterface.encodeFunctionData(
    "initialize",
    [medooForwarderAddress, admin.address, addressZero, addressZero],
  );

  const MedooCourseUserProxy = await ethers.getContractFactory(
    "MedooCourseUserProxy",
  );
  const medooCourseUserProxy = await MedooCourseUserProxy.deploy(
    medooCourseUserAddress,
    medooProxyAdminAddress,
    initializeData,
  );

  await medooCourseUserProxy.waitForDeployment();

  return {
    medooForwarder,
    medooCourseUser,
    medooCourseUserProxy,
    medooProxyAdmin,
    owner,
    user1,
    user2,
    admin,
  };
};

describe("MedooCourseUser Proxy Tests", () => {
  let medooCourseUser;
  let medooCourseUserProxy;
  let medooProxyAdmin;
  let medooForwarder;
  let owner;
  let user1;
  let user2;
  let admin;

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
      medooCourseUser,
      medooCourseUserProxy,
      medooProxyAdmin,
      owner,
      user1,
      user2,
      admin,
    } = await loadFixture(deployFnc));
  });

  describe("MedooCourseUser Contract Tests", () => {
    it("Should revert when calling direct function from this MedooCourseUser contract", async () => {
      await expect(
        medooCourseUser.initialize(
          owner.address,
          admin.address,
          addressZero,
          addressZero,
        ),
      ).to.be.reverted;
    });
  });

  describe("Medoo Proxy Admin Contract Tests", () => {
    it("Should return the correct owner of the proxy contract", async () => {
      const proxyAddress = await medooProxyAdmin.getProxyAdmin(
        medooCourseUserProxy.target,
      );
      expect(proxyAddress).to.equal(medooProxyAdmin.target);
    });

    it("Should return the correct Proxy Implementation address", async () => {
      const implementationAddress =
        await medooProxyAdmin.getProxyImplementation(
          medooCourseUserProxy.target,
        );
      expect(implementationAddress).to.equal(medooCourseUser.target);
    });

    it("Should return the correct deployer address", async () => {
      const deployer = await medooProxyAdmin.owner();
      expect(deployer).to.equal(owner.address);
    });
  });

  describe("Medoo Course User Proxy Contract Tests", () => {
    it("should recognize trusted forwarder", async () => {
      const MedooCourseUser =
        await ethers.getContractFactory("MedooCourseUser");
      medooCourseUserProxy = MedooCourseUser.attach(
        medooCourseUserProxy.target,
      );
      expect(
        await medooCourseUserProxy.isTrustedForwarder(medooForwarder.target),
      ).to.be.true;
      expect(await medooCourseUserProxy.trustedForwarder()).to.equal(
        medooForwarder.target,
      );
    });

    it("should store course user successfully", async () => {
      const courseUser = {
        medooId: 10,
        courseId: 11,
        status: "joined",
      };
      const MedooCourseUser =
        await ethers.getContractFactory("MedooCourseUser");
      medooCourseUserProxy = MedooCourseUser.attach(
        medooCourseUserProxy.target,
      );

      await expect(
        medooCourseUserProxy.connect(admin).storeCourseUser(courseUser),
      ).to.not.reverted;

      // Verify that the course user was stored correctly
      const storedUsers = await medooCourseUserProxy.getCourseUsers(
        courseUser.medooId,
      );
      expect(storedUsers.length).to.equal(1);
      expect(storedUsers[0].courseId).to.equal(courseUser.courseId);
      expect(storedUsers[0].status).to.equal(courseUser.status);
    });

    it("should update course user status successfully", async () => {
      const courseUser = {
        medooId: 10,
        courseId: 11,
        status: "deleted",
      };
      const MedooCourseUser =
        await ethers.getContractFactory("MedooCourseUser");
      medooCourseUserProxy = MedooCourseUser.attach(
        medooCourseUserProxy.target,
      );

      await expect(
        medooCourseUserProxy.connect(admin).storeCourseUser(courseUser),
      ).to.not.reverted;

      // Verify that the course user was stored correctly
      const storedUsers = await medooCourseUserProxy.getCourseUsers(
        courseUser.medooId,
      );
      expect(storedUsers.length).to.equal(1);
      expect(storedUsers[0].courseId).to.equal(courseUser.courseId);
      expect(storedUsers[0].status).to.equal(courseUser.status);
    });

    it("should store learning progress successfully", async () => {
      const MedooCourseUser =
        await ethers.getContractFactory("MedooCourseUser");
      medooCourseUserProxy = MedooCourseUser.attach(
        medooCourseUserProxy.target,
      );

      const learningProgress = {
        medooId: 10,
        courseId: 11,
        score: 12,
        timestamp: 13,
        progressTracking: [
          {
            learningMaterialId: 100,
            chapterId: 123,
            updatedAt: "2023-10-31T11:43:24.193Z",
            playedSeconds: 0,
            progress: 50,
          },
        ],
      };

      const args = [learningProgress];
      const nonce = await medooForwarder.getNonce(user1.address);
      const data = medooCourseUserProxy.interface.encodeFunctionData(
        "storeLearningProgress",
        args,
      );
      const req = {
        from: await user1.address,
        to: await medooCourseUserProxy.getAddress(),
        value: 0n,
        gas: 2000000, // if revert without a string should increase gas
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

      // const estimate = await medooForwarder
      //   .connect(user2)
      //   .executeWithRevert.estimateGas(req, signature);

      expect(
        await medooForwarder.connect(user2).executeWithRevert(req, signature),
      )
        .to.emit(medooCourseUserProxy, "LearningProgressLogged")
        .withArgs([10n, 11n, 12n, anyValue]);

      // Verify that learning progress was stored correctly
      const storedProgresses = await medooCourseUserProxy.getLearningProgresses(
        learningProgress.medooId,
        learningProgress.courseId,
      );
      expect(storedProgresses.score).to.equal(learningProgress.score);
      expect(storedProgresses.progressTracking.length).to.equal(1);
      expect(storedProgresses.progressTracking[0].learningMaterialId).to.equal(
        learningProgress.progressTracking[0].learningMaterialId,
      );
    });

    describe("setStrictVerify", () => {
      before(async () => {
        const MedooCourseUser =
          await ethers.getContractFactory("MedooCourseUser");
        medooCourseUserProxy = MedooCourseUser.attach(
          medooCourseUserProxy.target,
        );
      });

      it("should allow admin to set value isStrictVerify", async () => {
        await medooCourseUserProxy.connect(admin).setStrictVerify(true);
        expect(await medooCourseUserProxy.isStrictVerify()).to.equal(true);
      });

      it("should revert if a non-admin tries to set isStrictVerify", async () => {
        await expect(
          medooCourseUserProxy.connect(user1).setStrictVerify(true),
        ).to.be.revertedWith("Ownable: caller is not the admin");
      });
    });
  });
});
