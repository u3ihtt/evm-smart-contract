import { exec } from 'child_process';
require('dotenv').config();

// export const identity = await Secp256k1KeyIdentity.fromSeedPhrase(seed);

// dfx identity remove deployIdentity

exec(`dfx identity import --seed-file seed.txt deployIdentity`, (error, stdout, stderr) => {
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
