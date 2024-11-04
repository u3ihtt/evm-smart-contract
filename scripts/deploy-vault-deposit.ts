import { exec } from 'child_process';
require('dotenv').config();

const network = process.env.OWNER_PRINCIPAL_ID ? "--network ic" : ""

const OWNER_PRINCIPAL_ID = process.env.OWNER_PRINCIPAL_ID;
const ADMIN_DEPOSIT_PRINCIPAL_ID = process.env.ADMIN_DEPOSIT_PRINCIPAL_ID;
const FUND_RECEIVER_PRINCIPAL_ID = process.env.FUND_RECEIVER_PRINCIPAL_ID;

// export const identity = await Secp256k1KeyIdentity.fromSeedPhrase(seed);

// const defaultCycle = 3_100_000_000_000;
const defaultCycle = 500_000_000_000;  //dfx canister status vault-withdraw-backend

// Build and deploy
exec(`npm run build && cd vault-deposit && dfx deploy vault-deposit-backend --argument '(
  principal \"${OWNER_PRINCIPAL_ID}\",
  principal \"${ADMIN_DEPOSIT_PRINCIPAL_ID}\",
  principal \"${FUND_RECEIVER_PRINCIPAL_ID}\"
)' ${network} --with-cycles ${defaultCycle}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
});
