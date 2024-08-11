import {
  LucidEvolution,
  TxBuilder,
  UTxO,
  validatorToScriptHash,
} from "@lucid-evolution/lucid";
import { type } from "arktype";
import { Blockfrost, Provider } from "cardano-ts";
import { Err, ExtractAsyncData, Ok, Problem, Result } from "ts-handling";
import burn from "./burn.js";
import Data from "./data.js";
import deploy from "./deploy.js";
import find from "./find.js";
import mint from "./mint.js";
import loadValidators, { Prefixes } from "./plutus.js";
import { toCbor } from "./tx.js";

class Builder {
  private readonly Data: Data;
  private tx: TxBuilder;

  // Use `await Builder.create()` static method to instantiate
  private constructor(
    public readonly lucid: LucidEvolution,
    private readonly address: string,
    prefixes: Prefixes,
    private readonly validators: ExtractAsyncData<typeof loadValidators>,
    private readonly referenceInputs: Record<string, UTxO>,
    private readonly provider: Provider,
  ) {
    this.Data = Data(prefixes);
    this.tx = lucid.newTx();
  }

  static async create(
    lucid: LucidEvolution,
    prefixes: Prefixes,
    referenceInputs: UTxO[] = [],
  ): Promise<Result<Builder, string>> {
    const prefixesResult = Prefixes(prefixes);
    if (prefixesResult instanceof type.errors)
      return Err(prefixesResult.summary);

    const validators = (await loadValidators(prefixes)).unwrap();
    if (validators instanceof Problem) return Err(validators.error);

    const provider = type({ projectId: "string>7" })(lucid.config().provider);
    if (provider instanceof type.errors) return Err("Could not find projectId");
    const blockfrost = new Blockfrost(provider.projectId);

    return Ok(
      new Builder(
        lucid,
        await lucid.wallet().address(),
        prefixesResult,
        validators,
        toReferenceInputs(referenceInputs),
        blockfrost,
      ),
    );
  }

  getReferenceInputs() {
    return { ...this.referenceInputs };
  }

  async mint(data: string, metadata?: Record<string, string>) {
    const result = await mint(
      this.tx,
      data,
      this.Data,
      this.validators,
      this.referenceInputs,
      metadata,
    );
    if (!result.ok) return Err(result.error);

    return Ok(this);
  }

  async burn() {
    const result = await burn(
      this.lucid,
      this.tx,
      Object.values(this.validators),
      this.referenceInputs,
    );
    if (!result.ok) return Err(result.error);

    return Ok(this);
  }

  find(address: string) {
    return find(address, this.provider, this.validators);
  }

  deploy() {
    deploy(
      this.lucid,
      this.tx,
      Object.values(this.validators).map((loaded) => loaded.script),
    );
    return this;
  }

  async complete() {
    const result = await toCbor(this.tx);
    this.tx = this.lucid.newTx();
    if (!result.ok) return result;

    const [wallet, outputs, cbor] = result.data;
    const utxos = [
      ...wallet,
      ...outputs.filter((utxo) => utxo.address === this.address),
    ];

    outputs.forEach((utxo) => {
      if (utxo.scriptRef)
        this.referenceInputs[validatorToScriptHash(utxo.scriptRef)] = utxo;
    });

    this.lucid.selectWallet.fromAddress(this.address, utxos);
    return Ok(cbor);
  }
}

const toReferenceInputs = (utxos: UTxO[]) =>
  utxos.reduce<Record<string, UTxO>>((inputs, utxo) => {
    if (utxo.scriptRef) inputs[validatorToScriptHash(utxo.scriptRef)] = utxo;
    return inputs;
  }, {});

export default Builder;
