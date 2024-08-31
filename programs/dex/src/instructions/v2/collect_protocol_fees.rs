use crate::util::{parse_remaining_accounts, AccountsType, RemainingAccountsInfo};
use crate::{constants::transfer_memo, state::*, util::v2::transfer_from_vault_to_owner_v2};
use anchor_lang::prelude::*;
use anchor_spl::memo::Memo;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

#[derive(Accounts)]
pub struct CollectProtocolFeesV2<'info> {
    pub pools_config: Box<Account<'info, PoolsConfig>>,

    #[account(mut, has_one = pools_config)]
    pub pool: Box<Account<'info, Pool>>,

    #[account(address = pools_config.collect_protocol_fees_authority)]
    pub collect_protocol_fees_authority: Signer<'info>,

    #[account(address = pool.token_mint_a)]
    pub token_mint_a: InterfaceAccount<'info, Mint>,
    #[account(address = pool.token_mint_b)]
    pub token_mint_b: InterfaceAccount<'info, Mint>,

    #[account(mut, address = pool.token_vault_a)]
    pub token_vault_a: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, address = pool.token_vault_b)]
    pub token_vault_b: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, constraint = token_destination_a.mint == pool.token_mint_a)]
    pub token_destination_a: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, constraint = token_destination_b.mint == pool.token_mint_b)]
    pub token_destination_b: InterfaceAccount<'info, TokenAccount>,

    #[account(address = token_mint_a.to_account_info().owner.clone())]
    pub token_program_a: Interface<'info, TokenInterface>,
    #[account(address = token_mint_b.to_account_info().owner.clone())]
    pub token_program_b: Interface<'info, TokenInterface>,
    pub memo_program: Program<'info, Memo>,
    // remaining accounts
    // - accounts for transfer hook program of token_mint_a
    // - accounts for transfer hook program of token_mint_b
}

pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, CollectProtocolFeesV2<'info>>,
    remaining_accounts_info: Option<RemainingAccountsInfo>,
) -> Result<()> {
    let pool = &ctx.accounts.pool;

    // Process remaining accounts
    let remaining_accounts = parse_remaining_accounts(
        &ctx.remaining_accounts,
        &remaining_accounts_info,
        &[AccountsType::TransferHookA, AccountsType::TransferHookB],
    )?;

    transfer_from_vault_to_owner_v2(
        pool,
        &ctx.accounts.token_mint_a,
        &ctx.accounts.token_vault_a,
        &ctx.accounts.token_destination_a,
        &ctx.accounts.token_program_a,
        &ctx.accounts.memo_program,
        &remaining_accounts.transfer_hook_a,
        pool.protocol_fee_owed_a,
        transfer_memo::TRANSFER_MEMO_COLLECT_PROTOCOL_FEES.as_bytes(),
    )?;

    transfer_from_vault_to_owner_v2(
        pool,
        &ctx.accounts.token_mint_b,
        &ctx.accounts.token_vault_b,
        &ctx.accounts.token_destination_b,
        &ctx.accounts.token_program_b,
        &ctx.accounts.memo_program,
        &remaining_accounts.transfer_hook_b,
        pool.protocol_fee_owed_b,
        transfer_memo::TRANSFER_MEMO_COLLECT_PROTOCOL_FEES.as_bytes(),
    )?;

    Ok(ctx.accounts.pool.reset_protocol_fees_owed())
}
