import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import test from "ava";
import { Blockfrost } from "cardano-ts";
import { ExtractAsyncData } from "ts-handling";
import find from "../find";
import plutus from "../plutus";

type LoadedValidators = ExtractAsyncData<typeof plutus>;

const provider = () => {
  const blockfrostApiKey = process.env["BLOCKFROST_PREPROD_KEY"];
  if (!blockfrostApiKey) throw new Error("Blockfrost key is missing");

  return new Blockfrost(blockfrostApiKey);
};

const here = dirname(fileURLToPath(import.meta.url));
const loadValidators = async () =>
  JSON.parse(
    await readFile(join(here, "sample.json"), "utf8"),
  ) as LoadedValidators;

test("can find tokens", async (t) => {
  t.deepEqual(
    (
      await find(
        "addr_test1qqa9a9kndpd8fh7lpled5ff9625gxhyd7mvzv38w5vdqd5vjptdrw52vgu6lww5vcqef7q6jumz40feadrms0l8h0a7spg2hdv",
        provider(),
        await loadValidators(),
      )
    ).assert(),
    ["bb2d07be0d863ad3f840bb26e8e3ef465cda4e0607cd8ae10da43d303487661543"],
  );
});

test("can find multiple tokens", async (t) => {
  t.deepEqual(
    (
      await find(
        "addr_test1qqjc33ylnyfftq7gt6dj8ncg332myq6nzm23guk0f0cf9uzxkxf05kq2uprzjsflrma63ur7zhsk9kejjc9mhlhvkm2sgwhm03",
        provider(),
        await loadValidators(),
      )
    )
      .assert()
      .sort(),
    [
      "aafc7b5c5e9b31572410393ed6518c5c3b0309e6681354ab2329381793b7e3fc10",
      "cc9c8e5dda09a3e34284c82393ad4c260e0f70f920e6cf6bd1304abb6d7c840bb3",
      "ccddc4a09090ab1beac465f7b816870e25456a084494e5cceb43170f1a73e5e652",
    ],
  );
});

test("cannot find tokens for empty wallet", async (t) => {
  t.deepEqual(
    (
      await find(
        "addr_test1qrzf7q845z3gd5t9km7f934xzdhlg0t7lrjt2t52v3jss9f9eftzwjamqzsvy96crfp4sy79ug6qg377765jpdm5pcys78sj65",
        provider(),
        await loadValidators(),
      )
    ).assert(),
    [],
  );
});
