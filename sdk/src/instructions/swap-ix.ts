import { Program } from "@coral-xyz/anchor";
import { Instruction } from "@orca-so/common-sdk";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { AnchorDex } from "../artifacts/whirlpool";

/**
 * Raw parameters and accounts to swap on a AnchorDex
 *
 * @category Instruction Types
 * @param swapInput - Parameters in {@link SwapInput}
 * @param whirlpool - PublicKey for the whirlpool that the swap will occur on
 * @param tokenOwnerAccountA - PublicKey for the associated token account for tokenA in the collection wallet
 * @param tokenOwnerAccountB - PublicKey for the associated token account for tokenB in the collection wallet
 * @param tokenVaultA - PublicKey for the tokenA vault for this whirlpool.
 * @param tokenVaultB - PublicKey for the tokenB vault for this whirlpool.
 * @param oracle - PublicKey for the oracle account for this AnchorDex.
 * @param tokenAuthority - authority to withdraw tokens from the input token account
 */
export type SwapParams = SwapInput & {
  pool: PublicKey;
  tokenOwnerAccountA: PublicKey;
  tokenOwnerAccountB: PublicKey;
  tokenVaultA: PublicKey;
  tokenVaultB: PublicKey;
  tokenAuthority: PublicKey;
};

/**
 * Parameters that describe the nature of a swap on a AnchorDex.
 *
 * @category Instruction Types
 * @param aToB - The direction of the swap. True if swapping from A to B. False if swapping from B to A.
 * @param amountSpecifiedIsInput - Specifies the token the parameter `amount`represents. If true, the amount represents
 *                                 the input token of the swap.
 * @param amount - The amount of input or output token to swap from (depending on amountSpecifiedIsInput).
 * @param otherAmountThreshold - The maximum/minimum of input/output token to swap into (depending on amountSpecifiedIsInput).
 * @param sqrtPriceLimit - The maximum/minimum price the swap will swap to.
 * @param tickArray0 - PublicKey of the tick-array where the AnchorDex's currentTickIndex resides in
 * @param tickArray1 - The next tick-array in the swap direction. If the swap will not reach the next tick-aray, input the same array as tickArray0.
 * @param tickArray2 - The next tick-array in the swap direction after tickArray2. If the swap will not reach the next tick-aray, input the same array as tickArray1.
 */
export type SwapInput = {
  amount: BN;
  otherAmountThreshold: BN;
  sqrtPriceLimit: BN;
  amountSpecifiedIsInput: boolean;
  aToB: boolean;
  tickArray0: PublicKey;
  tickArray1: PublicKey;
  tickArray2: PublicKey;
};

/**
 * Parameters to swap on a AnchorDex with developer fees
 *
 * @category Instruction Types
 * @param swapInput - Parameters in {@link SwapInput}
 * @param devFeeAmount -  FeeAmount (developer fees) charged on this swap
 */
export type DevFeeSwapInput = SwapInput & {
  devFeeAmount: BN;
};

/**
 * Perform a swap in this AnchorDex
 *
 * #### Special Errors
 * - `ZeroTradableAmount` - User provided parameter `amount` is 0.
 * - `InvalidSqrtPriceLimitDirection` - User provided parameter `sqrt_price_limit` does not match the direction of the trade.
 * - `SqrtPriceOutOfBounds` - User provided parameter `sqrt_price_limit` is over Whirlppool's max/min bounds for sqrt-price.
 * - `InvalidTickArraySequence` - User provided tick-arrays are not in sequential order required to proceed in this trade direction.
 * - `TickArraySequenceInvalidIndex` - The swap loop attempted to access an invalid array index during the query of the next initialized tick.
 * - `TickArrayIndexOutofBounds` - The swap loop attempted to access an invalid array index during tick crossing.
 * - `LiquidityOverflow` - Liquidity value overflowed 128bits during tick crossing.
 * - `InvalidTickSpacing` - The swap pool was initialized with tick-spacing of 0.
 *
 * ### Parameters
 * @category Instructions
 * @param context - Context object containing services required to generate the instruction
 * @param params - {@link SwapParams}
 * @returns - Instruction to perform the action.
 */
export function swapIx(program: Program<AnchorDex>, params: SwapParams): Instruction {
  const {
    amount,
    otherAmountThreshold,
    sqrtPriceLimit,
    amountSpecifiedIsInput,
    aToB,
    pool,
    tokenAuthority,
    tokenOwnerAccountA,
    tokenVaultA,
    tokenOwnerAccountB,
    tokenVaultB,
    tickArray0,
    tickArray1,
    tickArray2,
    
  } = params;

  const ix = program.instruction.swap(
    amount,
    otherAmountThreshold,
    sqrtPriceLimit,
    amountSpecifiedIsInput,
    aToB,
    {
      accounts: {
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenAuthority: tokenAuthority,
        pool,
        tokenOwnerAccountA,
        tokenVaultA,
        tokenOwnerAccountB,
        tokenVaultB,
        tickArray0,
        tickArray1,
        tickArray2,
        
      },
    }
  );

  return {
    instructions: [ix],
    cleanupInstructions: [],
    signers: [],
  };
}
