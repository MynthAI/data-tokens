import { type } from "arktype";

const Data = (prefixes: string[]) =>
  type(/^[0-9a-fA-F]{66}$/).pipe((v, ctx) => {
    const value = v.toLowerCase();
    const prefix = value.substring(0, 2);
    const name = value.substring(2);

    if (!prefixes.includes(prefix))
      return ctx.error("one of " + prefixes.join(","));
    return { name, prefix, full: value };
  });

const $Data = Data(["01"]);
type Data = typeof $Data;

export default Data;
