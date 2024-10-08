import { resolveOrCreateATAs, TransactionBuilder, ZERO } from "@orca-so/common-sdk";
import { PublicKey } from "@solana/web3.js";
import {  AnchorDex } from "../../whirlpool-client";
import {  WhirlpoolContext } from "../../context";
import { SwapUtils } from "../../utils/public/swap-utils";
import { TickArrayUtil, } from "../../utils/public/tick-utils";

import { WhirlpoolAccountFetchOptions, } from "../../network/public/fetcher";
import { SwapInput, swapIx } from "../swap-ix";
import { TokenExtensionUtil } from "../../utils/public/token-extension-util";
import { swapV2Ix } from "../v2";


export type SwapAsyncParams = {
  swapInput: SwapInput;
  whirlpool: AnchorDex;
  wallet: PublicKey;
};

/**
 * Swap instruction builder method with resolveATA & additional checks.
 * @param ctx - WhirlpoolContext object for the current environment.
 * @param params - {@link SwapAsyncParams}
 * @param opts - {@link WhirlpoolAccountFetchOptions} to use for account fetching.
 * @returns
 */
export async function swapAsync(
  ctx: WhirlpoolContext,
  params: SwapAsyncParams,
  opts: WhirlpoolAccountFetchOptions
): Promise<TransactionBuilder> {
  const { wallet, whirlpool, swapInput } = params;
  const { aToB, amount } = swapInput;
  const txBuilder = new TransactionBuilder(ctx.connection, ctx.wallet, ctx.txBuilderOpts);
  const tickArrayAddresses = [swapInput.tickArray0, swapInput.tickArray1, swapInput.tickArray2];
  
  const uninitializedArrays = await TickArrayUtil.getUninitializedArraysString(
    tickArrayAddresses,
    ctx.fetcher,
    opts
  );
  

  if (uninitializedArrays) {
    throw new Error(`TickArray addresses - [${uninitializedArrays}] need to be initialized.`);
  }

  const data = whirlpool.getData();
  const [resolvedAtaA, resolvedAtaB] = await resolveOrCreateATAs(
    ctx.connection,
    wallet,
    [
      { tokenMint: data.tokenMintA, wrappedSolAmountIn: aToB ? amount : ZERO },
      { tokenMint: data.tokenMintB, wrappedSolAmountIn: !aToB ? amount : ZERO },
    ],
    () => ctx.fetcher.getAccountRentExempt(),
    undefined, // use default
    true, // use idempotent to allow multiple simultaneous calls
    ctx.accountResolverOpts.allowPDAOwnerAddress,
    ctx.accountResolverOpts.createWrappedSolAccountMethod
  );
  const { address: ataAKey, ...tokenOwnerAccountAIx } = resolvedAtaA;
  const { address: ataBKey, ...tokenOwnerAccountBIx } = resolvedAtaB;
  txBuilder.addInstructions([tokenOwnerAccountAIx, tokenOwnerAccountBIx]);
  const inputTokenAccount = aToB ? ataAKey : ataBKey;
  const outputTokenAccount = aToB ? ataBKey : ataAKey;

  const tokenExtensionCtx = await TokenExtensionUtil.buildTokenExtensionContext(
    ctx.fetcher,
    data,
  );

  const baseParams = SwapUtils.getSwapParamsFromQuote(
    swapInput,
    ctx,
    whirlpool,
    inputTokenAccount,
    outputTokenAccount,
    wallet
  );
  return txBuilder.addInstruction(
    !TokenExtensionUtil.isV2IxRequiredPool(tokenExtensionCtx)
      ? swapIx(ctx.program, baseParams)
      : swapV2Ix(ctx.program, {
        ...baseParams,
        tokenMintA: tokenExtensionCtx.tokenMintWithProgramA.address,
        tokenMintB: tokenExtensionCtx.tokenMintWithProgramB.address,
        tokenProgramA: tokenExtensionCtx.tokenMintWithProgramA.tokenProgram,
        tokenProgramB: tokenExtensionCtx.tokenMintWithProgramB.tokenProgram,
        ...await TokenExtensionUtil.getExtraAccountMetasForTransferHookForPool(
          ctx.connection,
          tokenExtensionCtx,
          baseParams.aToB ? baseParams.tokenOwnerAccountA : baseParams.tokenVaultA,
          baseParams.aToB ? baseParams.tokenVaultA : baseParams.tokenOwnerAccountA,
          baseParams.aToB ? baseParams.tokenAuthority : baseParams.pool,
          baseParams.aToB ? baseParams.tokenVaultB : baseParams.tokenOwnerAccountB,
          baseParams.aToB ? baseParams.tokenOwnerAccountB : baseParams.tokenVaultB,
          baseParams.aToB ? baseParams.pool : baseParams.tokenAuthority,
        ),
      })
  );
}
