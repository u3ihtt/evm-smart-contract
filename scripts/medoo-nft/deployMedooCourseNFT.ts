import { Interface } from "ethers";
import { ethers, network, run } from "hardhat";
import { dumpContractAddress, getContractAddress } from "../helper/helper";

async function main() {
  // deploy medooCourseNFT
  const MedooCourseNFTFactory =
    await ethers.getContractFactory("MedooCourseNFT");
  const medooCourseNFT = await MedooCourseNFTFactory.deploy();
  await medooCourseNFT.waitForDeployment();
  const medooCourseNFTAddress = await medooCourseNFT.getAddress();
  console.log(
    `MedooCourseNFT token contract has deployed ${medooCourseNFTAddress}`,
  );
  dumpContractAddress("MedooCourseNFT", medooCourseNFT.target, network.name);

  const medooProxyAdminAddress = getContractAddress(
    "MedooProxyAdmin",
    network.name,
  );

  const MedooCourseNFTProxy = await ethers.getContractFactory(
    "MedooCourseNFTProxy",
  );
  const medooCourseNFTInterface = new Interface([
    "function initialize(address) public",
  ]);

  const adminMinterAddress = process.env.ADMIN_MINTER_ADDRESS || "";

  const initializeData = medooCourseNFTInterface.encodeFunctionData(
    "initialize",
    [adminMinterAddress],
  );

  const medooCourseNFTProxy = await MedooCourseNFTProxy.deploy(
    medooCourseNFTAddress,
    medooProxyAdminAddress,
    initializeData,
  );

  await medooCourseNFTProxy.waitForDeployment();
  const medooCourseNFTProxyAddress = await medooCourseNFTProxy.getAddress();

  console.log(
    `Medoo Proxy token contract has deployed ${medooCourseNFTProxyAddress}`,
  );
  dumpContractAddress(
    "MedooCourseNFTProxy",
    medooCourseNFTProxy.target,
    network.name,
  );

  if (network.name !== "hardhat") {
    // verify contract
    setTimeout(async () => {
      await run("verify:verify", {
        contract:
          "contracts/courses/nft/medoo-course-nft/MedooCourseNFT.sol:MedooCourseNFT",
        address: medooCourseNFTAddress,
      }).catch((error) => {
        console.log("deploy course nft error: ", error.message);
      });
    }, 30000);

    setTimeout(async () => {
      await run("verify:verify", {
        contract:
          "contracts/courses/nft/medoo-course-nft/MedooCourseNFTProxy.sol:MedooCourseNFTProxy",
        address: medooCourseNFTProxyAddress,
        constructorArguments: [
          medooCourseNFTAddress,
          medooProxyAdminAddress,
          initializeData,
        ],
      }).catch((error) => {
        console.log("deploy course nft proxy error: ", error.message);
      });
    }, 30000);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
