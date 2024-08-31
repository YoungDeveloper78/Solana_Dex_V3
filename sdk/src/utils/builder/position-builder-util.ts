import { WhirlpoolContext } from "../..";
import { WhirlpoolAccountFetchOptions } from "../../network/public/fetcher";
import { PositionData, PoolData } from "../../types/public";
import { PDAUtil } from "../public";

export async function getTickArrayDataForPosition(
  ctx: WhirlpoolContext,
  position: PositionData,
  pool: PoolData,
  opts?: WhirlpoolAccountFetchOptions
) {
  const lowerTickArrayKey = PDAUtil.getTickArrayFromTickIndex(
    position.tickLowerIndex,
    pool.tickSpacing,
    position.pool,
    ctx.program.programId
  ).publicKey;
  const upperTickArrayKey = PDAUtil.getTickArrayFromTickIndex(
    position.tickUpperIndex,
    pool.tickSpacing,
    position.pool,
    ctx.program.programId
  ).publicKey;

  return await ctx.fetcher.getTickArrays([lowerTickArrayKey, upperTickArrayKey], opts);
}
