import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import dotenv from "dotenv";
dotenv.config();

// const accounts = {
//   mnemonic: process.env.MNEMONIC
// };

const accounts =
  process.env.PRIVATE_KEY !== undefined ? [`0x${process.env.PRIVATE_KEY}`] : [];

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    arbitrumTestnet: {
      url:
        "https://arb-sepolia.g.alchemy.com/v2/XPBG4bTqRnXOCzi_3Sj6h-6NOhmnGn_R" ||
        "",
      accounts: accounts,
    },
    goerli: {
      url:
        "https://eth-goerli.g.alchemy.com/v2/Wy8sCVDvSyTrIGs1413rbrghpm0MFjHy" ||
        "",
      accounts: accounts,
    },
    ethSepolia: {
      url:
        "https://eth-sepolia.g.alchemy.com/v2/gwh5VK5SmUpoWlw_gB_QT5zUqNx7HVBo" ||
        "",
      accounts: accounts,
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-2-s3.bnbchain.org:8545" || "",
      accounts: accounts,
    },
    ethMainnet: {
      url: "https://eth.public-rpc.com",
      accounts: accounts,
    },
    bscMainnet: {
      url: "https://bsc-dataseed3.binance.org/",
      accounts: accounts,
    },
    polygonMainnet: {
      url: "https://polygon-rpc.com",
      accounts: accounts,
    },
    polygonZKevmMainnet: {
      url: "https://polygon-rpc.com/zkevm",
      accounts: accounts,
    },
    arbitrumMainnet: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: accounts,
    },
    lightlinkTestnet: {
      url: "https://replicator.pegasus.lightlink.io/rpc/v1",
      accounts: accounts,
    },
    lightlinkMainnet: {
      url: "https://replicator.phoenix.lightlink.io/rpc/v1",
      accounts: accounts,
    },
    u2uTestnet: {
      url: "https://rpc-nebulas-testnet.uniultra.xyz",
      accounts: accounts,
    },
    bitfinityTestnet: {
      url: "https://testnet.bitfinity.network/api",
      accounts: accounts,
    },
    localTestnet: {
      url: "http://127.0.0.1:8449",
      accounts: accounts,
    },
    opencampusTestnet: {
      url: "https://rpc.open-campus-codex.gelato.digital/",
      accounts: accounts,
    },
  },
  etherscan: {
    apiKey: {
      arbitrumTestnet: `${process.env.API_KEY_ARB}`,
      bscMainnet: `${process.env.API_KEY_BSC}`,
      bscTestnet: `${process.env.API_KEY_BSC}`,
      goerli: `${process.env.API_KEY_ETHER}`,
      sepolia: `${process.env.API_KEY_ETHER}`,
      arbitrumOne: `${process.env.API_KEY_ARBITRUM}`,
      polygonZKevmMainnet: `${process.env.API_KEY_POLYGON_ZKEVM}`,
      polygonZkevm: `${process.env.API_KEY_POLYGON_ZKEVM}`,
      polygon: `${process.env.API_KEY_POLYGON}`,
      lightLink: `${process.env.API_KEY_LIGHT_LINK}`,
      lightlinkTestnet: `${process.env.API_KEY_LIGHT_LINK}`,
      lightlinkMainnet: `${process.env.API_KEY_LIGHT_LINK}`,
      opencampusTestnet: "api-key",
      u2uTestnet: "api-key",
      bitfinityTestnet: "api-test-key",
      localTestnet: "test-key",
    },
    customChains: [
      {
        network: "arbitrumTestnet",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
      {
        network: "bscTestnet",
        chainId: 97,
        urls: {
          apiURL: "https://api-testnet.bscscan.com/api",
          browserURL: "https://testnet.bscscan.com/",
        },
      },
      {
        network: "goerli",
        chainId: 5,
        urls: {
          apiURL: "https://api-goerli.etherscan.io/api",
          browserURL: "https://goerli.etherscan.io/",
        },
      },
      {
        network: "lightlinkTestnet",
        chainId: 1891,
        urls: {
          apiURL: "https://pegasus.lightlink.io/api",
          browserURL: "https://pegasus.lightlink.io",
        },
      },
      {
        network: "lightlinkMainnet",
        chainId: 1890,
        urls: {
          apiURL: "https://phoenix.lightlink.io/api",
          browserURL: "https://phoenix.lightlink.io",
        },
      },
      {
        network: "u2uTestnet",
        chainId: 2484,
        urls: {
          apiURL: "https://testnet.u2uscan.xyz/api",
          browserURL: "https://testnet.u2uscan.xyz",
        },
      },
      {
        network: "bitfinityTestnet",
        chainId: 355113,
        urls: {
          apiURL: "https://testnet.bitfinity.network/api",
          browserURL: "https://explorer.testnet.bitfinity.network",
        },
      },
      {
        network: "localTestnet",
        chainId: 72611749453,
        urls: {
          apiURL: "http://localhost/api/",
          browserURL: "http://localhost/",
        },
      },
      {
        network: "opencampusTestnet",
        chainId: 656476,
        urls: {
          apiURL: "https://opencampus-codex.blockscout.com/api",
          browserURL: "https://opencampus-codex.blockscout.com",
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
};

export default config;
