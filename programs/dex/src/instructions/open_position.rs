use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

use crate::{events, state};
use crate::{state::*, util::mint_position_token_and_remove_authority};

#[derive(Accounts)]
pub struct OpenPosition<'info> {
    #[account(mut)]
    pub funder: Signer<'info>,

    /// CHECK: safe, the account that will be the owner of the position can be arbitrary
    pub owner: UncheckedAccount<'info>,

    #[account(init,
      payer = funder,
      space = Position::LEN,
      seeds = [b"position".as_ref(), position_mint.key().as_ref()],
      bump,
    )]
    pub position: Box<Account<'info, Position>>,

    #[account(init,
        payer = funder,
        mint::authority = pool,
        mint::decimals = 0,
    )]
    pub position_mint: Account<'info, Mint>,

    #[account(init,
      payer = funder,
      associated_token::mint = position_mint,
      associated_token::authority = owner,
    )]
    pub position_token_account: Box<Account<'info, TokenAccount>>,

    pub pool: Box<Account<'info, Pool>>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

/*
  Opens a new pool Position.
*/
pub fn handler(
    ctx: Context<OpenPosition>,
    // derive(Accounts) generates OpenPositionBumps, so we need to clarify which one we want to use.
    _bumps: state::OpenPositionBumps,
    tick_lower_index: i32,
    tick_upper_index: i32,
) -> Result<()> {
    let pool = &ctx.accounts.pool;
    let position_mint = &ctx.accounts.position_mint;
    let position = &mut ctx.accounts.position;

    position.open_position(
        pool,
        position_mint.key(),
        tick_lower_index,
        tick_upper_index,
    )?;

    mint_position_token_and_remove_authority(
        pool,
        position_mint,
        &ctx.accounts.position_token_account,
        &ctx.accounts.token_program,
    )?;
    emit!(events::OpenPositionEvent {
        pool_state: pool.key(),
        minter: position.position_mint.key(),
        nft_owner: ctx.accounts.owner.key(),
        tick_lower_index: position.tick_lower_index,
        tick_upper_index: position.tick_upper_index,
        liquidity: position.liquidity,
    });
    Ok(())
}
