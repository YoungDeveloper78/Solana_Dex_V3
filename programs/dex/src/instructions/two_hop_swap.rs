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
pub struct TwoHopSwap<'info> {
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    pub token_authority: Signer<'info>,

    #[account(mut)]
    pub pool_one: Box<Account<'info, Pool>>,

    #[account(mut)]
    pub pool_two: Box<Account<'info, Pool>>,

    #[account(mut, constraint = token_owner_account_one_a.mint == pool_one.token_mint_a)]
    pub token_owner_account_one_a: Box<Account<'info, TokenAccount>>,
    #[account(mut, address = pool_one.token_vault_a)]
    pub token_vault_one_a: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint = token_owner_account_one_b.mint == pool_one.token_mint_b)]
    pub token_owner_account_one_b: Box<Account<'info, TokenAccount>>,
    #[account(mut, address = pool_one.token_vault_b)]
    pub token_vault_one_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint = token_owner_account_two_a.mint == pool_two.token_mint_a)]
    pub token_owner_account_two_a: Box<Account<'info, TokenAccount>>,
    #[account(mut, address = pool_two.token_vault_a)]
    pub token_vault_two_a: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint = token_owner_account_two_b.mint == pool_two.token_mint_b)]
    pub token_owner_account_two_b: Box<Account<'info, TokenAccount>>,
    #[account(mut, address = pool_two.token_vault_b)]
    pub token_vault_two_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint = tick_array_one_0.load()?.pool == pool_one.key())]
    pub tick_array_one_0: AccountLoader<'info, TickArray>,

    #[account(mut, constraint = tick_array_one_1.load()?.pool == pool_one.key())]
    pub tick_array_one_1: AccountLoader<'info, TickArray>,

    #[account(mut, constraint = tick_array_one_2.load()?.pool == pool_one.key())]
    pub tick_array_one_2: AccountLoader<'info, TickArray>,

    #[account(mut, constraint = tick_array_two_0.load()?.pool == pool_two.key())]
    pub tick_array_two_0: AccountLoader<'info, TickArray>,

    #[account(mut, constraint = tick_array_two_1.load()?.pool == pool_two.key())]
    pub tick_array_two_1: AccountLoader<'info, TickArray>,

    #[account(mut, constraint = tick_array_two_2.load()?.pool == pool_two.key())]
    pub tick_array_two_2: AccountLoader<'info, TickArray>,
}

