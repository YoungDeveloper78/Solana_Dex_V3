use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

#[derive(Accounts)]
// now we don't use bumps, but we must list args in the same order to use tick_spacing arg.
#[instruction(bumps: PoolBumps, tick_spacing: u16)]
pub struct InitializePoolTokens<'info> {
    ///CHECK:just config address
    pub pools_config: AccountInfo<'info>,

    pub token_mint_a: Box<Account<'info, Mint>>,
    pub token_mint_b: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub funder: Signer<'info>,
    /// CHECK:safe with seeds
    #[account(mut,
      seeds = [
        b"pool".as_ref(),
        pools_config.key().as_ref(),
        token_mint_a.key().as_ref(),
        token_mint_b.key().as_ref(),
        tick_spacing.to_le_bytes().as_ref()
      ],
      bump)]
    pub pool: AccountInfo<'info>,
    #[account(init,
      payer = funder,
      seeds =[
            b"pool_vault",
            pool.key().as_ref(),
            token_mint_a.key().as_ref(),
        ],
        bump,
      token::mint = token_mint_a,
      token::authority = pool)]
    pub token_vault_a: Box<Account<'info, TokenAccount>>,

    #[account(init,
      payer = funder,
      seeds =[
            b"pool_vault",
            pool.key().as_ref(),
            token_mint_b.key().as_ref(),
        ],
        bump,
      token::mint = token_mint_b,
      token::authority = pool)]
    pub token_vault_b: Box<Account<'info, TokenAccount>>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializePoolTokens>,
    _bumps: PoolBumps,
    tick_spacing: u16,
) -> Result<()> {
    Ok(())
}
