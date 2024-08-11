import { Blockfrost, Lucid } from "@lucid-evolution/lucid";

const testAddress =
  "addr_test1qzl2hhm5wvat3ueff4f7demu72svmeg827gncguz8xz708h7hv2x85kkesrswsl2a8ycqk4temzlyu08sz86qc9xlmgqwlhdkf";

const load = async () => {
  const blockfrostApiKey = process.env["BLOCKFROST_API_KEY"];
  if (!blockfrostApiKey) throw new Error("Blockfrost key is missing");

  const lucid = await Lucid(
    new Blockfrost(
      "https://cardano-preview.blockfrost.io/api/v0",
      blockfrostApiKey,
    ),
    "Preview",
  );
  const utxos = await lucid.utxosAt(testAddress);
  lucid.selectWallet.fromAddress(testAddress, utxos);
  return lucid;
};

export default load;
