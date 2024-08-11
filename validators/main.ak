use aiken/bytearray
use aiken/dict
use aiken/list
use aiken/transaction.{Mint, ScriptContext, Transaction}
use aiken/transaction/value.{AssetName, MintedValue, PolicyId}

// A minting policy that allows arbitrary 1-byte prefixes to be embedded into
// the policy. The policy allows minting and burning of any token, so long as
// the token name totals 32 bytes. With the prefix and the token name
// combined, this allows 33 bytes of data to be embedded into a token.
//
// The intention of this minting policy is to allow users to embed 33 bytes of
// data inside their wallets. These tokens essentially act as wallet metadata
// to allow third parties to query information from the holding wallet.
validator(prefix: ByteArray) {
  fn mint(_redeemer: Data, context: ScriptContext) {
    // Don't need to do anything with the prefix, just needs to exist so it's
    // embedded into the policy ID
    expect Some(_prefix) = Some(bytearray.length(prefix) == 1)

    let ScriptContext(Transaction { mint, .. }, purpose) = context
    when purpose is {
      Mint(policy) -> mint_validator(policy, mint)
      _ -> fail @"This is a minting policy, only"
    }
  }
}

// Validates that tokens are either minted with 32 bytes of data, or are being
// burned. Burning is always allowed.
fn mint_validator(policy: PolicyId, mint: MintedValue) {
  or {
    are_minted_tokens_valid(policy, mint),
    allow_burn(policy, mint),
    fail @"Invalid mint",
  }
}

// Validate that:
// 1. Each token has 32 bytes embedded into the token name
// 2. Each token in the mint transaction is unique
fn are_minted_tokens_valid(policy: PolicyId, mint: MintedValue) {
  mint
    |> value.from_minted_value()
    |> value.tokens(policy)
    |> dict.to_pairs()
    |> list.all(
        fn(token) {
          let Pair(name, quantity) = token
          and {
            validate_name(name),
            validate_quantity(quantity),
          }
        },
      )
}

fn validate_name(name: AssetName) {
  if bytearray.length(name) == 32 {
    True
  } else {
    trace @"Token name must be 32 bytes"
    False
  }
}

fn validate_quantity(quantity: Int) {
  if quantity == 1 {
    True
  } else {
    trace @"Each token should have unique name"
    False
  }
}

// Always allow burning of tokens
fn allow_burn(policy: PolicyId, mint: MintedValue) -> Bool {
  mint
    |> value.from_minted_value()
    |> value.tokens(policy)
    |> dict.to_pairs()
    |> list.all(
        fn(v) {
          let Pair(_, quantity) = v
          quantity < 0
        },
      )
}
