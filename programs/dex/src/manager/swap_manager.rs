use solana_program::msg;

use crate::{
    errors::ErrorCode,
    manager::{pool_manager::next_pool_reward_infos, tick_manager::next_tick_cross_update},
    math::*,
    state::*,
    util::SwapTickSequence,
};
use anchor_lang::prelude::*;
use std::convert::TryInto;

#[derive(Debug)]
pub struct PostSwapUpdate {
    pub amount_a: u64,
    pub amount_b: u64,
    pub next_liquidity: u128,
    pub next_tick_index: i32,
    pub next_sqrt_price: u128,
    pub next_fee_growth_global: u128,
    pub next_reward_infos: [PoolRewardInfo; NUM_REWARDS],
    pub next_protocol_fee: u64,
    pub fee: u64,
}

pub fn swap(
    pool: &Pool,
    swap_tick_sequence: &mut SwapTickSequence,
    amount: u64,
    sqrt_price_limit: u128,
    amount_specified_is_input: bool,
    a_to_b: bool,
    timestamp: u64,
) -> Result<PostSwapUpdate> {
    if sqrt_price_limit < MIN_SQRT_PRICE_X64 || sqrt_price_limit > MAX_SQRT_PRICE_X64 {
        return Err(ErrorCode::SqrtPriceOutOfBounds.into());
    }

    if a_to_b && sqrt_price_limit > pool.sqrt_price || !a_to_b && sqrt_price_limit < pool.sqrt_price
    {
        return Err(ErrorCode::InvalidSqrtPriceLimitDirection.into());
    }

    if amount == 0 {
        return Err(ErrorCode::ZeroTradableAmount.into());
    }

    let tick_spacing = pool.tick_spacing;
    let fee_rate = pool.fee_rate;
    let protocol_fee_rate = pool.protocol_fee_rate;
    let next_reward_infos = next_pool_reward_infos(pool, timestamp)?;

    let mut amount_remaining: u64 = amount;
    let mut amount_calculated: u64 = 0;
    let mut curr_sqrt_price = pool.sqrt_price;
    let mut curr_tick_index = pool.tick_current_index;
    let mut curr_liquidity = pool.liquidity;
    let mut fee: u64 = 0;
    let mut curr_protocol_fee: u64 = 0;
    let mut curr_array_index: usize = 0;
    let mut curr_fee_growth_global_input = if a_to_b {
        pool.fee_growth_global_a
    } else {
        pool.fee_growth_global_b
    };

    while amount_remaining > 0 && sqrt_price_limit != curr_sqrt_price {
        let (next_array_index, next_tick_index) = swap_tick_sequence
            .get_next_initialized_tick_index(
                curr_tick_index,
                tick_spacing,
                a_to_b,
                curr_array_index,
            )?;

        let (next_tick_sqrt_price, sqrt_price_target) =
            get_next_sqrt_prices(next_tick_index, sqrt_price_limit, a_to_b);

        let swap_computation = compute_swap(
            amount_remaining,
            fee_rate,
            curr_liquidity,
            curr_sqrt_price,
            sqrt_price_target,
            amount_specified_is_input,
            a_to_b,
        )?;

        if amount_specified_is_input {
            amount_remaining = amount_remaining
                .checked_sub(swap_computation.amount_in)
                .ok_or(ErrorCode::AmountRemainingOverflow)?;
            amount_remaining = amount_remaining
                .checked_sub(swap_computation.fee_amount)
                .ok_or(ErrorCode::AmountRemainingOverflow)?;

            amount_calculated = amount_calculated
                .checked_add(swap_computation.amount_out)
                .ok_or(ErrorCode::AmountCalcOverflow)?;
        } else {
            amount_remaining = amount_remaining
                .checked_sub(swap_computation.amount_out)
                .ok_or(ErrorCode::AmountRemainingOverflow)?;

            amount_calculated = amount_calculated
                .checked_add(swap_computation.amount_in)
                .ok_or(ErrorCode::AmountCalcOverflow)?;
            amount_calculated = amount_calculated
                .checked_add(swap_computation.fee_amount)
                .ok_or(ErrorCode::AmountCalcOverflow)?;
        }

        let (next_protocol_fee, next_fee_growth_global_input) = calculate_fees(
            swap_computation.fee_amount,
            protocol_fee_rate,
            curr_liquidity,
            curr_protocol_fee,
            curr_fee_growth_global_input,
        )?;
        curr_protocol_fee = next_protocol_fee;
        curr_fee_growth_global_input = next_fee_growth_global_input;

        if swap_computation.next_price == next_tick_sqrt_price {
            let (next_tick, next_tick_initialized) = swap_tick_sequence
                .get_tick(next_array_index, next_tick_index, tick_spacing)
                .map_or_else(|_| (None, false), |tick| (Some(tick), tick.initialized));

            if next_tick_initialized {
                let (fee_growth_global_a, fee_growth_global_b) = if a_to_b {
                    (curr_fee_growth_global_input, pool.fee_growth_global_b)
                } else {
                    (pool.fee_growth_global_a, curr_fee_growth_global_input)
                };

                let (update, next_liquidity) = calculate_update(
                    next_tick.ok_or(ErrorCode::TickNotFound)?,
                    a_to_b,
                    curr_liquidity,
                    fee_growth_global_a,
                    fee_growth_global_b,
                    &next_reward_infos,
                )?;

                curr_liquidity = next_liquidity;
                swap_tick_sequence.update_tick(
                    next_array_index,
                    next_tick_index,
                    tick_spacing,
                    &update,
                )?;
            }

            let tick_offset = swap_tick_sequence.get_tick_offset(
                next_array_index,
                next_tick_index,
                tick_spacing,
            )?;

            // Increment to the next tick array if either condition is true:
            //  - Price is moving left and the current tick is the start of the tick array
            //  - Price is moving right and the current tick is the end of the tick array
            curr_array_index = if (a_to_b && tick_offset == 0)
                || (!a_to_b && tick_offset == TICK_ARRAY_SIZE as isize - 1)
            {
                next_array_index + 1
            } else {
                next_array_index
            };

            // The get_init_tick search is inclusive of the current index in an a_to_b trade.
            // We therefore have to shift the index by 1 to advance to the next init tick to the left.
            curr_tick_index = if a_to_b {
                next_tick_index - 1
            } else {
                next_tick_index
            };
        } else if swap_computation.next_price != curr_sqrt_price {
            curr_tick_index = tick_index_from_sqrt_price(&swap_computation.next_price);
        }

        curr_sqrt_price = swap_computation.next_price;
        fee = swap_computation.fee_amount;
    }

    let (amount_a, amount_b) = if a_to_b == amount_specified_is_input {
        (
            amount
                .checked_sub(amount_remaining)
                .ok_or(ErrorCode::OverflowOrConversion)?,
            amount_calculated,
        )
    } else {
        (
            amount_calculated,
            amount
                .checked_sub(amount_remaining)
                .ok_or(ErrorCode::OverflowOrConversion)?,
        )
    };

    let fee_growth = if a_to_b {
        curr_fee_growth_global_input
            .checked_sub(pool.fee_growth_global_a)
            .ok_or(ErrorCode::OverflowOrConversion)?
    } else {
        curr_fee_growth_global_input
            .checked_sub(pool.fee_growth_global_b)
            .ok_or(ErrorCode::OverflowOrConversion)?
    };

    // Log delta in fee growth to track pool usage over time with off-chain analytics
    msg!("fee_growth: {}", fee_growth);

    Ok(PostSwapUpdate {
        amount_a,
        amount_b,
        next_liquidity: curr_liquidity,
        next_tick_index: curr_tick_index,
        next_sqrt_price: curr_sqrt_price,
        next_fee_growth_global: curr_fee_growth_global_input,
        next_reward_infos,
        next_protocol_fee: curr_protocol_fee,
        fee,
    })
}

