import { ethers, run, network } from "hardhat";
import { Interface } from "ethers";
import { dumpContractAddress, getContractAddress } from "../helper/helper";

async function main() {
  // Deploy MedooLearningMaterial
  const MedooLearningMaterialFactory = await ethers.getContractFactory(
    "MedooLearningMaterial",
  );
  const medooLearningMaterial = await MedooLearningMaterialFactory.deploy();
  await medooLearningMaterial.waitForDeployment();
  const medooLearningMaterialAddress = await medooLearningMaterial.getAddress();
  console.log(
    `MedooLearningMaterial contract has deployed at ${medooLearningMaterialAddress}`,
  );
  dumpContractAddress(
    "MedooLearningMaterial",
    medooLearningMaterial.target,
    network.name,
  );

  const medooProxyAdminAddress = getContractAddress(
    "MedooProxyAdmin",
    network.name,
  );

  const MedooLearningMaterialProxy = await ethers.getContractFactory(
    "MedooLearningMaterialProxy",
  );
  const medooLearningMaterialInterface = new Interface([
    "function initialize(address) public", // Update this if the initialization function differs
  ]);

  const adminMinterAddress = process.env.ADMIN_MINTER_ADDRESS || "";

  const initializeData = medooLearningMaterialInterface.encodeFunctionData(
    "initialize",
    [adminMinterAddress],
  );

  const medooLearningMaterialProxy = await MedooLearningMaterialProxy.deploy(
    medooLearningMaterialAddress,
    medooProxyAdminAddress,
    initializeData,
  );

  await medooLearningMaterialProxy.waitForDeployment();
  const medooLearningMaterialProxyAddress =
    await medooLearningMaterialProxy.getAddress();

  console.log(
    `MedooLearningMaterial Proxy contract has deployed at ${medooLearningMaterialProxyAddress}`,
  );
  dumpContractAddress(
    "MedooLearningMaterialProxy",
    medooLearningMaterialProxy.target,
    network.name,
  );

  if (network.name !== "hardhat") {
    // Verify contract
    setTimeout(async () => {
      await run("verify:verify", {
        contract:
          "contracts/courses/medoo-learning-material/MedooLearningMaterial.sol:MedooLearningMaterial",
        address: medooLearningMaterialAddress,
      }).catch((error) => {
        console.log("deploy learning material error: ", error);
      });
    }, 30000);

    setTimeout(async () => {
      await run("verify:verify", {
        contract:
          "contracts/courses/medoo-learning-material/MedooLearningMaterialProxy.sol:MedooLearningMaterialProxy",
        address: medooLearningMaterialProxyAddress,
        constructorArguments: [
          medooLearningMaterialAddress,
          medooProxyAdminAddress,
          initializeData,
        ],
      }).catch((error) => {
        console.log("deploy learning material proxy error: ", error);
      });
    }, 30000);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
