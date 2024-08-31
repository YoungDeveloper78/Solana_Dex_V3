import { Program } from "@coral-xyz/anchor";
import { Instruction } from "@orca-so/common-sdk";
import { PublicKey } from "@solana/web3.js";
import { AnchorDex } from "../artifacts/whirlpool";

/**
 * Parameters to update the reward authority at a particular rewardIndex on a AnchorDex.
 *
 * @category Instruction Types
 * @param whirlpool - PublicKey for the whirlpool to update.
 * @param rewardIndex - The reward index that we'd like to update. (0 <= index <= NUM_REWARDS).
 * @param rewardAuthority - The current rewardAuthority in the AnchorDex at the rewardIndex
 * @param newRewardAuthority - The new rewardAuthority in the AnchorDex at the rewardIndex
 */
export type SetRewardAuthorityParams = {
  whirlpool: PublicKey;
  rewardIndex: number;
  rewardAuthority: PublicKey;
  newRewardAuthority: PublicKey;
};

/**
 * Set the whirlpool reward authority at the provided `reward_index`.
 * Only the current reward authority for this reward index has permission to invoke this instruction.
 *
 * #### Special Errors
 * - `InvalidRewardIndex` - If the provided reward index doesn't match the lowest uninitialized index in this pool,
 *                          or exceeds NUM_REWARDS.
 *
 * @category Instructions
 * @param context - Context object containing services required to generate the instruction
 * @param params - SetRewardAuthorityParams object
 * @returns - Instruction to perform the action.
 */
export function setRewardAuthorityIx(
  program: Program<AnchorDex>,
  params: SetRewardAuthorityParams
): Instruction {
  const { whirlpool, rewardAuthority, newRewardAuthority, rewardIndex } = params;
  const ix = program.instruction.setRewardAuthority(rewardIndex, {
    accounts: {
      
      pool:      whirlpool,
      rewardAuthority,
      newRewardAuthority,
    },
  });

  return {
    instructions: [ix],
    cleanupInstructions: [],
    signers: [],
  };
}
