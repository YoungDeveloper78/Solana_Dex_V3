import { Address, AddressUtil } from "@orca-so/common-sdk";
import { Connection } from "@solana/web3.js";
import invariant from "tiny-invariant";
import { AccountName, WHIRLPOOL_CODER, PoolData, getAccountSize } from "../../../types/public";
import { ParsableWhirlpool } from "../parsing";

/**
 * Retrieve a list of whirlpool addresses and accounts filtered by the given params using
 * getProgramAccounts.
 * @category Network
 *
 * @param connection The connection to use to fetch accounts
 * @param programId The AnchorDex program to search AnchorDex accounts for
 * @param configId The {@link WhirlpoolConfig} account program address to filter by
 * @returns tuple of whirlpool addresses and accounts
 */
export async function getAllWhirlpoolAccountsForConfig({
  connection,
  programId,
  configId,
}: {
  connection: Connection;
  programId: Address;
  configId: Address;
}): Promise<ReadonlyMap<string, PoolData>> {
  const filters = [
    { dataSize: getAccountSize(AccountName.AnchorDex) },
    {
      memcmp: WHIRLPOOL_CODER.memcmp(
        AccountName.AnchorDex,
        AddressUtil.toPubKey(configId).toBuffer()
      ),
    },
  ];

  const accounts = await connection.getProgramAccounts(AddressUtil.toPubKey(programId), {
    filters,
  });

  const parsedAccounts: [string, PoolData][] = [];
  accounts.forEach(({ pubkey, account }) => {
    const parsedAccount = ParsableWhirlpool.parse(pubkey, account);
    invariant(!!parsedAccount, `could not parse whirlpool: ${pubkey.toBase58()}`);
    parsedAccounts.push([AddressUtil.toString(pubkey), parsedAccount]);
  });

  return new Map(parsedAccounts.map(([address, pool]) => [AddressUtil.toString(address), pool]));
}
