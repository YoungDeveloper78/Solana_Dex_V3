import { BN, Program } from "@coral-xyz/anchor";
import { Instruction, PDA } from "@orca-so/common-sdk";
import {  PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { AnchorDex } from "../../artifacts/whirlpool";

/**
 * Parameters to initialize a AnchorDex account.
 *
 * @category Instruction Types
 * @param initSqrtPrice - The desired initial sqrt-price for this pool
 * @param whirlpoolsConfig - The public key for the WhirlpoolsConfig this pool is initialized in
 * @param whirlpoolPda - PDA for the whirlpool account that would be initialized
 * @param tokenMintA - Mint public key for token A
 * @param tokenMintB - Mint public key for token B
 * @param tokenBadgeA - TokenBadge public key for token A
 * @param tokenBadgeB - TokenBadge public key for token B
 * @param tokenProgramA - Token program public key for token A
 * @param tokenProgramB - Token program public key for token B
 * @param tokenVaultAKeypair - Keypair of the token A vault for this pool
 * @param tokenVaultBKeypair - Keypair of the token B vault for this pool
 * @param feeTierKey - PublicKey of the fee-tier account that this pool would use for the fee-rate
 * @param tickSpacing - The desired tick spacing for this pool.
 * @param funder - The account that would fund the creation of this account
 */
export type InitPoolV2Params = {
  initSqrtPrice: BN;
  whirlpoolsConfig: PublicKey;
  whirlpoolPda: PDA;
  tokenMintA: PublicKey;
  tokenMintB: PublicKey;
  tokenBadgeA: PublicKey;
  tokenBadgeB: PublicKey;
  tokenProgramA: PublicKey;
  tokenProgramB: PublicKey;
  tokenVaultAKeypair: PublicKey;
  tokenVaultBKeypair: PublicKey;
  feeTierKey: PublicKey;
  tickSpacing: number;
  funder: PublicKey;
};

/**
 * Initializes a tick_array account to represent a tick-range in a AnchorDex.
 *
 * Special Errors
 * `InvalidTokenMintOrder` - The order of mints have to be ordered by
 * `SqrtPriceOutOfBounds` - provided initial_sqrt_price is not between 2^-64 to 2^64
 *
 * @category Instructions
 * @param context - Context object containing services required to generate the instruction
 * @param params - InitPoolV2Params object
 * @returns - Instruction to perform the action.
 */
export function initializePoolV2Ix(program: Program<AnchorDex>, params: InitPoolV2Params): Instruction {
  const {
    initSqrtPrice,
    tokenMintA,
    tokenMintB,
    tokenBadgeA,
    tokenBadgeB,
    tokenProgramA,
    tokenProgramB,
    whirlpoolsConfig,
    whirlpoolPda,
    feeTierKey,
    tokenVaultAKeypair,
    tokenVaultBKeypair,
    tickSpacing,
    funder,
  } = params;

  const ix = program.instruction.initializePoolV2(tickSpacing, initSqrtPrice, {
    accounts: {
      poolsConfig:whirlpoolsConfig,
      tokenMintA,
      tokenMintB,
      tokenBadgeA,
      tokenBadgeB,
      funder,
      pool: whirlpoolPda.publicKey,
      tokenVaultA: tokenVaultAKeypair,
      tokenVaultB: tokenVaultBKeypair,
      feeTier: feeTierKey,
      systemProgram: SystemProgram.programId,
      tokenProgramA,
      tokenProgramB,
      rent: SYSVAR_RENT_PUBKEY,
    },
  });

  return {
    instructions: [ix],
    cleanupInstructions: [],
    signers: [],
  };
}
