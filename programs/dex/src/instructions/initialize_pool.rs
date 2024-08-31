use crate::{events, state::*};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token};

#[derive(Accounts)]
// now we don't use bumps, but we must list args in the same order to use tick_spacing arg.
#[instruction(bumps: PoolBumps, tick_spacing: u16)]
pub struct InitializePool<'info> {
    pub pools_config: Box<Account<'info, PoolsConfig>>,

    pub token_mint_a: Box<Account<'info, Mint>>,
    pub token_mint_b: Box<Account<'info, Mint>>,

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
    pub fee_tier: Box<Account<'info, FeeTier>>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializePool>,
    _bumps: PoolBumps,
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

    pool.initialize(
        pools_config,
        bump,
        tick_spacing,
        initial_sqrt_price,
        default_fee_rate,
        token_mint_a,
        ctx.accounts.token_vault_a.key(),
        token_mint_b,
        ctx.accounts.token_vault_b.key(),
    )?;
    emit!(events::PoolCreatedEvent {
        token_mint_0: pool.token_mint_a.key(),
        token_mint_1: pool.token_mint_b.key(),
        tick_spacing: tick_spacing,
        pool_state: pool.key(),
        sqrt_price_x64: initial_sqrt_price,
        tick: pool.tick_current_index,
        token_vault_0: pool.token_vault_a.key(),
        token_vault_1: pool.token_vault_b.key(),
    });
    Ok(())
}