pub fn handler(
    ctx: Context<TwoHopSwap>,
    amount: u64,
    other_amount_threshold: u64,
    amount_specified_is_input: bool,
    a_to_b_one: bool,
    a_to_b_two: bool,
    sqrt_price_limit_one: u128,
    sqrt_price_limit_two: u128,
) -> Result<()> {
    let clock = Clock::get()?;
    // Update the global reward growth which increases as a function of time.
    let timestamp = to_timestamp_u64(clock.unix_timestamp)?;

    let pool_one = &mut ctx.accounts.pool_one;
    let pool_two = &mut ctx.accounts.pool_two;

    // Don't allow swaps on the same pool
    if pool_one.key() == pool_two.key() {
        return Err(ErrorCode::DuplicateTwoHopPool.into());
    }

    let swap_one_output_mint = if a_to_b_one {
        pool_one.token_mint_b
    } else {
        pool_one.token_mint_a
    };

    let swap_two_input_mint = if a_to_b_two {
        pool_two.token_mint_a
    } else {
        pool_two.token_mint_b
    };
    if swap_one_output_mint != swap_two_input_mint {
        return Err(ErrorCode::InvalidIntermediaryMint.into());
    }

    let mut swap_tick_sequence_one = SwapTickSequence::new(
        ctx.accounts.tick_array_one_0.load_mut()?,
        ctx.accounts.tick_array_one_1.load_mut().ok(),
        ctx.accounts.tick_array_one_2.load_mut().ok(),
    );

    let mut swap_tick_sequence_two = SwapTickSequence::new(
        ctx.accounts.tick_array_two_0.load_mut()?,
        ctx.accounts.tick_array_two_1.load_mut().ok(),
        ctx.accounts.tick_array_two_2.load_mut().ok(),
    );

    // TODO: WLOG, we could extend this to N-swaps, but the account inputs to the instruction would
    // need to be jankier and we may need to programatically map/verify rather than using anchor constraints
    let (swap_update_one, swap_update_two) = if amount_specified_is_input {
        // If the amount specified is input, this means we are doing exact-in
        // and the swap calculations occur from Swap 1 => Swap 2
        // and the swaps occur from Swap 1 => Swap 2
        let swap_calc_one = swap(
            &pool_one,
            &mut swap_tick_sequence_one,
            amount,
            sqrt_price_limit_one,
            amount_specified_is_input, // true
            a_to_b_one,
            timestamp,
        )?;

        // Swap two input is the output of swap one
        let swap_two_input_amount = if a_to_b_one {
            swap_calc_one.amount_b
        } else {
            swap_calc_one.amount_a
        };

        let swap_calc_two = swap(
            &pool_two,
            &mut swap_tick_sequence_two,
            swap_two_input_amount,
            sqrt_price_limit_two,
            amount_specified_is_input, // true
            a_to_b_two,
            timestamp,
        )?;
        (swap_calc_one, swap_calc_two)
    } else {
        // If the amount specified is output, this means we need to invert the ordering of the calculations
        // and the swap calculations occur from Swap 2 => Swap 1
        // but the actual swaps occur from Swap 1 => Swap 2 (to ensure that the intermediate token exists in the account)
        let swap_calc_two = swap(
            &pool_two,
            &mut swap_tick_sequence_two,
            amount,
            sqrt_price_limit_two,
            amount_specified_is_input, // false
            a_to_b_two,
            timestamp,
        )?;

        // The output of swap 1 is input of swap_calc_two
        let swap_one_output_amount = if a_to_b_two {
            swap_calc_two.amount_a
        } else {
            swap_calc_two.amount_b
        };

        let swap_calc_one = swap(
            &pool_one,
            &mut swap_tick_sequence_one,
            swap_one_output_amount,
            sqrt_price_limit_one,
            amount_specified_is_input, // false
            a_to_b_one,
            timestamp,
        )?;
        (swap_calc_one, swap_calc_two)
    };

    if amount_specified_is_input {
        // If amount_specified_is_input == true, then we have a variable amount of output
        // The slippage we care about is the output of the second swap.
        let output_amount = if a_to_b_two {
            swap_update_two.amount_b
        } else {
            swap_update_two.amount_a
        };

        // If we have received less than the minimum out, throw an error
        if other_amount_threshold > output_amount {
            return Err(ErrorCode::AmountOutBelowMinimum.into());
        }
    } else {
        // amount_specified_is_output == false, then we have a variable amount of input
        // The slippage we care about is the input of the first swap
        let input_amount = if a_to_b_one {
            swap_update_one.amount_a
        } else {
            swap_update_one.amount_b
        };
        if other_amount_threshold < input_amount {
            return Err(ErrorCode::AmountInAboveMaximum.into());
        }
    }

    update_and_swap_pool(
        pool_one,
        &ctx.accounts.token_authority,
        &ctx.accounts.token_owner_account_one_a,
        &ctx.accounts.token_owner_account_one_b,
        &ctx.accounts.token_vault_one_a,
        &ctx.accounts.token_vault_one_b,
        &ctx.accounts.token_program,
        &swap_update_one,
        a_to_b_one,
        timestamp,
    )?;
    let amount_a_one = swap_update_one.amount_a;
    let amount_b_one = swap_update_one.amount_b;
    emit!(events::SwapEvent {
        pool_state: pool_one.key(),
        sender: ctx.accounts.token_authority.key(),
        token_account_0: pool_one.token_vault_a,
        token_account_1: pool_one.token_vault_b,
        amount_0: amount_a_one.to_owned(),
        amount_1: amount_b_one.to_owned(),
        zero_for_one: a_to_b_one,
        sqrt_price_x64: pool_one.sqrt_price,
        liquidity: pool_one.liquidity,
        tick: pool_one.tick_current_index,
        fee: swap_update_one.fee
    });

    update_and_swap_pool(
        pool_two,
        &ctx.accounts.token_authority,
        &ctx.accounts.token_owner_account_two_a,
        &ctx.accounts.token_owner_account_two_b,
        &ctx.accounts.token_vault_two_a,
        &ctx.accounts.token_vault_two_b,
        &ctx.accounts.token_program,
        &swap_update_two,
        a_to_b_two,
        timestamp,
    )?;
    let amount_a_two = swap_update_two.amount_a;
    let amount_b_two = swap_update_two.amount_b;
    emit!(events::SwapEvent {
        pool_state: pool_two.key(),
        sender: ctx.accounts.token_authority.key(),
        token_account_0: pool_two.token_vault_a,
        token_account_1: pool_two.token_vault_b,
        amount_0: amount_a_two.to_owned(),
        amount_1: amount_b_two.to_owned(),
        zero_for_one: a_to_b_two,
        sqrt_price_x64: pool_two.sqrt_price,
        liquidity: pool_two.liquidity,
        tick: pool_two.tick_current_index,
        fee: swap_update_two.fee
    });
    Ok(())
}
