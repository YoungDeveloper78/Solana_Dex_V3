import BN from "bn.js";
import { WhirlpoolContext, PoolData } from "../../src";
import { getTokenBalance } from "./token";

export type VaultAmounts = {
  tokenA: BN;
  tokenB: BN;
};

export async function getVaultAmounts(ctx: WhirlpoolContext, whirlpoolData: PoolData) {
  return {
    tokenA: new BN(await getTokenBalance(ctx.provider, whirlpoolData.tokenVaultA)),
    tokenB: new BN(await getTokenBalance(ctx.provider, whirlpoolData.tokenVaultB)),
  };
}
