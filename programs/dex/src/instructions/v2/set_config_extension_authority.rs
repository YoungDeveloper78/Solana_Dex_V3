use anchor_lang::prelude::*;

use crate::state::{PoolsConfig, PoolsConfigExtension};

#[derive(Accounts)]
pub struct SetConfigExtensionAuthority<'info> {
    pub pools_config: Box<Account<'info, PoolsConfig>>,

    #[account(mut, has_one = pools_config)]
    pub pools_config_extension: Account<'info, PoolsConfigExtension>,

    #[account(address = pools_config_extension.config_extension_authority)]
    pub config_extension_authority: Signer<'info>,

    /// CHECK: safe, the account that will be new authority can be arbitrary
    pub new_config_extension_authority: UncheckedAccount<'info>,
}

/// Set the config extension authority. Only the current config extension authority has permission to invoke this instruction.
pub fn handler(ctx: Context<SetConfigExtensionAuthority>) -> Result<()> {
    Ok(ctx
        .accounts
        .pools_config_extension
        .update_config_extension_authority(ctx.accounts.new_config_extension_authority.key()))
}
