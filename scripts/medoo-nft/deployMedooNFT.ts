import { ethers, run, network } from "hardhat";
import { Interface } from "ethers";
import { dumpContractAddress, getContractAddress } from "../helper/helper";

async function main() {
  // deploy medooNFT
  const MedooNFTFactory = await ethers.getContractFactory("MedooNFT");
  const medooNFT = await MedooNFTFactory.deploy();
  await medooNFT.waitForDeployment();
  const medooNFTAddress = await medooNFT.getAddress();
  console.log(`MedooNFT token contract has deployed ${medooNFTAddress}`);
  dumpContractAddress("MedooNFT", medooNFT.target, network.name);

  const medooProxyAdminAddress = getContractAddress(
    "MedooProxyAdmin",
    network.name,
  );

  const MedooNFTProxy = await ethers.getContractFactory("MedooNFTProxy");
  const medooNFTInterface = new Interface([
    "function initialize(address, address, address, uint256) public",
  ]);

  const fundToAddress = process.env.MINT_FEE_TO_ADDRESS || "";
  const adminMinterAddress = process.env.ADMIN_MINTER_ADDRESS || "";
  const medooProxyContract = getContractAddress("MedooProxy", network.name);

  const mintFee = ethers.parseEther(process.env.MINT_FEE || "120"); // Replace with your desired value, gia su la 120 medoo token
  const initializeData = medooNFTInterface.encodeFunctionData("initialize", [
    fundToAddress,
    adminMinterAddress,
    medooProxyContract,
    mintFee,
  ]);

  const medooNFTProxy = await MedooNFTProxy.deploy(
    medooNFTAddress,
    medooProxyAdminAddress,
    initializeData,
  );

  await medooNFTProxy.waitForDeployment();
  const medooNFTProxyAddress = await medooNFTProxy.getAddress();

  console.log(
    `Medoo Proxy token contract has deployed ${medooNFTProxyAddress}`,
  );
  dumpContractAddress("MedooNFTProxy", medooNFTProxy.target, network.name);

  if (network.name !== "hardhat") {
    // verify contract
    setTimeout(async () => {
      await run("verify:verify", {
        contract: "contracts/medoo-nft/MedooNFT.sol:MedooNFT",
        address: medooNFTAddress,
      });
    }, 30000);

    setTimeout(async () => {
      await run("verify:verify", {
        contract: "contracts/medoo-nft/MedooNFTProxy.sol:MedooNFTProxy",
        address: medooNFTProxyAddress,
        constructorArguments: [
          medooNFTAddress,
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
