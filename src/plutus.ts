import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  applyParamsToScript,
  MintingPolicy,
  Validator,
  validatorToScriptHash,
} from "@lucid-evolution/lucid";
import { type } from "arktype";
import { Err, Ok } from "ts-handling";

const here = dirname(fileURLToPath(import.meta.url));

const read = () => readFile(join(here, "..", "plutus.json"), "utf8");

const Json = type("string").pipe((s, ctx) => {
  try {
    return JSON.parse(s);
  } catch {
    return ctx.error("valid JSON");
  }
});

const Validators = type({
  validators: type({
    title: "string",
    compiledCode: "string",
  })
    .array()
    .atLeastLength(1),
}).pipe((validators) =>
  validators.validators.reduce<Record<string, Validator>>(
    (validators, validator) => {
      validators[validator.title] = {
        type: "PlutusV2",
        script: validator.compiledCode,
      };
      return validators;
    },
    {},
  ),
);

const PlutusParser = Json.pipe((json) => Validators(json));

const Prefixes = type(/^[0-9a-f]{2}$/)
  .array()
  .atLeastLength(1)
  .narrow(
    (prefixes, ctx) =>
      new Set(prefixes).size === prefixes.length || ctx.mustBe("unique"),
  );
type Prefixes = typeof Prefixes.infer;

type LoadedValidator = {
  policyId: string;
  script: MintingPolicy;
};

const loadValidators = async (prefixes: Prefixes) => {
  const prefixesResult = Prefixes(prefixes);
  if (prefixesResult instanceof type.errors) return Err(prefixesResult.summary);
  prefixes = prefixesResult;

  const plutus = PlutusParser(await read());
  if (plutus instanceof type.errors) return Err(plutus.summary);

  const mint = plutus["main.mint"];
  if (!mint) return Err("main.mint validator is missing from plutus.json");

  return Ok(
    prefixes.reduce<Record<string, LoadedValidator>>((prefixes, prefix) => {
      const script = {
        ...mint,
        script: applyParamsToScript(mint.script, [prefix]),
      };
      prefixes[prefix] = {
        policyId: validatorToScriptHash(script),
        script,
      };
      return prefixes;
    }, {}),
  );
};

export default loadValidators;
export { Prefixes };
