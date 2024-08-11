import {
  Blockfrost,
  getAddressDetails,
  Lucid,
  Network,
} from "@lucid-evolution/lucid";
import { type } from "arktype";
import { Command } from "commander";
import { Err, mayFailAsync, Ok, Problem } from "ts-handling";
import Builder from "./builder.js";
import Data from "./data.js";
import { Prefixes } from "./plutus.js";

const Arguments = {
  blockfrost: {
    flags: "-b, --blockfrost <string>",
    description:
      "The Blockfrost API key to use for querying the Cardano blockchain. Defaults to BLOCKFROST_API_KEY environment variable if omitted.",
  },
  prefixes: {
    name: "<prefixes...>",
    description:
      "The list of 1-byte prefixes. Represent as 2 character hex strings.",
  },
};

const program = new Command()
  .name("tokens")
  .description("CLI helper for data-tokens");

program
  .command("deploy")
  .description("Deploys the minting policies")
  .argument(
    "address",
    "The address of the wallet that will deploy the policies",
  )
  .argument(Arguments.prefixes.name, Arguments.prefixes.description)
  .option(Arguments.blockfrost.flags, Arguments.blockfrost.description)
  .action(async ($address: string, $prefixes: string[], $options: object) => {
    const address = Address($address);
    if (address instanceof type.errors) return exit(address.summary);
    const prefixes = Prefixes($prefixes);
    if (prefixes instanceof type.errors) return exit(prefixes.summary);
    const options = Options($options);
    if (options instanceof type.errors) return exit(options.summary);

    const builder = (await loadBuilder(address, prefixes, options)).unwrap();
    if (builder instanceof Problem) return exit(builder.error);

    const tx = (await builder.deploy().complete()).unwrap();
    if (tx instanceof Problem) return exit(tx.error.toString());

    console.log(tx);
    console.log(
      "Sign and submit above transaction. Waiting for blockchain confirmation...",
    );

    const referenceInputs = builder.getReferenceInputs();
    await builder.lucid.awaitTx(Object.values(referenceInputs)[0].txHash);
    console.log("Minting policies are deployed on-chain");

    for (const [policyId, utxo] of Object.entries(referenceInputs))
      console.log(`${policyId}: ${utxo.txHash}#${utxo.outputIndex}`);
  });

program
  .command("mint")
  .description("Mints a data token")
  .argument(
    "address",
    "The address of the wallet that will mint and own the token",
  )
  .argument("hash", "The transaction hash of the deployed minting policies")
  .argument("data", "The data to encode into the token")
  .argument(Arguments.prefixes.name, Arguments.prefixes.description)
  .option(
    "-m, --metadata <key-values...>",
    "Additional metadata to attach to the token, in the format of `name:value`",
  )
  .option(Arguments.blockfrost.flags, Arguments.blockfrost.description)
  .action(
    async (
      $address: string,
      $hash: string,
      $data: string,
      $prefixes: string[],
      $options: object,
    ) => {
      const address = Address($address);
      if (address instanceof type.errors) return exit(address.summary);
      const hash = TxHash($hash);
      if (hash instanceof type.errors) return exit(hash.summary);
      const prefixes = Prefixes($prefixes);
      if (prefixes instanceof type.errors) return exit(prefixes.summary);
      const data = Data(prefixes)($data);
      if (data instanceof type.errors) return exit(data.summary);
      const options = Options($options);
      if (options instanceof type.errors) return exit(options.summary);

      const builder = (
        await loadBuilder(address, prefixes, options, hash)
      ).unwrap();
      if (builder instanceof Problem) return exit(builder.error);

      const mint = await builder.mint(data.full, options.metadata);
      if (!mint.ok) return exit(mint.error);
      const tx = (await builder.complete()).unwrap();
      if (tx instanceof Problem) return exit(tx.error.toString());
      console.log(tx);
    },
  );

program
  .command("burn")
  .description("Burns data tokens in the wallet")
  .argument(
    "address",
    "The address of the wallet containing data tokens to burn",
  )
  .argument("hash", "The transaction hash of the deployed minting policies")
  .argument(Arguments.prefixes.name, Arguments.prefixes.description)
  .option(Arguments.blockfrost.flags, Arguments.blockfrost.description)
  .action(
    async (
      $address: string,
      $hash: string,
      $prefixes: string[],
      $options: object,
    ) => {
      const address = Address($address);
      if (address instanceof type.errors) return exit(address.summary);
      const hash = TxHash($hash);
      if (hash instanceof type.errors) return exit(hash.summary);
      const prefixes = Prefixes($prefixes);
      if (prefixes instanceof type.errors) return exit(prefixes.summary);
      const options = Options($options);
      if (options instanceof type.errors) return exit(options.summary);

      const builder = (
        await loadBuilder(address, prefixes, options, hash)
      ).unwrap();
      if (builder instanceof Problem) return exit(builder.error);

      const burn = await builder.burn();
      if (!burn.ok) return exit(burn.error);
      const tx = (await builder.complete()).unwrap();
      if (tx instanceof Problem) return exit(tx.error.toString());
      console.log(tx);
    },
  );

const loadBuilder = async (
  address: Address,
  prefixes: Prefixes,
  options: Options,
  txHash?: TxHash,
) => {
  const lucid = await Lucid(
    new Blockfrost(
      `https://cardano-${options.network.toLowerCase()}.blockfrost.io/api/v0`,
      options.blockfrost,
    ),
    options.network,
  );
  const utxos = (await mayFailAsync(() => lucid.utxosAt(address))).unwrap();
  if (utxos instanceof Problem)
    return Err(`Unable to query UTXOs ${utxos.error}`);
  lucid.selectWallet.fromAddress(address, utxos);

  const referenceInputs = txHash
    ? await lucid.utxosByOutRef(
        prefixes.map((_, index) => {
          return {
            txHash,
            outputIndex: index,
          };
        }),
      )
    : undefined;

  const builder = (
    await Builder.create(lucid, prefixes, referenceInputs)
  ).unwrap();
  if (builder instanceof Problem) return Err(builder.error);

  return Ok(builder);
};

const exit = (message: string) => {
  console.error(message);
  process.exitCode = 1;
};

const Address = type("string").narrow((v, ctx) => {
  try {
    const details = getAddressDetails(v);
    return !!details.paymentCredential;
  } catch {
    return ctx.mustBe("valid Cardano wallet address");
  }
});
type Address = typeof Address.infer;

const TxHash = type(/^[a-fA-F0-9]{64}$/).pipe((v) => v.toLowerCase());
type TxHash = typeof TxHash.infer;

const Metadata = type(/^[a-zA-Z0-9]+:(.+)$/)
  .array()
  .pipe((values) =>
    values.reduce<Record<string, string>>((metadata, keyValue) => {
      const [name, ...value] = keyValue.split(":");
      metadata[name] = value.join(":");
      return metadata;
    }, {}),
  );

const Options = type({
  "blockfrost?": "string>7",
  "metadata?": Metadata,
}).pipe((options, ctx) => {
  const blockfrost = options.blockfrost || process.env["BLOCKFROST_API_KEY"];
  if (!blockfrost) return ctx.error("set with Blockfrost API key");
  const network = blockfrost.substring(0, 7);

  if (!["mainnet", "preview", "preprod"].includes(network))
    return ctx.error("set with valid Blockfrost API key");

  return {
    blockfrost,
    metadata: options.metadata,
    network: (network.substring(0, 1).toUpperCase() +
      network.substring(1)) as Network,
  };
});
type Options = typeof Options.infer;

export default program;
