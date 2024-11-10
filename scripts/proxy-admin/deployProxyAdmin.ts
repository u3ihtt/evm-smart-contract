import { Interface } from "ethers";
import { ethers, network, run } from "hardhat";
import { dumpContractAddress } from "../helper/helper";

async function main() {
  // deploy medoo Admin
  const MedooProxyAdminFactory =
    await ethers.getContractFactory("MedooProxyAdmin");
  const medooProxyAdmin = await MedooProxyAdminFactory.deploy();
  await medooProxyAdmin.waitForDeployment();
  const proxyAdminAddress = await medooProxyAdmin.getAddress();
  console.log(
    `Medoo ProxyAdmin token contract has deployed ${proxyAdminAddress}`,
  );
  dumpContractAddress("MedooProxyAdmin", medooProxyAdmin.target, network.name);

  await medooProxyAdmin.transferOwnership(process.env.MULTISIG_OWNER || "");

  if (network.name !== "hardhat") {
    // verify contract
    setTimeout(async () => {
      await run("verify:verify", {
        contract: "contracts/proxy-admin/MedooProxyAdmin.sol:MedooProxyAdmin",
        address: proxyAdminAddress,
      });
    }, 30000);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
