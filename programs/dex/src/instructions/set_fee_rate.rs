use anchor_lang::prelude::*;

use crate::state::{Pool, PoolsConfig};

#[derive(Accounts)]
pub struct SetFeeRate<'info> {
    pub pools_config: Account<'info, PoolsConfig>,

    #[account(mut, has_one = pools_config)]
    pub pool: Account<'info, Pool>,

    #[account(address = pools_config.fee_authority)]
    pub fee_authority: Signer<'info>,
}

pub fn handler(ctx: Context<SetFeeRate>, fee_rate: u16) -> Result<()> {
    Ok(ctx.accounts.pool.update_fee_rate(fee_rate)?)
}
