import { AnonymousIdentity, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { Actor, PocketIc } from '@hadronous/pic';
import {
  ApproveResult,
  _SERVICE as LedgerService,
  SubAccount,
  idlFactory as ledgerIdlFactory,
} from "../../vault-deposit/src/declarations/icp_ledger_canister/icp_ledger_canister.did.js";

import { Ed25519KeyIdentity } from '@dfinity/identity';

const base64ToUInt8Array = (base64String: string): Uint8Array => {
  return Buffer.from(base64String, 'base64');
};

const minterPublicKey = 'Uu8wv55BKmk9ZErr6OIt5XR1kpEGXcOSOC1OYzrAwuk=';
const minterPrivateKey =
  'N3HB8Hh2PrWqhWH2Qqgr1vbU9T3gb1zgdBD8ZOdlQnVS7zC/nkEqaT1kSuvo4i3ldHWSkQZdw5I4LU5jOsDC6Q==';

const minterIdentity = Ed25519KeyIdentity.fromKeyPair(
  base64ToUInt8Array(minterPublicKey),
  base64ToUInt8Array(minterPrivateKey),
);

const ICP_LEDGER_CANISTER_ID = Principal.fromText(
  'ryjl3-tyaaa-aaaaa-aaaba-cai',
);
const E8S_PER_ICP = 100_000_000;
const DEFAULT_FEE = BigInt(10_000);

export function icpToE8s(icp: number): bigint {
  return BigInt(icp * E8S_PER_ICP);
}

export class Ledger {
  public actor: Actor<LedgerService>;
  private readonly defaultIdentity = new AnonymousIdentity();

  constructor(pic: PocketIc) {
    this.actor = pic.createActor<LedgerService>(
      ledgerIdlFactory,
      ICP_LEDGER_CANISTER_ID,
    );
  }

  public async mint(
    amountE8s: bigint,
    toAccount: Principal,
    toSubAccount?: SubAccount,
    memo?: Uint8Array | number[],
  ): Promise<void> {
    return await this.transfer(
      minterIdentity,
      amountE8s,
      toAccount,
      toSubAccount,
      memo,
    );
  }

  public async approve(
    identity: Identity,
    amountE8s: bigint,
    toAccount: Principal,
    toSubAccount?: SubAccount,
    memo?: Uint8Array | number[],
  ): Promise<ApproveResult> {
    this.actor.setIdentity(identity);

    const res = await this.actor.icrc2_approve({
      amount: amountE8s,
      spender: {
        owner: toAccount,
        subaccount: toSubAccount ? [toSubAccount] : [],
      },
      memo: memo ? [memo] : [],
      fee: [DEFAULT_FEE],
      created_at_time: [],
      from_subaccount: [],
      expected_allowance: [],
      expires_at: [],

    });

    this.actor.setIdentity(this.defaultIdentity);

    return res;
  }

  // 'from_subaccount' : [] | [SubAccount],
  // 'expected_allowance' : [] | [Icrc1Tokens],
  // 'expires_at' : [] | [Icrc1Timestamp],
  // 'spender' : Account,

  public async transfer(
    identity: Identity,
    amountE8s: bigint,
    toAccount: Principal,
    toSubAccount?: SubAccount,
    memo?: Uint8Array | number[],
  ): Promise<void> {
    this.actor.setIdentity(identity);
    const subaccount: [] | [SubAccount] = toSubAccount ? [toSubAccount] : [];
    const optMemo: [] | [Uint8Array | number[]] = memo ? [memo] : [];

    const fromBalance = await this.actor.icrc1_balance_of({
      owner: identity.getPrincipal(),
      subaccount: [],
    });
    const toBalance = await this.actor.icrc1_balance_of({
      owner: toAccount,
      subaccount,
    });

    const result = await this.actor.icrc1_transfer({
      amount: amountE8s,
      to: {
        owner: toAccount,
        subaccount,
      },
      memo: optMemo,
      fee: [DEFAULT_FEE],
      created_at_time: [],
      from_subaccount: [],
    });
    // expect('Ok' in result).toBe(true);
    // console.log(result)

    const updatedFromBalance = await this.actor.icrc1_balance_of({
      owner: identity.getPrincipal(),
      subaccount: [],
    });
    // expect(updatedFromBalance).toBe(fromBalance - amountE8s - DEFAULT_FEE);

    const updatedToBalance = await this.actor.icrc1_balance_of({
      owner: toAccount,
      subaccount,
    });
    // expect(updatedToBalance).toBe(toBalance + amountE8s);   
    // console.log(updatedToBalance)

    this.actor.setIdentity(this.defaultIdentity);
  }
}
