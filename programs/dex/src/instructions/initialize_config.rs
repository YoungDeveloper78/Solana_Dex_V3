use anchor_lang::prelude::*;

use crate::{events, state::*};

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(init, payer = funder, space = PoolsConfig::LEN)]
    pub config: Account<'info, PoolsConfig>,

    #[account(mut)]
    pub funder: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeConfig>,
    fee_authority: Pubkey,
    collect_protocol_fees_authority: Pubkey,
    reward_emissions_super_authority: Pubkey,
    default_protocol_fee_rate: u16,
) -> Result<()> {
    let config = &mut ctx.accounts.config;

    config.initialize(
        fee_authority,
        collect_protocol_fees_authority,
        reward_emissions_super_authority,
        default_protocol_fee_rate,
    )?;
    emit!(events::ConfigChangeEvent {
        fee_authority: fee_authority.key(),
        collect_protocol_fees_authority: collect_protocol_fees_authority.key(),
        reward_emissions_super_authority: reward_emissions_super_authority.key(),
        default_protocol_fee_rate: default_protocol_fee_rate,
    });
    Ok(())
}
