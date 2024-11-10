import { Interface } from "ethers";
import { ethers, network, run } from "hardhat";
import { dumpContractAddress, getContractAddress } from "../helper/helper";

async function main() {
  const provider = ethers.provider;
  // deploy medoo
  const MedooFactory = await ethers.getContractFactory("Medoo");
  const medoo = await MedooFactory.deploy();
  await medoo.waitForDeployment();
  const medooAddress = await medoo.getAddress();
  console.log(`Medoo token contract has deployed ${medooAddress}`);
  dumpContractAddress("Medoo", medoo.target, network.name);

  // get medoo proxy Admin addreess
  const medooProxyAdminAddress = getContractAddress(
    "MedooProxyAdmin",
    network.name,
  );

  const medooInterface = new Interface(["function initialize() external"]);
  const initData = medooInterface.encodeFunctionData("initialize");

  // deploy medooProxy
  const MedooProxy = await ethers.getContractFactory("MedooProxy");
  const medooProxy = await MedooProxy.deploy(
    medooAddress,
    medooProxyAdminAddress,
    initData,
  );

  await medooProxy.waitForDeployment();

  const proxyAddress = await medooProxy.getAddress();

  console.log(`Medoo Proxy token contract has deployed ${proxyAddress}`);
  dumpContractAddress("MedooProxy", medooProxy.target, network.name);

  if (network.name !== "hardhat") {
    // verify contract
    setTimeout(async () => {
      await run("verify:verify", {
        contract: "contracts/token/Medoo.sol:Medoo",
        address: medooAddress,
      });
    }, 30000);

    setTimeout(async () => {
      await run("verify:verify", {
        contract: "contracts/token/MedooProxy.sol:MedooProxy",
        address: proxyAddress,
        constructorArguments: [medooAddress, medooProxyAdminAddress, initData],
      });
    }, 30000);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
