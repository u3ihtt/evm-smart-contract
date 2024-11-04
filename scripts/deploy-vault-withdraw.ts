import { exec } from 'child_process';
require('dotenv').config();

const network = process.env.OWNER_PRINCIPAL_ID ? "--network ic" : ""

const OWNER_PRINCIPAL_ID = process.env.OWNER_PRINCIPAL_ID;
const ADMIN_WITHDRAW_PRINCIPAL_ID = process.env.ADMIN_WITHDRAW_PRINCIPAL_ID;

// export const identity = await Secp256k1KeyIdentity.fromSeedPhrase(seed);

// const defaultCycle = 3_100_000_000_000;
const defaultCycle = 500_000_000_000;  //dfx canister status vault-withdraw-backend

// Build and deploy // Deploy identity là default controller luôn
exec(`npm run build && cd vault-withdraw && dfx deploy vault-withdraw-backend --argument '(
  principal \"${OWNER_PRINCIPAL_ID}\",
  principal \"${ADMIN_WITHDRAW_PRINCIPAL_ID}\"
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

