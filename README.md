# Deploy test ICRC1

```
dfx deploy icrc1_ledger_canister --argument "(variant {
  Init = record {
    decimals: vec{7;};
    token_symbol = \"ICRC1\";
    token_name = \"L-ICRC1\";
    minting_account = record {
      owner = principal \"$(dfx identity --identity anonymous get-principal)\"
    };
    transfer_fee = 10_000;
    metadata = vec {};
    initial_balances = vec {
      record {
        record {
          owner = principal \"$(dfx identity --identity default get-principal)\";
        };
        10_000_000_000;
      };
    };
    archive_options = record {
      num_blocks_to_archive = 1000;
      trigger_threshold = 2000;
      controller_id = principal \"$(dfx identity --identity anonymous get-principal)\";
    };
    feature_flags = opt record {
      icrc2 = true;
    };
  }
})"
```

dfx canister call icrc1_ledger_canister icrc1_transfer "(record {
to = record {
owner = principal \"mxyze-idvqn-azjox-hz5od-lmupf-2mpjh-mvtt4-4rgv3-tvi6m-g65xr-gqe\";
};
amount = 1_000_000_000;
})"

# Deploy test ICP

```
dfx deploy icp_ledger_canister --argument "
  (variant {
    Init = record {
      minting_account = \"$(dfx ledger account-id --identity default)\";
      initial_values = vec {
        record {
          \"$(dfx ledger account-id --identity default)\";
          record {
            e8s = 10_000_000_000 : nat64;
          };
        };
      };
      send_whitelist = vec {};
      transfer_fee = opt record {
        e8s = 10_000 : nat64;
      };
      token_symbol = opt \"LICP\";
      token_name = opt \"Local ICP\";
    }
  })
"
```

dfx canister call icp_ledger_canister icrc1_transfer "(record {
to = record {
owner = principal \"mxyze-idvqn-azjox-hz5od-lmupf-2mpjh-mvtt4-4rgv3-tvi6m-g65xr-gqe\";
};
amount = 1_000_000_000;
})"

# Deploy vault deposit

```
dfx deploy vault-deposit-backend --argument "(
  principal \"$(dfx identity --identity default get-principal)\",
  principal \"$(dfx identity --identity default get-principal)\",
  principal \"$(dfx identity --identity default get-principal)\"
)"
```

# Deploy Internet Identity

```
dfx deps pull && dfx deps deploy internet_identity
```
