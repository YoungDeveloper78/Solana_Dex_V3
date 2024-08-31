use anchor_lang::prelude::*;

use crate::state::{PoolsConfig, PoolsConfigExtension};

#[derive(Accounts)]
pub struct SetTokenBadgeAuthority<'info> {
    pub pools_config: Box<Account<'info, PoolsConfig>>,

    #[account(mut, has_one = pools_config)]
    pub pools_config_extension: Account<'info, PoolsConfigExtension>,

    #[account(address = pools_config_extension.config_extension_authority)]
    pub config_extension_authority: Signer<'info>,

    /// CHECK: safe, the account that will be new authority can be arbitrary
    pub new_token_badge_authority: UncheckedAccount<'info>,
}

/// Set the token badge authority. Only the config extension authority has permission to invoke this instruction.
pub fn handler(ctx: Context<SetTokenBadgeAuthority>) -> Result<()> {
    Ok(ctx
        .accounts
        .pools_config_extension
        .update_token_badge_authority(ctx.accounts.new_token_badge_authority.key()))
}
