import {
  TransactionError,
  TransactionSignError,
  TxBuilder,
  TxSignBuilder,
  UTxO,
} from "@lucid-evolution/lucid";
import { Either } from "effect";
import { Either as EitherType } from "effect/Either";
import { Err, Ok, Result } from "ts-handling";

const convert = <T, E>(result: EitherType<T, E>): Result<T, E> =>
  Either.isRight(result) ? Ok(result.right) : Err(result.left);

const signedBuilderToCbor = async (
  builder: TxSignBuilder,
): Promise<
  Result<string, TransactionError> | Result<string, TransactionSignError>
> => {
  const completed = convert(await builder.completeSafe());
  if (!completed.ok) return Err(completed.error);

  return Ok(completed.data.toCBOR());
};

type TxResult = [UTxO[], UTxO[], string];

const toCbor = async (
  builder: TxBuilder,
): Promise<
  Result<TxResult, TransactionError> | Result<TxResult, TransactionSignError>
> => {
  const result = convert(await builder.chainSafe());
  if (!result.ok) return Err(result.error);

  const [walletUtxos, outputs, tx] = result.data;
  const cbor = await signedBuilderToCbor(tx);
  if (!cbor.ok) return cbor;

  return Ok([walletUtxos, outputs, cbor.data]);
};

export { convert, toCbor, signedBuilderToCbor };
