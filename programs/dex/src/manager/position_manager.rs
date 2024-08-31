use crate::{
    errors::ErrorCode,
    math::{add_liquidity_delta, checked_mul_shift_right},
    state::{Position, PositionUpdate, NUM_REWARDS},
};

pub fn next_position_modify_liquidity_update(
    position: &Position,
    liquidity_delta: i128,
    fee_growth_inside_a: u128,
    fee_growth_inside_b: u128,
    reward_growths_inside: &[u128; NUM_REWARDS],
) -> Result<PositionUpdate, ErrorCode> {
    let mut update = PositionUpdate::default();

    // Calculate fee deltas.
    // If fee deltas overflow, default to a zero value. This means the position loses
    // all fees earned since the last time the position was modified or fees collected.
    let growth_delta_a = fee_growth_inside_a.wrapping_sub(position.fee_growth_checkpoint_a);
    let fee_delta_a = checked_mul_shift_right(position.liquidity, growth_delta_a).unwrap_or(0);

    let growth_delta_b = fee_growth_inside_b.wrapping_sub(position.fee_growth_checkpoint_b);
    let fee_delta_b = checked_mul_shift_right(position.liquidity, growth_delta_b).unwrap_or(0);

    update.fee_growth_checkpoint_a = fee_growth_inside_a;
    update.fee_growth_checkpoint_b = fee_growth_inside_b;

    // Overflows allowed. Must collect fees owed before overflow.
    update.fee_owed_a = position.fee_owed_a.wrapping_add(fee_delta_a);
    update.fee_owed_b = position.fee_owed_b.wrapping_add(fee_delta_b);

    for i in 0..NUM_REWARDS {
        let reward_growth_inside = reward_growths_inside[i];
        let curr_reward_info = position.reward_infos[i];

        // Calculate reward delta.
        // If reward delta overflows, default to a zero value. This means the position loses all
        // rewards earned since the last time the position was modified or rewards were collected.
        let reward_growth_delta =
            reward_growth_inside.wrapping_sub(curr_reward_info.growth_inside_checkpoint);
        let amount_owed_delta =
            checked_mul_shift_right(position.liquidity, reward_growth_delta).unwrap_or(0);

        update.reward_infos[i].growth_inside_checkpoint = reward_growth_inside;

        // Overflows allowed. Must collect rewards owed before overflow.
        update.reward_infos[i].amount_owed =
            curr_reward_info.amount_owed.wrapping_add(amount_owed_delta);
    }

    update.liquidity = add_liquidity_delta(position.liquidity, liquidity_delta)?;

    Ok(update)
}
