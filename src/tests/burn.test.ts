import { Transaction } from "@dcspark/cardano-multiplatform-lib-nodejs";
import test from "ava";
import Builder from "data-tokens";
import loadWallet from "./wallet";

test("can burn token", async (t) => {
  const wallet = await loadWallet();
  const builder = (await Builder.create(wallet, ["01", "02", "03"])).assert();
  (
    await builder.mint(
      "03aa7a86d04f782f02a5ffe8725bce90795d23b1309f5642a184a95a3058e6dc63",
    )
  ).assert();
  (await builder.complete()).assert();
  (await builder.burn()).assert();
  const cbor = (await builder.complete()).assert();
  t.is(Transaction.from_cbor_hex(cbor).body().mint()?.policy_count(), 1);
});

test("cannot burn if there are no tokens", async (t) => {
  const wallet = await loadWallet();
  const builder = (await Builder.create(wallet, ["01", "02", "03"])).assert();
  const result = await builder.burn();
  t.false(result.ok);
});
