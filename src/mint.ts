import { Data as D, TxBuilder, UTxO } from "@lucid-evolution/lucid";
import { type } from "arktype";
import { Err, ExtractAsyncData, Ok } from "ts-handling";
import Data from "./data.js";
import loadValidators from "./plutus.js";

const Void = D.void();

type LoadedValidators = ExtractAsyncData<typeof loadValidators>;

const mint = async (
  tx: TxBuilder,
  data: string,
  Data: Data,
  validators: LoadedValidators,
  referenceInputs: Record<string, UTxO>,
  metadata?: Record<string, string>,
) => {
  const parsedData = Data(data);
  if (parsedData instanceof type.errors) return Err(parsedData.summary);

  const { prefix, name } = parsedData;
  const script = validators[prefix];
  const tokens = { [`${script.policyId}${name}`]: 1n };

  tx.mintAssets(tokens, Void);

  const reference = referenceInputs[script.policyId];
  if (reference) tx.readFrom([reference]);
  else tx.attach.MintingPolicy(script.script);

  if (metadata)
    tx.attachMetadata(721, {
      [script.policyId]: {
        [name]: { ...metadata, prefix },
      },
    });

  return Ok();
};

export default mint;
