import { Actor, ActorSubclass, HttpAgent } from "@dfinity/agent";
import {
    _SERVICE,
    idlFactory,
    init,
} from "./vault-withdraw/src/declarations/vault-withdraw-backend/vault-withdraw-backend.did.js";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { Principal } from "@dfinity/principal";

const canisterId = 'zjlzg-yiaaa-aaaak-qitwa-cai'; // Canister ID of Withdraw Smart contract


async function withdraw() {

    const identity = Secp256k1KeyIdentity.fromSeedPhrase("");


    const agent = new HttpAgent({
        host: 'https://ic0.app',
        identity: identity as any
    }); // Using mainnet; replace if needed

    const actor: ActorSubclass<_SERVICE> = Actor.createActor(
        idlFactory,
        {
            agent,
            canisterId,
        },
    );

    console.log("principal: ", identity.getPrincipal().toString())

    try {
        // Call the query function on the canister
        const result = await actor.withdraw_token(
            BigInt(123), // Amount to withdraw
            Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"),  // Token printcipal id
            Principal.fromText("icvuj-hoxwx-afxqj-kp43w-gqxef-idlq7-brs22-hdasj-vtxqi-k3nmu-dqe"),  // Recipient printcipal id
            "request data", // withdraw request id
        );

        console.log('Query Result:', result);
    } catch (error) {
        console.error('Error calling query function:', error);
    }
}

withdraw();
