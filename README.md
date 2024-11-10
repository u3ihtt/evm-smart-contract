1. Copy .env.example file to .env file and add private key, fund receiver address,..., API_KEY to verify smart contract automatically after deploy

2. Compile project smart contracts

run `npx hardhat compile`

3. Test smart contracts

- Run all tests in project
  `npx hardhat test`

- Run only 1 test script
  `npx hardhat test testFilePath `

EG: `npx hardhat test test/Token/TestToken.js`

4. Deploy smart contract

- Remember to deploy ProxyAdmin first.

- Run only 1 deploy script
  `npx hardhat run scriptFilePath  --network networkName ` or `yarn deploy scriptNameDeploy networkName`

EG: `npx hardhat run scripts/Token/deployToken.ts  --network goerli` or `yarn deploy MedooSyllabusNFT u2uTestnet`

network can be configured in hardhat.config.ts for both testnet and mainet

- View the list of scripts in `scripts/scripts.json`

5. The deployed smart contract's address will be shown in deployed_address.json file.
