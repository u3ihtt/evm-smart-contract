import { Actor, ActorSubclass, HttpAgent } from "@dfinity/agent";
import {
    _SERVICE,
    idlFactory,
    init,
} from "./vault-deposit/src/declarations/vault-deposit-backend/vault-deposit-backend.did.js";

// Define the canister ID and the interface (IDL) of the canister
const canisterId = '5e254-liaaa-aaaak-qitma-cai';


async function queryCanister() {
    // Create an HTTP agent to interact with the Internet Computer
    const agent = new HttpAgent({ host: 'https://ic0.app' }); // Using mainnet; replace if needed


    const actor: ActorSubclass<_SERVICE> = Actor.createActor(
        idlFactory,
        {
            agent,
            canisterId,
        },
    );

    try {
        // Call the query function on the canister
        const result = await actor.get_deposit_info_by_nonce(BigInt(0), BigInt(10));
        console.log('Query Result:', result);
    } catch (error) {
        console.error('Error calling query function:', error);
    }
}

queryCanister();
