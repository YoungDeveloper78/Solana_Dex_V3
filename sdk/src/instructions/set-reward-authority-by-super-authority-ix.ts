import { Program } from "@coral-xyz/anchor";
import { Instruction } from "@orca-so/common-sdk";
import { PublicKey } from "@solana/web3.js";
import { AnchorDex } from "../artifacts/whirlpool";

/**
 * Parameters to update the reward authority at a particular rewardIndex on a AnchorDex.
 *
 * @category Instruction Types
 * @param whirlpool - PublicKey for the whirlpool to update. This whirlpool has to be part of the provided WhirlpoolsConfig space.
 * @param whirlpoolsConfig - The public key for the WhirlpoolsConfig this pool is initialized in
 * @param rewardIndex - The reward index that we'd like to update. (0 <= index <= NUM_REWARDS).
 * @param rewardEmissionsSuperAuthority - The current rewardEmissionsSuperAuthority in the WhirlpoolsConfig
 * @param newRewardAuthority - The new rewardAuthority in the AnchorDex at the rewardIndex
 */
export type SetRewardAuthorityBySuperAuthorityParams = {
  whirlpool: PublicKey;
  whirlpoolsConfig: PublicKey;
  rewardIndex: number;
  rewardEmissionsSuperAuthority: PublicKey;
  newRewardAuthority: PublicKey;
};

/**
 * Set the whirlpool reward authority at the provided `reward_index`.
 * Only the current reward super authority has permission to invoke this instruction.
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
export function setRewardAuthorityBySuperAuthorityIx(
  program: Program<AnchorDex>,
  params: SetRewardAuthorityBySuperAuthorityParams
): Instruction {
  const {
    whirlpoolsConfig,
    whirlpool,
    rewardEmissionsSuperAuthority,
    newRewardAuthority,
    rewardIndex,
  } = params;

  const ix = program.instruction.setRewardAuthorityBySuperAuthority(rewardIndex, {
    accounts: {
      poolsConfig:  whirlpoolsConfig,
      pool:      whirlpool,
      rewardEmissionsSuperAuthority,
      newRewardAuthority,
    },
  });

  return {
    instructions: [ix],
    cleanupInstructions: [],
    signers: [],
  };
}
