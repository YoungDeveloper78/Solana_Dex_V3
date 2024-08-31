use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface};

use crate::{
    errors::ErrorCode,
    state::*,
    util::{is_token_badge_initialized, v2::is_supported_token_mint},
};

#[derive(Accounts)]
#[instruction(tick_spacing: u16)]
pub struct InitializePoolV2<'info> {
    pub pools_config: Box<Account<'info, PoolsConfig>>,

    pub token_mint_a: InterfaceAccount<'info, Mint>,
    pub token_mint_b: InterfaceAccount<'info, Mint>,

    #[account(seeds = [b"token_badge", pools_config.key().as_ref(), token_mint_a.key().as_ref()], bump)]
    /// CHECK: checked in the handler
    pub token_badge_a: UncheckedAccount<'info>,
    #[account(seeds = [b"token_badge", pools_config.key().as_ref(), token_mint_b.key().as_ref()], bump)]
    /// CHECK: checked in the handler
    pub token_badge_b: UncheckedAccount<'info>,

    #[account(mut)]
    pub funder: Signer<'info>,

    #[account(init,
      seeds = [
        b"pool".as_ref(),
        pools_config.key().as_ref(),
        token_mint_a.key().as_ref(),
        token_mint_b.key().as_ref(),
        tick_spacing.to_le_bytes().as_ref()
      ],
      bump,
      payer = funder,
      space = Pool::LEN)]
    pub pool: Box<Account<'info, Pool>>,
    /// CHECK:safe with seeds
    #[account(mut,seeds =[
            b"pool_vault",
            pool.key().as_ref(),
            token_mint_a.key().as_ref(),
        ],
        bump)]
    pub token_vault_a: AccountInfo<'info>,
    /// CHECK:safe with seeds
    #[account(mut,seeds =[
            b"pool_vault",
            pool.key().as_ref(),
            token_mint_b.key().as_ref(),
        ],
        bump)]
    pub token_vault_b: AccountInfo<'info>,
    #[account(has_one = pools_config, constraint = fee_tier.tick_spacing == tick_spacing)]
    pub fee_tier: Account<'info, FeeTier>,

    #[account(address = token_mint_a.to_account_info().owner.clone())]
    pub token_program_a: Interface<'info, TokenInterface>,
    #[account(address = token_mint_b.to_account_info().owner.clone())]
    pub token_program_b: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializePoolV2>,
    tick_spacing: u16,
    initial_sqrt_price: u128,
) -> Result<()> {
    let token_mint_a = ctx.accounts.token_mint_a.key();
    let token_mint_b = ctx.accounts.token_mint_b.key();

    let pool = &mut ctx.accounts.pool;
    let pools_config = &ctx.accounts.pools_config;

    let default_fee_rate = ctx.accounts.fee_tier.default_fee_rate;

    // ignore the bump passed and use one Anchor derived
    let bump = ctx.bumps.pool;

    // Don't allow creating a pool with unsupported token mints
    let is_token_badge_initialized_a = is_token_badge_initialized(
        pools_config.key(),
        token_mint_a,
        &ctx.accounts.token_badge_a,
    )?;

    if !is_supported_token_mint(&ctx.accounts.token_mint_a, is_token_badge_initialized_a)? {
        return Err(ErrorCode::UnsupportedTokenMint.into());
    }

    let is_token_badge_initialized_b = is_token_badge_initialized(
        pools_config.key(),
        token_mint_b,
        &ctx.accounts.token_badge_b,
    )?;

    if !is_supported_token_mint(&ctx.accounts.token_mint_b, is_token_badge_initialized_b)? {
        return Err(ErrorCode::UnsupportedTokenMint.into());
    }

    Ok(pool.initialize(
        pools_config,
        bump,
        tick_spacing,
        initial_sqrt_price,
        default_fee_rate,
        token_mint_a,
        ctx.accounts.token_vault_a.key(),
        token_mint_b,
        ctx.accounts.token_vault_b.key(),
    )?)
}
