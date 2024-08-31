import { BN, BorshAccountsCoder, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import WhirlpoolIDL from "../../artifacts/whirlpool.json";

/**
 * This file contains the types that has the same structure as the types anchor functions returns.
 * These types are hard-casted by the client function.
 *
 * This file must be manually updated every time the idl updates as accounts will
 * be hard-casted to fit the type.
 */

/**
 * Supported parasable account names from the AnchorDex contract.
 * @category Network
 */
export enum AccountName {
  WhirlpoolsConfig = "PoolsConfig",
  Position = "Position",
  TickArray = "TickArray",
  AnchorDex = "Pool",
  FeeTier = "FeeTier",
  PositionBundle = "PositionBundle",
  WhirlpoolsConfigExtension = "PoolsConfigExtension",
  TokenBadge = "TokenBadge",
}

export const WHIRLPOOL_IDL = WhirlpoolIDL as Idl;

/**
 * The Anchor coder for the AnchorDex program.
 * @category Solana Accounts
 */
export const WHIRLPOOL_CODER = new BorshAccountsCoder(WHIRLPOOL_IDL);

/**
 * Get the size of an account owned by the AnchorDex program in bytes.
 * @param accountName AnchorDex account name
 * @returns Size in bytes of the account
 */
export function getAccountSize(accountName: AccountName) {
  const size = WHIRLPOOL_CODER.size(
    WHIRLPOOL_IDL.accounts!.find((account) => account.name === accountName)!
  );
  return size + RESERVED_BYTES[accountName];
}

/**
 * Reserved bytes for each account used for calculating the account size.
 */
const RESERVED_BYTES: ReservedBytes = {
  [AccountName.WhirlpoolsConfig]: 2,
  [AccountName.Position]: 0,
  [AccountName.TickArray]: 0,
  [AccountName.AnchorDex]: 0,
  [AccountName.FeeTier]: 0,
  [AccountName.PositionBundle]: 64,
  [AccountName.WhirlpoolsConfigExtension]: 512,
  [AccountName.TokenBadge]: 128,
};

type ReservedBytes = {
  [name in AccountName]: number;
};

/**
 * Size of the AnchorDex account in bytes.
 * @deprecated Please use {@link getAccountSize} instead.
 * @category Solana Accounts
 */
export const WHIRLPOOL_ACCOUNT_SIZE = getAccountSize(AccountName.AnchorDex);

/**
 * @category Solana Accounts
 */
export type WhirlpoolsConfigData = {
  feeAuthority: PublicKey;
  collectProtocolFeesAuthority: PublicKey;
  rewardEmissionsSuperAuthority: PublicKey;
  defaultFeeRate: number;
  defaultProtocolFeeRate: number;
};

/**
 * @category Solana Accounts
 */
export type WhirlpoolRewardInfoData = {
  mint: PublicKey;
  vault: PublicKey;
  authority: PublicKey;
  emissionsPerSecondX64: BN;
  growthGlobalX64: BN;
};

/**
 * @category Solana Accounts
 */
export type PoolBumpsData = {
  whirlpoolBump: number;
};

/**
 * @category Solana Accounts
 */
export type PoolData = {
  whirlpoolsConfig: PublicKey;
  whirlpoolBump: number[];
  feeRate: number;
  protocolFeeRate: number;
  liquidity: BN;
  sqrtPrice: BN;
  tickCurrentIndex: number;
  protocolFeeOwedA: BN;
  protocolFeeOwedB: BN;
  tokenMintA: PublicKey;
  tokenVaultA: PublicKey;
  feeGrowthGlobalA: BN;
  tokenMintB: PublicKey;
  tokenVaultB: PublicKey;
  feeGrowthGlobalB: BN;
  rewardLastUpdatedTimestamp: BN;
  rewardInfos: WhirlpoolRewardInfoData[];
  tickSpacing: number;
};

/**
 * @category Solana Accounts
 */
export type TickArrayData = {
  whirlpool: PublicKey;
  startTickIndex: number;
  ticks: TickData[];
};

/**
 * @category Solana Accounts
 */
export type TickData = {
  initialized: boolean;
  liquidityNet: BN;
  liquidityGross: BN;
  feeGrowthOutsideA: BN;
  feeGrowthOutsideB: BN;
  rewardGrowthsOutside: BN[];
};

/**
 * @category Solana Accounts
 */
export type PositionRewardInfoData = {
  growthInsideCheckpoint: BN;
  amountOwed: BN;
};

/**
 * @category Solana Accounts
 */
export type OpenPositionBumpsData = {
  positionBump: number;
};

/**
 * @category Solana Accounts
 */
export type OpenPositionWithMetadataBumpsData = {
  positionBump: number;
  metadataBump: number;
};

/**
 * @category Solana Accounts
 */
export type PositionData = {
  pool: PublicKey;
  positionMint: PublicKey;
  liquidity: BN;
  tickLowerIndex: number;
  tickUpperIndex: number;
  feeGrowthCheckpointA: BN;
  feeOwedA: BN;
  feeGrowthCheckpointB: BN;
  feeOwedB: BN;
  rewardInfos: PositionRewardInfoData[];
};

/**
 * @category Solana Accounts
 */
export type FeeTierData = {
  whirlpoolsConfig: PublicKey;
  tickSpacing: number;
  defaultFeeRate: number;
};

/**
 * @category Solana Accounts
 */
export type PositionBundleData = {
  positionBundleMint: PublicKey;
  positionBitmap: number[];
};

/**
 * @category Solana Accounts
 */
export type WhirlpoolsConfigExtensionData = {
  whirlpoolsConfig: PublicKey;
  configExtensionAuthority: PublicKey;
  tokenBadgeAuthority: PublicKey;
}

/**
 * @category Solana Accounts
 */
export type TokenBadgeData = {
  whirlpoolsConfig: PublicKey;
  tokenMint: PublicKey;
}
