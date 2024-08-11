import {
  Data,
  LucidEvolution,
  MintingPolicy,
  Network,
  OutputDatum,
  TxBuilder,
  validatorToAddress,
} from "@lucid-evolution/lucid";

const Void: OutputDatum = { kind: "inline", value: Data.void() };

const createBlackholeAddress = (network: Network) => {
  const header = "5839010000322253330033371e9101203";
  const body = Array.from({ length: 63 }, () =>
    Math.floor(Math.random() * 10),
  ).join("");
  const footer = "0048810014984d9595cd01";

  return validatorToAddress(network, {
    type: "PlutusV2",
    script: `${header}${body}${footer}`,
  });
};

const deploy = (
  lucid: LucidEvolution,
  tx: TxBuilder,
  scripts: MintingPolicy[],
) => {
  const network = lucid.config().network;
  const blackhole = createBlackholeAddress(network);

  scripts.forEach((script) =>
    tx.pay.ToContract(blackhole, Void, undefined, script),
  );
};

export default deploy;
