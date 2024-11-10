import { ethers, run, network } from "hardhat";
import { Interface } from "ethers";
import { dumpContractAddress, getContractAddress } from "../helper/helper";

async function main() {
  // deploy medooID
  const MedooIDFactory = await ethers.getContractFactory("MedooID");
  const medooID = await MedooIDFactory.deploy();
  await medooID.waitForDeployment();
  const medooIDAddress = await medooID.getAddress();
  console.log(`MedooID token contract has deployed ${medooIDAddress}`);
  dumpContractAddress("MedooID", medooID.target, network.name);

  const medooProxyAdminAddress = getContractAddress(
    "MedooProxyAdmin",
    network.name,
  );

  const MedooIDProxy = await ethers.getContractFactory("MedooIDProxy");
  const medooIDInterface = new Interface([
    "function initialize(address) public",
  ]);

  const adminMinterAddress = process.env.ADMIN_MINTER_ADDRESS || "";

  const initializeData = medooIDInterface.encodeFunctionData("initialize", [
    adminMinterAddress,
  ]);

  const medooIDProxy = await MedooIDProxy.deploy(
    medooIDAddress,
    medooProxyAdminAddress,
    initializeData,
  );

  await medooIDProxy.waitForDeployment();
  const medooIDProxyAddress = await medooIDProxy.getAddress();

  console.log(`Medoo Proxy token contract has deployed ${medooIDProxyAddress}`);
  dumpContractAddress("MedooIDProxy", medooIDProxy.target, network.name);

  if (network.name !== "hardhat") {
    // verify contract
    setTimeout(async () => {
      await run("verify:verify", {
        contract: "contracts/users/nft/medoo-id/MedooID.sol:MedooID",
        address: medooIDAddress,
      });
    }, 30000);

    setTimeout(async () => {
      await run("verify:verify", {
        contract: "contracts/users/nft/medoo-id/MedooIDProxy.sol:MedooIDProxy",
        address: medooIDProxyAddress,
        constructorArguments: [
          medooIDAddress,
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