fn calculate_fees(
    fee_amount: u64,
    protocol_fee_rate: u16,
    curr_liquidity: u128,
    curr_protocol_fee: u64,
    curr_fee_growth_global_input: u128,
) -> Result<(u64, u128)> {
    let mut next_protocol_fee = curr_protocol_fee;
    let mut next_fee_growth_global_input = curr_fee_growth_global_input;
    let mut global_fee = fee_amount;
    if protocol_fee_rate > 0 {
        let delta = calculate_protocol_fee(global_fee, protocol_fee_rate)?;
        global_fee = global_fee
            .checked_sub(delta)
            .ok_or(ErrorCode::OverflowOrConversion)?;
        next_protocol_fee = next_protocol_fee.wrapping_add(delta);
    }

    if curr_liquidity > 0 {
        next_fee_growth_global_input = next_fee_growth_global_input
            .checked_add(((global_fee as u128) << Q64_RESOLUTION) / curr_liquidity)
            .ok_or(ErrorCode::OverflowOrConversion)?;
    }
    Ok((next_protocol_fee, next_fee_growth_global_input))
}

fn calculate_protocol_fee(global_fee: u64, protocol_fee_rate: u16) -> Result<u64> {
    let global_fee_u128 = global_fee as u128;
    let protocol_fee_rate_u128 = protocol_fee_rate as u128;

    // Perform multiplication with checked_mul
    let product = global_fee_u128
        .checked_mul(protocol_fee_rate_u128)
        .ok_or(ErrorCode::OverflowOrConversion)?;

    // Perform division with checked_div
    let result = product
        .checked_div(PROTOCOL_FEE_RATE_MUL_VALUE)
        .ok_or(ErrorCode::OverflowOrConversion)?;

    // Convert to u64 safely
    let protocol_fee: u64 = result
        .try_into()
        .map_err(|_| ErrorCode::OverflowOrConversion)?;
    Ok(protocol_fee)
}

fn calculate_update(
    tick: &Tick,
    a_to_b: bool,
    liquidity: u128,
    fee_growth_global_a: u128,
    fee_growth_global_b: u128,
    reward_infos: &[PoolRewardInfo; NUM_REWARDS],
) -> Result<(TickUpdate, u128)> {
    // Use updated fee_growth for crossing tick
    // Use -liquidity_net if going left, +liquidity_net going right
    let signed_liquidity_net = if a_to_b {
        -tick.liquidity_net
    } else {
        tick.liquidity_net
    };

    let update =
        next_tick_cross_update(tick, fee_growth_global_a, fee_growth_global_b, reward_infos)?;

    // Update the global liquidity to reflect the new current tick
    let next_liquidity = add_liquidity_delta(liquidity, signed_liquidity_net)?;

    Ok((update, next_liquidity))
}

fn get_next_sqrt_prices(
    next_tick_index: i32,
    sqrt_price_limit: u128,
    a_to_b: bool,
) -> (u128, u128) {
    let next_tick_price = sqrt_price_from_tick_index(next_tick_index);
    let next_sqrt_price_limit = if a_to_b {
        sqrt_price_limit.max(next_tick_price)
    } else {
        sqrt_price_limit.min(next_tick_price)
    };
    (next_tick_price, next_sqrt_price_limit)
}
