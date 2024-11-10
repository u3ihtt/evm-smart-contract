import { Interface } from "ethers";
import { ethers, network, run } from "hardhat";
import { dumpContractAddress, getContractAddress } from "../helper/helper";

async function main() {
  const fundToAddress = process.env.FUND_TO_ADDRESS || "";
  const medooProxyAddress = getContractAddress("MedooProxy", network.name);
  const medooProxyAdminAddress = getContractAddress(
    "MedooProxyAdmin",
    network.name,
  );

  const VaultDepositFactory = await ethers.getContractFactory("VaultDeposit");
  const vaultDeposit = await VaultDepositFactory.deploy();
  await vaultDeposit.waitForDeployment();
  const vaultDepositAddress = await vaultDeposit.getAddress();

  console.log(`Vault Deposit contract has deployed ${vaultDepositAddress}`);
  dumpContractAddress("VaultDeposit", vaultDeposit.target, network.name);

  const adminDepositAddress = process.env.ADMIN_DEPOSIT_ADDRESS || "";

  const vaultDepositInterface = new Interface([
    "function initialize(address fundTo_, address[] memory whiteList, address admin_) public",
  ]);
  const initializeData = vaultDepositInterface.encodeFunctionData(
    "initialize",
    [fundToAddress, getWhitelist(network.name), adminDepositAddress],
  );

  const VaultDepositProxy =
    await ethers.getContractFactory("VaultDepositProxy");

  const vaultDepositProxy = await VaultDepositProxy.deploy(
    vaultDepositAddress,
    medooProxyAdminAddress,
    initializeData,
  );
  await vaultDepositProxy.waitForDeployment();
  const vaultDepositProxyAddress = await vaultDepositProxy.getAddress();

  console.log(
    `VaultDepositProxy token contract has deployed ${vaultDepositProxyAddress}`,
  );
  dumpContractAddress(
    "VaultDepositProxy",
    vaultDepositProxyAddress,
    network.name,
  );

  const vaultDepositProxyWithABI = await ethers.getContractAt(
    "VaultDeposit",
    vaultDepositProxyAddress,
  );
  await vaultDepositProxyWithABI.transferOwnership(
    process.env.MULTISIG_OWNER || "",
  );

  if (network.name != "hardhat") {
    setTimeout(async () => {
      await run("verify:verify", {
        contract: "contracts/vault/VaultDeposit.sol:VaultDeposit",
        address: vaultDepositAddress,
      });
    }, 30000); // 30000 milliseconds = 30 seconds

    setTimeout(async () => {
      await run("verify:verify", {
        contract: "contracts/vault/VaultDepositProxy.sol:VaultDepositProxy",
        address: vaultDepositProxyAddress,
        constructorArguments: [
          vaultDepositAddress,
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

function getWhitelist(networkName: string) {
  if (networkName == "bscMainnet") {
    return [
      "0x55d398326f99059fF775485246999027B3197955", // USDT
      "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
      "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", // WBTC
      "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", // WETH
      "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", // DAI
    ];
  }
  if (networkName == "ethMainnet") {
    return [
      "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
      "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
    ];
  }
  if (networkName == "arbitrumMainnet") {
    return [
      "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT
      "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
      "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
      "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // WBTC
      "0xa9004A5421372E1D83fB1f85b0fc986c912f91f3", // WBNB
      "0x912CE59144191C1204E64559FE8253a0e49E6548", // ARB
      "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", // DAI
    ];
  }
  if (networkName == "polygonZKevmMainnet") {
    return [
      "0x1E4a5963aBFD975d8c9021ce480b42188849D41d", // USDT
      "0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035", // USDC
      "0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9", // WETH
      "0xEA034fb02eB1808C2cc3adbC15f447B93CbE08e1", // WBTC
    ];
  }
  if (networkName == "polygonMainnet") {
    return [
      "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // USDT
      "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC
      // "0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9", // WETH
      // "0xEA034fb02eB1808C2cc3adbC15f447B93CbE08e1", // WBTC
    ];
  }

  return [];
}
