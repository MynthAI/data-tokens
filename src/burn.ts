import {
  Assets,
  Data,
  LucidEvolution,
  MintingPolicy,
  TxBuilder,
  UTxO,
} from "@lucid-evolution/lucid";
import { Err, Ok } from "ts-handling";

const Void = Data.void();

type LoadedValidator = {
  policyId: string;
  script: MintingPolicy;
};

const burn = async (
  lucid: LucidEvolution,
  tx: TxBuilder,
  loadedValidators: LoadedValidator[],
  referenceInputs: Record<string, UTxO>,
) => {
  const policies = loadedValidators.map((script) => script.policyId);
  const utxos = await lucid.wallet().getUtxos();
  const tokens = utxos.reduce<Assets>((tokens, utxo) => {
    Object.keys(utxo.assets)
      .filter((asset) => policies.includes(asset.substring(0, 56)))
      .forEach((token) => (tokens[token] = utxo.assets[token] * -1n));
    return tokens;
  }, {});

  if (!Object.keys(tokens).length)
    return Err("No burnable tokens found in wallet");

  const validators = loadedValidators.reduce<Record<string, MintingPolicy>>(
    (validators, script) => {
      validators[script.policyId] = script.script;
      return validators;
    },
    {},
  );
  const mintingPolicies = Object.keys(tokens).reduce<
    Record<string, MintingPolicy>
  >((policies, token) => {
    const policyId = token.substring(0, 56);
    policies[policyId] = validators[token.substring(0, 56)];
    return policies;
  }, {});

  tx.mintAssets(tokens, Void);

  for (const [policyId, script] of Object.entries(mintingPolicies)) {
    const reference = referenceInputs[policyId];
    if (reference) tx.readFrom([reference]);
    else tx.attach.MintingPolicy(script);
  }

  return Ok();
};

export default burn;
