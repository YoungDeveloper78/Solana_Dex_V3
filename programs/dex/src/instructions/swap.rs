use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

use crate::{
    errors::ErrorCode,
    events,
    manager::swap_manager::*,
    state::{Pool, TickArray},
    util::{to_timestamp_u64, update_and_swap_pool, SwapTickSequence},
};

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    pub token_authority: Signer<'info>,

    #[account(mut)]
    pub pool: Box<Account<'info, Pool>>,

    #[account(mut, constraint = token_owner_account_a.mint == pool.token_mint_a)]
    pub token_owner_account_a: Box<Account<'info, TokenAccount>>,
    #[account(mut, address = pool.token_vault_a)]
    pub token_vault_a: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint = token_owner_account_b.mint == pool.token_mint_b)]
    pub token_owner_account_b: Box<Account<'info, TokenAccount>>,
    #[account(mut, address = pool.token_vault_b)]
    pub token_vault_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, has_one = pool)]
    pub tick_array_0: AccountLoader<'info, TickArray>,

    #[account(mut, has_one = pool)]
    pub tick_array_1: AccountLoader<'info, TickArray>,

    #[account(mut, has_one = pool)]
    pub tick_array_2: AccountLoader<'info, TickArray>,
}

pub fn handler(
    ctx: Context<Swap>,
    amount: u64,
    other_amount_threshold: u64,
    sqrt_price_limit: u128,
    amount_specified_is_input: bool,
    a_to_b: bool, // Zero for one
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let clock = Clock::get()?;
    // Update the global reward growth which increases as a function of time.
    let timestamp = to_timestamp_u64(clock.unix_timestamp)?;
    let mut swap_tick_sequence = SwapTickSequence::new(
        ctx.accounts.tick_array_0.load_mut()?,
        ctx.accounts.tick_array_1.load_mut().ok(),
        ctx.accounts.tick_array_2.load_mut().ok(),
    );

    let swap_update = swap(
        &pool,
        &mut swap_tick_sequence,
        amount,
        sqrt_price_limit,
        amount_specified_is_input,
        a_to_b,
        timestamp,
    )?;

    if amount_specified_is_input {
        if (a_to_b && other_amount_threshold > swap_update.amount_b)
            || (!a_to_b && other_amount_threshold > swap_update.amount_a)
        {
            return Err(ErrorCode::AmountOutBelowMinimum.into());
        }
    } else {
        if (a_to_b && other_amount_threshold < swap_update.amount_a)
            || (!a_to_b && other_amount_threshold < swap_update.amount_b)
        {
            return Err(ErrorCode::AmountInAboveMaximum.into());
        }
    }

    update_and_swap_pool(
        pool,
        &ctx.accounts.token_authority,
        &ctx.accounts.token_owner_account_a,
        &ctx.accounts.token_owner_account_b,
        &ctx.accounts.token_vault_a,
        &ctx.accounts.token_vault_b,
        &ctx.accounts.token_program,
        &swap_update,
        a_to_b,
        timestamp,
    )?;
    let amount_a = swap_update.amount_a;
    let amount_b = swap_update.amount_b;
    emit!(events::SwapEvent {
        pool_state: pool.key(),
        sender: ctx.accounts.token_authority.key(),
        token_account_0: pool.token_vault_a,
        token_account_1: pool.token_vault_b,
        amount_0: amount_a.to_owned(),
        amount_1: amount_b.to_owned(),
        zero_for_one: a_to_b,
        sqrt_price_x64: pool.sqrt_price,
        liquidity: pool.liquidity,
        tick: pool.tick_current_index,
        fee: swap_update.fee
    });

    Ok(())
}
