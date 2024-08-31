import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { AnchorDex } from "../artifacts/whirlpool";

import { Instruction } from "@orca-so/common-sdk";

/**
 * Parameters to update fees and reward values for a position.
 *
 * @category Instruction Types
 * @param whirlpool - PublicKey for the whirlpool that the position will be opened for.
 * @param position - PublicKey for the  position will be opened for.
 * @param tickArrayLower - PublicKey for the tick-array account that hosts the tick at the lower tick index.
 * @param tickArrayUpper - PublicKey for the tick-array account that hosts the tick at the upper tick index.
 */
export type UpdateFeesAndRewardsParams = {
  whirlpool: PublicKey;
  position: PublicKey;
  tickArrayLower: PublicKey;
  tickArrayUpper: PublicKey;
};

/**
 * Update the accrued fees and rewards for a position.
 *
 * #### Special Errors
 * `TickNotFound` - Provided tick array account does not contain the tick for this position.
 * `LiquidityZero` - Position has zero liquidity and therefore already has the most updated fees and reward values.
 *
 * @category Instructions
 * @param context - Context object containing services required to generate the instruction
 * @param params - UpdateFeesAndRewardsParams object
 * @returns - Instruction to perform the action.
 */
export function updateFeesAndRewardsIx(
  program: Program<AnchorDex>,
  params: UpdateFeesAndRewardsParams
): Instruction {
  const { whirlpool, position, tickArrayLower, tickArrayUpper } = params;

  const ix = program.instruction.updateFeesAndRewards({
    accounts: {
      
      pool:      whirlpool,
      position,
      tickArrayLower,
      tickArrayUpper,
    },
  });

  return {
    instructions: [ix],
    cleanupInstructions: [],
    signers: [],
  };
}
