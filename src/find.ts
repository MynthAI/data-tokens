import { getAddressDetails } from "@lucid-evolution/lucid";
import { type } from "arktype";
import { Provider, Wallet } from "cardano-ts";
import {
  Err,
  ExtractAsyncData,
  isProblem,
  mayFailAsync,
  Ok,
} from "ts-handling";
import loadValidators from "./plutus.js";

type LoadedValidators = ExtractAsyncData<typeof loadValidators>;

const find = async (
  $address: string,
  provider: Provider,
  validators: LoadedValidators,
) => {
  const address = Address($address);
  if (address instanceof type.errors) return Err(address.summary);
  const wallet = (
    await mayFailAsync(() => Wallet.fromAddress(provider, address))
  ).unwrap();
  if (isProblem(wallet)) return Err(wallet.error);

  const policies = Object.values(validators).map((script) => script.policyId);
  const prefixes = Object.entries(validators).reduce<Record<string, string>>(
    (prefixes, [prefix, validator]) => {
      prefixes[validator.policyId] = prefix;
      return prefixes;
    },
    {},
  );
  const tokens = wallet.utxos.reduce<string[]>(
    (tokens, utxo) => [
      ...tokens,
      ...Object.keys(utxo.assets).filter((token) =>
        policies.includes(token.substring(0, 56)),
      ),
    ],
    [],
  );

  return Ok(
    tokens.map(
      (token) => prefixes[token.substring(0, 56)] + token.substring(56),
    ),
  );
};

const Address = type("string").narrow((v, ctx) => {
  try {
    const details = getAddressDetails(v);
    return !!details.paymentCredential && !!details.stakeCredential;
  } catch {
    return ctx.mustBe("valid Cardano wallet address with stake credential");
  }
});

export default find;
