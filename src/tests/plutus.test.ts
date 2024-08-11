import test from "ava";
import { loadValidators } from "data-tokens";

test("can load validators", async (t) => {
  const validators = (await loadValidators(["01", "02", "03"])).assert();
  t.deepEqual(Object.keys(validators), ["01", "02", "03"]);
  t.truthy(validators["02"].script.script);
});
