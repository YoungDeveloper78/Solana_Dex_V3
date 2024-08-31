use anchor_lang::prelude::*;

#[event]
#[cfg_attr(feature = "client", derive(Debug))]
pub struct ConfigChangeEvent {
    #[index]
    pub fee_authority: Pubkey,
    pub collect_protocol_fees_authority: Pubkey,
    pub reward_emissions_super_authority: Pubkey,
    pub default_protocol_fee_rate: u16,
}

#[event]
#[cfg_attr(feature = "client", derive(Debug))]
pub struct IncreaseLiquidityEvent {
    /// The ID of the token for which liquidity was increased
    #[index]
    pub position_nft_mint: Pubkey,

    /// The amount by which liquidity for the NFT position was increased
    pub liquidity: i128,

    /// The amount of token_0 that was paid for the increase in liquidity
    pub amount_0: u64,

    /// The amount of token_1 that was paid for the increase in liquidity
    pub amount_1: u64,
}

#[event]
#[cfg_attr(feature = "client", derive(Debug))]
pub struct DecreaseLiquidityEvent {
    /// The ID of the token for which liquidity was increased
    #[index]
    pub position_nft_mint: Pubkey,

    /// The amount by which liquidity for the NFT position was increased
    pub liquidity: i128,

    /// The amount of token_0 that was paid for the increase in liquidity
    pub amount_0: u64,

    /// The amount of token_1 that was paid for the increase in liquidity
    pub amount_1: u64,
}

#[event]
#[cfg_attr(feature = "client", derive(Debug))]
pub struct PoolCreatedEvent {
    /// The first token of the pool by address sort order
    #[index]
    pub token_mint_0: Pubkey,

    /// The second token of the pool by address sort order
    #[index]
    pub token_mint_1: Pubkey,

    /// The minimum number of ticks between initialized ticks
    pub tick_spacing: u16,

    /// The address of the created pool
    pub pool_state: Pubkey,

    /// The initial sqrt price of the pool, as a Q64.64
    pub sqrt_price_x64: u128,

    /// The initial tick of the pool, i.e. log base 1.0001 of the starting price of the pool
    pub tick: i32,

    /// Vault of token_0
    pub token_vault_0: Pubkey,
    /// Vault of token_1
    pub token_vault_1: Pubkey,
}

#[event]
#[cfg_attr(feature = "client", derive(Debug))]
pub struct OpenPositionEvent {
    /// The pool for which liquidity was added
    #[index]
    pub pool_state: Pubkey,

    /// The address that create the position
    pub minter: Pubkey,

    /// The owner of the position and recipient of any minted liquidity
    pub nft_owner: Pubkey,

    /// The lower tick of the position
    #[index]
    pub tick_lower_index: i32,

    /// The upper tick of the position
    #[index]
    pub tick_upper_index: i32,

    /// The amount of liquidity minted to the position range
    pub liquidity: u128,
}
#[event]
#[cfg_attr(feature = "client", derive(Debug))]
pub struct OpenPositionWithMetadataEvent {
    /// The pool for which liquidity was added
    #[index]
    pub pool_state: Pubkey,
    /// The address of the position metadat account
    pub position_metadata_account: Pubkey,
    /// The address that create the position
    pub minter: Pubkey,

    /// The owner of the position and recipient of any minted liquidity
    pub nft_owner: Pubkey,

    /// The lower tick of the position
    #[index]
    pub tick_lower_index: i32,

    /// The upper tick of the position
    #[index]
    pub tick_upper_index: i32,

    /// The amount of liquidity minted to the position range
    pub liquidity: u128,
}

#[event]
#[cfg_attr(feature = "client", derive(Debug))]
pub struct SwapEvent {
    /// The pool for which token_0 and token_1 were swapped
    #[index]
    pub pool_state: Pubkey,

    /// The address that initiated the swap call, and that received the callback
    #[index]
    pub sender: Pubkey,

    /// The payer token account in zero for one swaps, or the recipient token account
    /// in one for zero swaps
    #[index]
    pub token_account_0: Pubkey,

    /// The payer token account in one for zero swaps, or the recipient token account
    /// in zero for one swaps
    #[index]
    pub token_account_1: Pubkey,

    /// The real delta amount of the token_0 of the pool or user
    pub amount_0: u64,

    /// The real delta of the token_1 of the pool or user
    pub amount_1: u64,

    /// if true, amount_0 is negtive and amount_1 is positive
    pub zero_for_one: bool,

    /// The sqrt(price) of the pool after the swap, as a Q64.64
    pub sqrt_price_x64: u128,

    /// The liquidity of the pool after the swap
    pub liquidity: u128,

    /// The log base 1.0001 of price of the pool after the swap
    pub tick: i32,

    pub fee: u64,
}
