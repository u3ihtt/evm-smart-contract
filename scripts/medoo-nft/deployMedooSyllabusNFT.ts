import { ethers, run, network } from "hardhat";
import { Interface } from "ethers";
import { dumpContractAddress, getContractAddress } from "../helper/helper";

async function main() {
  // deploy medooSyllabusNFT
  const MedooSyllabusNFTFactory =
    await ethers.getContractFactory("MedooSyllabusNFT");
  const medooSyllabusNFT = await MedooSyllabusNFTFactory.deploy();
  await medooSyllabusNFT.waitForDeployment();
  const medooSyllabusNFTAddress = await medooSyllabusNFT.getAddress();
  console.log(
    `MedooSyllabusNFT token contract has deployed ${medooSyllabusNFTAddress}`,
  );
  dumpContractAddress(
    "MedooSyllabusNFT",
    medooSyllabusNFT.target,
    network.name,
  );

  const medooProxyAdminAddress = getContractAddress(
    "MedooProxyAdmin",
    network.name,
  );

  const MedooSyllabusNFTProxy = await ethers.getContractFactory(
    "MedooSyllabusNFTProxy",
  );
  const medooSyllabusNFTInterface = new Interface([
    "function initialize(address) public",
  ]);

  const adminMinterAddress = process.env.ADMIN_MINTER_ADDRESS || "";

  const initializeData = medooSyllabusNFTInterface.encodeFunctionData(
    "initialize",
    [adminMinterAddress],
  );

  const medooSyllabusNFTProxy = await MedooSyllabusNFTProxy.deploy(
    medooSyllabusNFTAddress,
    medooProxyAdminAddress,
    initializeData,
  );

  await medooSyllabusNFTProxy.waitForDeployment();
  const medooSyllabusNFTProxyAddress = await medooSyllabusNFTProxy.getAddress();

  console.log(
    `Medoo Proxy token contract has deployed ${medooSyllabusNFTProxyAddress}`,
  );
  dumpContractAddress(
    "MedooSyllabusNFTProxy",
    medooSyllabusNFTProxy.target,
    network.name,
  );

  if (network.name !== "hardhat") {
    // verify contract
    setTimeout(async () => {
      await run("verify:verify", {
        contract:
          "contracts/courses/nft/medoo-syllabus-nft/MedooSyllabusNFT.sol:MedooSyllabusNFT",
        address: medooSyllabusNFTAddress,
      });
    }, 30000);

    setTimeout(async () => {
      await run("verify:verify", {
        contract:
          "contracts/courses/nft/medoo-syllabus-nft/MedooSyllabusNFTProxy.sol:MedooSyllabusNFTProxy",
        address: medooSyllabusNFTProxyAddress,
        constructorArguments: [
          medooSyllabusNFTAddress,
          medooProxyAdminAddress,
          initializeData,
        ],
      });
    }, 30000);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
