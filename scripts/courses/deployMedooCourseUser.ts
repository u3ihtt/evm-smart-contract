import { ethers, run, network } from "hardhat";
import { Interface } from "ethers";
import { dumpContractAddress, getContractAddress } from "../helper/helper";

const addressZero = "0x0000000000000000000000000000000000000000";

async function main() {
  // Deploy MedooCourseUser

  const MedooProxyAdmin = await ethers.getContractFactory("MedooProxyAdmin");
  const medooProxyAdmin = await MedooProxyAdmin.deploy();
  await medooProxyAdmin.waitForDeployment();
  const medooProxyAdminAddress = await medooProxyAdmin.getAddress();

  const MedooForwarder = await ethers.getContractFactory("MedooForwarder");
  const medooForwarder = await MedooForwarder.deploy();
  await medooForwarder.waitForDeployment();
  const medooForwarderAddress = await medooForwarder.getAddress();

  const MedooCourseUserFactory =
    await ethers.getContractFactory("MedooCourseUser");
  const medooCourseUser = await MedooCourseUserFactory.deploy();
  await medooCourseUser.waitForDeployment();
  const medooCourseUserAddress = await medooCourseUser.getAddress();
  console.log(
    `MedooCourseUser contract has deployed at ${medooCourseUserAddress}`,
  );
  dumpContractAddress("MedooCourseUser", medooCourseUser.target, network.name);

  const medooCourseUserInterface = new Interface([
    "function initialize(address, address, address, address) public",
  ]);

  const adminMinterAddress = process.env.ADMIN_MINTER_ADDRESS || "";

  const initializeData = medooCourseUserInterface.encodeFunctionData(
    "initialize",
    [medooForwarderAddress, adminMinterAddress, addressZero, addressZero],
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
  const medooCourseUserProxyAddress = await medooCourseUserProxy.getAddress();

  console.log(
    `MedooCourseUser Proxy contract has deployed at ${medooCourseUserProxyAddress}`,
  );
  dumpContractAddress(
    "MedooCourseUserProxy",
    medooCourseUserProxy.target,
    network.name,
  );

  if (network.name !== "hardhat") {
    // Verify contract
    setTimeout(async () => {
      await run("verify:verify", {
        contract: "contracts/base/MedooForwarder.sol:MedooForwarder",
        address: medooForwarderAddress,
      }).catch((error) => {
        console.log("deploy course user forwarder error: ", error);
      });
    }, 30000);

    setTimeout(async () => {
      await run("verify:verify", {
        contract:
          "contracts/courses/medoo-course-user/MedooCourseUser.sol:MedooCourseUser",
        address: medooCourseUserAddress,
      }).catch((error) => {
        console.log("deploy course user error: ", error);
      });
    }, 30000);

    setTimeout(async () => {
      await run("verify:verify", {
        contract:
          "contracts/courses/medoo-course-user/MedooCourseUserProxy.sol:MedooCourseUserProxy",
        address: medooCourseUserProxyAddress,
        constructorArguments: [
          medooCourseUserAddress,
          medooProxyAdminAddress,
          initializeData,
        ],
      }).catch((error) => {
        console.log("deploy course user proxy error: ", error);
      });
    }, 30000);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
