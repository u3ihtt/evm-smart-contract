import {
  _SERVICE,
  idlFactory,
  init,
} from "../vault-withdraw/src/declarations/vault-withdraw-backend/vault-withdraw-backend.did.js";

import {
  _SERVICE as _ICRC1SERVICE,
  idlFactory as icrc1IdlFactory,
  init as icrc1Init,
  LedgerArg as Icrc1LedgerArg
} from "../vault-deposit/.dfx/local/canisters/icrc1_ledger_canister/service.did.js";

import { join } from "path";
import { Principal } from "@dfinity/principal";
import { Actor, PocketIc, PocketIcServer, generateRandomIdentity } from "@hadronous/pic";
import { IDL } from '@dfinity/candid';
import { Ledger } from "./support/ledger";
import "mocha";
import { assert, expect } from "chai";

describe("test-vault-withdraw", async () => {
  let picServer: PocketIcServer;
  let pic: PocketIc;
  let actor: Actor<_SERVICE>;
  let icrc1Actor: Actor<_ICRC1SERVICE>;
  let canisterId: Principal;
  // let ledgerCanisterId = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
  let ledger: Ledger;
  const owner = generateRandomIdentity();
  const admin = generateRandomIdentity();
  const fundReceiver = generateRandomIdentity();
  const user1 = generateRandomIdentity();
  const user2 = generateRandomIdentity();
  let icrc1CanisterId: Principal;
  let icpTokenCanisterId = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai');

  const fee = BigInt(10000);

  let vaultDepositPath = join(
    __dirname,
    "../vault-withdraw/target/wasm32-unknown-unknown/release/vault_withdraw_backend.wasm"
  );

  let icrc1TokenPath = join(
    __dirname,
    "../vault-deposit/.dfx/local/canisters/icrc1_ledger_canister/icrc1_ledger_canister.wasm"
  );

  const NNS_SUBNET_ID =
    'adol3-eyjhm-kq6us-sybsj-ovznm-n353k-7xjja-g7q5b-rq2o7-7zphs-dqe';

  const NNS_STATE_PATH = join(
    __dirname,
    "./support/state/nns_state/node-100/state"
  );

  before(async function () {
    picServer = await PocketIcServer.start();
    pic = await PocketIc.create(picServer.getUrl(), {
      nns: {
        fromPath: NNS_STATE_PATH,
        subnetId: Principal.fromText(NNS_SUBNET_ID)
      }
    });

    await pic.setTime(new Date(2025, 0, 30).getTime());
    await pic.tick();

    const fixture = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: vaultDepositPath,
      arg: IDL.encode(init({ IDL }), [owner.getPrincipal(), admin.getPrincipal()]),
    });
    actor = fixture.actor;
    actor.setIdentity(user1)
    canisterId = fixture.canisterId;

    ledger = new Ledger(pic);
    await ledger.mint(BigInt("10000000"), user1.getPrincipal());

    // SETUP icrc1 token
    const initArg: Icrc1LedgerArg = {
      Init: {
        decimals: [7],
        token_symbol: "ICRC1",
        token_name: "L-ICRC1",
        minting_account: {
          owner: owner.getPrincipal(),
          subaccount: []
        },
        transfer_fee: BigInt(10_000),
        metadata: [],
        initial_balances: [
          [
            { owner: user1.getPrincipal(), subaccount: [] }, BigInt(1000000000)
          ]
        ],
        archive_options: {
          cycles_for_archive_creation: [],
          max_message_size_bytes: [],
          max_transactions_per_response: [],
          node_max_memory_size_bytes: [],
          num_blocks_to_archive: BigInt(1000),
          trigger_threshold: BigInt(2000),
          controller_id: user1.getPrincipal(),
        },
        feature_flags: [{
          icrc2: true,
        }],
        accounts_overflow_trim_quantity: [],
        fee_collector_account: [],
        max_memo_length: [],
        maximum_number_of_accounts: []
      }
    }
    const icrc1Fixture = await pic.setupCanister<_ICRC1SERVICE>({
      idlFactory: icrc1IdlFactory,
      wasm: icrc1TokenPath,
      arg: IDL.encode(icrc1Init({ IDL }), [initArg]),
    })
    icrc1Actor = icrc1Fixture.actor
    icrc1CanisterId = icrc1Fixture.canisterId;
  });


  it("should change admin address fail because not owner", async () => {
    try {
      actor.setIdentity(user1)
      await actor.set_admin(
        user1.getPrincipal()
      )
      assert.ok(false, "This test should fail");
    } catch (e) {
      expect(e.toString()).to.include("Not owner")
    }
  })

  it("should withdraw ICP fail because exceed bbalance", async () => {
    actor.setIdentity(admin)
    const response = await actor.withdraw_token(
      BigInt("10000"),
      icpTokenCanisterId,
      user1.getPrincipal(),
      "medoo"
    );
    expect(JSON.stringify(response)).to.include("InsufficientFunds { balance: Nat(0) }")
    // console.log(await actor.get_withdraw_info_by_nonce(BigInt(0), BigInt(100)))
  });

  it("should withdraw ICP fail because not admin call to withdraw", async () => {
    try {
      actor.setIdentity(user1)
      const response1 = await actor.withdraw_token(
        BigInt("10000"),
        icpTokenCanisterId,
        user1.getPrincipal(),
        "medoo1"
      );
    } catch (e) {
      // console.log(e)
      expect(e.toString()).to.include("Not admin")
    }
  });

  it("should withdraw ICP success", async () => {
    await ledger.mint(BigInt("20000"), canisterId);

    const usere1BalanceBefore = await getBalance(icpTokenCanisterId, user1.getPrincipal())
    const canisterBalanceBefore = await getBalance(icpTokenCanisterId, canisterId)

    actor.setIdentity(admin)
    const response1 = await actor.withdraw_token(
      BigInt("10000"),
      icpTokenCanisterId,
      user1.getPrincipal(),
      "medoo"
    );
    const user1BalanceAfter = await getBalance(icpTokenCanisterId, user1.getPrincipal())
    const canisterBalanceAfter = await getBalance(icpTokenCanisterId, canisterId)

    expect(canisterBalanceAfter).to.be.equal(canisterBalanceBefore - fee - BigInt("10000"))
    expect(user1BalanceAfter).to.be.equal(usere1BalanceBefore + BigInt("10000"))
    console.log(response1); // { Ok: 7n }

    console.log(await actor.get_withdraw_info_by_nonce(BigInt(0), BigInt(100)))
  });

  async function getBalance(token: Principal, user: Principal) {
    const actor = pic.createActor<_ICRC1SERVICE>(icrc1IdlFactory, token);
    return await actor.icrc1_balance_of({
      owner: user,
      subaccount: []
    })
  }
  after(async () => {
    await pic.tearDown();
    await picServer.stop();
  });
});
