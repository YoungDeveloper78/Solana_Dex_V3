use anchor_lang::prelude::*;

use crate::state::{FeeTier, PoolsConfig};

#[derive(Accounts)]
pub struct SetDefaultFeeRate<'info> {
    pub pools_config: Account<'info, PoolsConfig>,

    #[account(mut, has_one = pools_config)]
    pub fee_tier: Account<'info, FeeTier>,

    #[account(address = pools_config.fee_authority)]
    pub fee_authority: Signer<'info>,
}

/*
   Updates the default fee rate on a FeeTier object.
*/
pub fn handler(ctx: Context<SetDefaultFeeRate>, default_fee_rate: u16) -> Result<()> {
    Ok(ctx
        .accounts
        .fee_tier
        .update_default_fee_rate(default_fee_rate)?)
}
