import { Interface } from "ethers";
import { ethers, network, run } from "hardhat";
import { dumpContractAddress, getContractAddress } from "../helper/helper";

async function main() {
  const adminWithdrawAddress = process.env.ADMIN_WITHDRAW_ADDRESS || "";
  const medooProxyAddress = getContractAddress("MedooProxy", network.name);
  const medooProxyAdminAddress = getContractAddress(
    "MedooProxyAdmin",
    network.name,
  );

  const VaultWithdrawFactory = await ethers.getContractFactory("VaultWithdraw");
  const vaultWithdraw = await VaultWithdrawFactory.deploy();
  await vaultWithdraw.waitForDeployment();
  const vaultWithdrawAddress = await vaultWithdraw.getAddress();

  console.log(`Vault Withdraw contract has deployed ${vaultWithdrawAddress}`);
  dumpContractAddress("VaultWithdraw", vaultWithdraw.target, network.name);

  const vaultWithdrawInterface = new Interface([
    "function initialize(address) public",
  ]);
  const initializeData = vaultWithdrawInterface.encodeFunctionData(
    "initialize",
    [adminWithdrawAddress],
  );

  const VaultWithdrawProxy =
    await ethers.getContractFactory("VaultWithdrawProxy");

  const vaultWithdrawProxy = await VaultWithdrawProxy.deploy(
    vaultWithdrawAddress,
    medooProxyAdminAddress,
    initializeData,
  );
  await vaultWithdrawProxy.waitForDeployment();
  const vaultWithdrawProxyAddress = await vaultWithdrawProxy.getAddress();

  console.log(
    `VaultWithdrawProxy token contract has deployed ${vaultWithdrawProxyAddress}`,
  );
  dumpContractAddress(
    "VaultWithdrawProxy",
    vaultWithdrawProxyAddress,
    network.name,
  );

  const vaultWithdrawProxyWithABI = await ethers.getContractAt(
    "VaultDeposit",
    vaultWithdrawProxyAddress,
  );
  await vaultWithdrawProxyWithABI.transferOwnership(
    process.env.MULTISIG_OWNER || "",
  );

  if (network.name != "hardhat") {
    setTimeout(async () => {
      await run("verify:verify", {
        contract: "contracts/vault/VaultWithdraw.sol:VaultWithdraw",
        address: vaultWithdrawAddress,
      });
    }, 30000); // 30000 milliseconds = 30 seconds

    setTimeout(async () => {
      await run("verify:verify", {
        contract: "contracts/vault/VaultWithdrawProxy.sol:VaultWithdrawProxy",
        address: vaultWithdrawProxyAddress,
        constructorArguments: [
          vaultWithdrawAddress,
          medooProxyAdminAddress,
          initializeData,
        ],
      });
    }, 30000);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
