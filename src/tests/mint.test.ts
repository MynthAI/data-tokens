import { Transaction } from "@dcspark/cardano-multiplatform-lib-nodejs";
import test from "ava";
import Builder from "data-tokens";
import loadWallet from "./wallet";

test("can mint token", async (t) => {
  const wallet = await loadWallet();
  const builder = (await Builder.create(wallet, ["01", "02", "03"])).assert();
  (
    await builder.mint(
      "03aa7a86d04f782f02a5ffe8725bce90795d23b1309f5642a184a95a3058e6dc63",
    )
  ).assert();
  const cbor = (await builder.complete()).assert();
  t.is(Transaction.from_cbor_hex(cbor).body().mint()?.policy_count(), 1);
  t.falsy(Transaction.from_cbor_hex(cbor).auxiliary_data()?.metadata());
  t.falsy(Transaction.from_cbor_hex(cbor).body().reference_inputs());
});

test("can mint token with chained reference script", async (t) => {
  const wallet = await loadWallet();
  const builder = (await Builder.create(wallet, ["01", "02", "03"])).assert();
  (await builder.deploy().complete()).assert();
  (
    await builder.mint(
      "03aa7a86d04f782f02a5ffe8725bce90795d23b1309f5642a184a95a3058e6dc63",
    )
  ).assert();
  const cbor = (await builder.complete()).assert();
  t.is(Transaction.from_cbor_hex(cbor).body().mint()?.policy_count(), 1);
  t.falsy(Transaction.from_cbor_hex(cbor).auxiliary_data()?.metadata());
  t.is(Transaction.from_cbor_hex(cbor).body().reference_inputs()?.len(), 1);
});

test("can mint token with loaded reference script", async (t) => {
  const wallet = await loadWallet();
  let builder = (await Builder.create(wallet, ["01", "02", "03"])).assert();
  (await builder.deploy().complete()).assert();
  const referenceInputs = Object.values(builder.getReferenceInputs());

  builder = (
    await Builder.create(wallet, ["01", "02", "03"], referenceInputs)
  ).assert();
  (
    await builder.mint(
      "03aa7a86d04f782f02a5ffe8725bce90795d23b1309f5642a184a95a3058e6dc63",
    )
  ).assert();
  const cbor = (await builder.complete()).assert();
  t.is(Transaction.from_cbor_hex(cbor).body().mint()?.policy_count(), 1);
  t.falsy(Transaction.from_cbor_hex(cbor).auxiliary_data()?.metadata());
  t.is(Transaction.from_cbor_hex(cbor).body().reference_inputs()?.len(), 1);
});

test("can mint token with metadata", async (t) => {
  const wallet = await loadWallet();
  const builder = (await Builder.create(wallet, ["01", "02", "03"])).assert();
  (
    await builder.mint(
      "03aa7a86d04f782f02a5ffe8725bce90795d23b1309f5642a184a95a3058e6dc63",
      { image: "abc" },
    )
  ).assert();
  const cbor = (await builder.complete()).assert();
  t.is(Transaction.from_cbor_hex(cbor).body().mint()?.policy_count(), 1);
  t.is(
    Transaction.from_cbor_hex(cbor)
      .auxiliary_data()
      ?.metadata()
      ?.labels()
      .get(0),
    721n,
  );
});

test("cannot mint token out of range", async (t) => {
  const wallet = await loadWallet();
  const builder = (await Builder.create(wallet, ["01", "02"])).assert();
  const result = await builder.mint(
    "03aa7a86d04f782f02a5ffe8725bce90795d23b1309f5642a184a95a3058e6dc63",
  );
  t.false(result.ok);
});
