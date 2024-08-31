use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

#[derive(Accounts)]
pub struct InitializeTokenBadge<'info> {
    pub pools_config: Box<Account<'info, PoolsConfig>>,

    #[account(has_one = pools_config)]
    pub pools_config_extension: Box<Account<'info, PoolsConfigExtension>>,

    #[account(address = pools_config_extension.token_badge_authority)]
    pub token_badge_authority: Signer<'info>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(init,
      payer = funder,
      seeds = [
        b"token_badge",
        pools_config.key().as_ref(),
        token_mint.key().as_ref(),
      ],
      bump,
      space = TokenBadge::LEN)]
    pub token_badge: Account<'info, TokenBadge>,

    #[account(mut)]
    pub funder: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeTokenBadge>) -> Result<()> {
    Ok(ctx.accounts.token_badge.initialize(
        ctx.accounts.pools_config.key(),
        ctx.accounts.token_mint.key(),
    )?)
}
