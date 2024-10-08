import { BorshAccountsCoder, Idl } from "@coral-xyz/anchor";
import { ParsableEntity, staticImplements } from "@orca-so/common-sdk";
import { AccountInfo, PublicKey } from "@solana/web3.js";
import * as WhirlpoolIDL from "../../artifacts/whirlpool.json";
import {
  AccountName,
  FeeTierData,
  PositionBundleData,
  PositionData,
  TickArrayData,
  TokenBadgeData,
  PoolData,
  WhirlpoolsConfigData,
  WhirlpoolsConfigExtensionData,
} from "../../types/public";

/**
 * @category Network
 */
@staticImplements<ParsableEntity<WhirlpoolsConfigData>>()
export class ParsableWhirlpoolsConfig {
  private constructor() {}

  public static parse(
    _address: PublicKey,
    accountData: AccountInfo<Buffer> | undefined | null
  ): WhirlpoolsConfigData | null {
    if (!accountData?.data) {
      return null;
    }

    try {
      return parseAnchorAccount(AccountName.WhirlpoolsConfig, accountData);
    } catch (e) {
      console.error(`error while parsing WhirlpoolsConfig: ${e}`);
      return null;
    }
  }
}

/**
 * @category Network
 */
@staticImplements<ParsableEntity<PoolData>>()
export class ParsableWhirlpool {
  private constructor() {}

  public static parse(
    _address: PublicKey,
    accountData: AccountInfo<Buffer> | undefined | null
  ): PoolData | null {
    if (!accountData?.data) {
      return null;
    }

    try {
      return parseAnchorAccount(AccountName.AnchorDex, accountData);
    } catch (e) {
      console.error(`error while parsing AnchorDex: ${e}`);
      return null;
    }
  }
}

/**
 * @category Network
 */
@staticImplements<ParsableEntity<PositionData>>()
export class ParsablePosition {
  private constructor() {}

  public static parse(
    _address: PublicKey,
    accountData: AccountInfo<Buffer> | undefined | null
  ): PositionData | null {
    if (!accountData?.data) {
      return null;
    }

    try {
      return parseAnchorAccount(AccountName.Position, accountData);
    } catch (e) {
      console.error(`error while parsing Position: ${e}`);
      return null;
    }
  }
}

/**
 * @category Network
 */
@staticImplements<ParsableEntity<TickArrayData>>()
export class ParsableTickArray {
  private constructor() {}

  public static parse(
    _address: PublicKey,
    accountData: AccountInfo<Buffer> | undefined | null
  ): TickArrayData | null {
    if (!accountData?.data) {
      return null;
    }

    try {
      return parseAnchorAccount(AccountName.TickArray, accountData);
    } catch (e) {
      console.error(`error while parsing TickArray: ${e}`);
      return null;
    }
  }
}

/**
 * @category Network
 */
@staticImplements<ParsableEntity<FeeTierData>>()
export class ParsableFeeTier {
  private constructor() {}

  public static parse(
    _address: PublicKey,
    accountData: AccountInfo<Buffer> | undefined | null
  ): FeeTierData | null {
    if (!accountData?.data) {
      return null;
    }

    try {
      return parseAnchorAccount(AccountName.FeeTier, accountData);
    } catch (e) {
      console.error(`error while parsing FeeTier: ${e}`);
      return null;
    }
  }
}

/**
 * @category Network
 */
@staticImplements<ParsableEntity<PositionBundleData>>()
export class ParsablePositionBundle {
  private constructor() {}

  public static parse(
    _address: PublicKey,
    accountData: AccountInfo<Buffer> | undefined | null
  ): PositionBundleData | null {
    if (!accountData?.data) {
      return null;
    }

    try {
      return parseAnchorAccount(AccountName.PositionBundle, accountData);
    } catch (e) {
      console.error(`error while parsing PositionBundle: ${e}`);
      return null;
    }
  }
}

/**
 * @category Network
 */
@staticImplements<ParsableEntity<WhirlpoolsConfigExtensionData>>()
export class ParsableWhirlpoolsConfigExtension {
  private constructor() {}

  public static parse(
    _address: PublicKey,
    accountData: AccountInfo<Buffer> | undefined | null
  ): WhirlpoolsConfigExtensionData | null {
    if (!accountData?.data) {
      return null;
    }

    try {
      return parseAnchorAccount(AccountName.WhirlpoolsConfigExtension, accountData);
    } catch (e) {
      console.error(`error while parsing WhirlpoolsConfigExtension: ${e}`);
      return null;
    }
  }
}

/**
 * @category Network
 */
@staticImplements<ParsableEntity<TokenBadgeData>>()
export class ParsableTokenBadge {
  private constructor() {}

  public static parse(
    _address: PublicKey,
    accountData: AccountInfo<Buffer> | undefined | null
  ): TokenBadgeData | null {
    if (!accountData?.data) {
      return null;
    }

    try {
      return parseAnchorAccount(AccountName.TokenBadge, accountData);
    } catch (e) {
      console.error(`error while parsing TokenBadge: ${e}`);
      return null;
    }
  }
}

const WhirlpoolCoder = new BorshAccountsCoder(WhirlpoolIDL as Idl);

function parseAnchorAccount(accountName: AccountName, accountData: AccountInfo<Buffer>) {
  const data = accountData.data;
  const discriminator = BorshAccountsCoder.accountDiscriminator(accountName);
  if (discriminator.compare(data.slice(0, 8))) {
    console.error("incorrect account name during parsing");
    return null;
  }

  try {
    return WhirlpoolCoder.decode(accountName, data);
  } catch (_e) {
    console.error("unknown account name during parsing");
    return null;
  }
}
