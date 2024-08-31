use crate::errors::ErrorCode;
use crate::state::{Pool, TokenBadge};
use anchor_lang::prelude::*;
use anchor_spl::token_2022::spl_token_2022::extension::transfer_fee::{
    TransferFee, MAX_FEE_BASIS_POINTS,
};
use anchor_spl::token_interface::spl_token_2022::extension::BaseStateWithExtensions;

use anchor_spl::memo::{self, BuildMemo, Memo};
use anchor_spl::token::Token;
use anchor_spl::token_2022::spl_token_2022::{
    self,
    extension::{self, StateWithExtensions},
    state::AccountState,
};
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use spl_transfer_hook_interface;

pub fn transfer_from_owner_to_vault_v2<'info>(
    authority: &Signer<'info>,
    token_mint: &InterfaceAccount<'info, Mint>,
    token_owner_account: &InterfaceAccount<'info, TokenAccount>,
    token_vault: &InterfaceAccount<'info, TokenAccount>,
    token_program: &Interface<'info, TokenInterface>,
    memo_program: &Program<'info, Memo>,
    transfer_hook_accounts: &Option<Vec<AccountInfo<'info>>>,
    amount: u64,
) -> Result<()> {
    // TransferFee extension
    if let Some(epoch_transfer_fee) = get_epoch_transfer_fee(token_mint)? {
        // log applied transfer fee
        // - Not must, but important for ease of investigation and replay when problems occur
        // - Use Memo because logs risk being truncated
        let transfer_fee_memo = format!(
            "TFe: {}, {}",
            u16::from(epoch_transfer_fee.transfer_fee_basis_points),
            u64::from(epoch_transfer_fee.maximum_fee),
        );
        memo::build_memo(
            CpiContext::new(memo_program.to_account_info(), BuildMemo {}),
            transfer_fee_memo.as_bytes(),
        )?;
    }

    // MemoTransfer extension
    // The vault doesn't have MemoTransfer extension, so we don't need to use memo_program here

    let mut instruction = spl_token_2022::instruction::transfer_checked(
        token_program.key,
        &token_owner_account.key(), // from
        &token_mint.key(),          // mint
        &token_vault.key(),         // to
        authority.key,              // authority
        &[],
        amount,
        token_mint.decimals,
    )?;

    let mut account_infos = vec![
        token_program.to_account_info(),
        token_owner_account.to_account_info(),
        token_mint.to_account_info(),
        token_vault.to_account_info(),
        authority.to_account_info(),
    ];

    // TransferHook extension
    if let Some(hook_program_id) = get_transfer_hook_program_id(token_mint)? {
        if transfer_hook_accounts.is_none() {
            return Err(ErrorCode::NoExtraAccountsForTransferHook.into());
        }
        let transfer_hook_accounts = transfer_hook_accounts
            .clone()
            .ok_or(ErrorCode::MissingOrInvalidDelegate)?;
        spl_transfer_hook_interface::onchain::add_extra_accounts_for_execute_cpi(
            &mut instruction,
            &mut account_infos,
            &hook_program_id,
            token_owner_account.to_account_info(),
            token_mint.to_account_info(),
            token_vault.to_account_info(),
            authority.to_account_info(),
            amount,
            &transfer_hook_accounts,
        )?;
    }

    solana_program::program::invoke_signed(&instruction, &account_infos, &[])?;

    Ok(())
}

pub fn transfer_from_vault_to_owner_v2<'info>(
    pool: &Account<'info, Pool>,
    token_mint: &InterfaceAccount<'info, Mint>,
    token_vault: &InterfaceAccount<'info, TokenAccount>,
    token_owner_account: &InterfaceAccount<'info, TokenAccount>,
    token_program: &Interface<'info, TokenInterface>,
    memo_program: &Program<'info, Memo>,
    transfer_hook_accounts: &Option<Vec<AccountInfo<'info>>>,
    amount: u64,
    memo: &[u8],
) -> Result<()> {
    // TransferFee extension
    if let Some(epoch_transfer_fee) = get_epoch_transfer_fee(token_mint)? {
        // log applied transfer fee
        // - Not must, but important for ease of investigation and replay when problems occur
        // - Use Memo because logs risk being truncated
        let transfer_fee_memo = format!(
            "TFe: {}, {}",
            u16::from(epoch_transfer_fee.transfer_fee_basis_points),
            u64::from(epoch_transfer_fee.maximum_fee),
        );
        memo::build_memo(
            CpiContext::new(memo_program.to_account_info(), BuildMemo {}),
            transfer_fee_memo.as_bytes(),
        )?;
    }

    // MemoTransfer extension
    if is_transfer_memo_required(&token_owner_account)? {
        memo::build_memo(
            CpiContext::new(memo_program.to_account_info(), BuildMemo {}),
            memo,
        )?;
    }

    let mut instruction = spl_token_2022::instruction::transfer_checked(
        token_program.key,
        &token_vault.key(),         // from
        &token_mint.key(),          // mint
        &token_owner_account.key(), // to
        &pool.key(),                // authority
        &[],
        amount,
        token_mint.decimals,
    )?;

    let mut account_infos = vec![
        token_program.to_account_info(),
        token_vault.to_account_info(),
        token_mint.to_account_info(),
        token_owner_account.to_account_info(),
        pool.to_account_info(),
    ];

    // TransferHook extension
    if let Some(hook_program_id) = get_transfer_hook_program_id(token_mint)? {
        if transfer_hook_accounts.is_none() {
            return Err(ErrorCode::NoExtraAccountsForTransferHook.into());
        }

        let transfer_hook_accounts = transfer_hook_accounts
            .clone()
            .ok_or(ErrorCode::MissingOrInvalidDelegate)?;
        spl_transfer_hook_interface::onchain::add_extra_accounts_for_execute_cpi(
            &mut instruction,
            &mut account_infos,
            &hook_program_id,
            token_owner_account.to_account_info(),
            token_mint.to_account_info(),
            token_vault.to_account_info(),
            pool.to_account_info(),
            amount,
            &transfer_hook_accounts,
        )?;
    }

    solana_program::program::invoke_signed(&instruction, &account_infos, &[&pool.seeds()])?;

    Ok(())
}

fn get_transfer_hook_program_id<'info>(
    token_mint: &InterfaceAccount<'info, Mint>,
) -> Result<Option<Pubkey>> {
    let token_mint_info = token_mint.to_account_info();
    if *token_mint_info.owner == Token::id() {
        return Ok(None);
    }

    let token_mint_data = token_mint_info.try_borrow_data()?;
    let token_mint_unpacked =
        StateWithExtensions::<spl_token_2022::state::Mint>::unpack(&token_mint_data)?;
    Ok(extension::transfer_hook::get_program_id(
        &token_mint_unpacked,
    ))
}

fn is_transfer_memo_required<'info>(
    token_account: &InterfaceAccount<'info, TokenAccount>,
) -> Result<bool> {
    let token_account_info = token_account.to_account_info();
    if *token_account_info.owner == Token::id() {
        return Ok(false);
    }

    let token_account_data = token_account_info.try_borrow_data()?;
    let token_account_unpacked =
        StateWithExtensions::<spl_token_2022::state::Account>::unpack(&token_account_data)?;
    let extension =
        token_account_unpacked.get_extension::<extension::memo_transfer::MemoTransfer>();

    if let Ok(memo_transfer) = extension {
        return Ok(memo_transfer.require_incoming_transfer_memos.into());
    } else {
        return Ok(false);
    }
}

pub fn is_supported_token_mint<'info>(
    token_mint: &InterfaceAccount<'info, Mint>,
    is_token_badge_initialized: bool,
) -> Result<bool> {
    let token_mint_info = token_mint.to_account_info();

    // if mint is owned by Token Program, it is supported (compatible to initialize_pool / initialize_reward)
    if *token_mint_info.owner == Token::id() {
        return Ok(true);
    }

    // now mint is owned by Token-2022 Program

    // reject native mint of Token-2022 Program to avoid SOL liquidity fragmentation
    if spl_token_2022::native_mint::check_id(&token_mint.key()) {
        return Ok(false);
    }

    // reject if mint has freeze_authority
    if token_mint.freeze_authority.is_some() && !is_token_badge_initialized {
        return Ok(false);
    }

    let token_mint_data = token_mint_info.try_borrow_data()?;
    let token_mint_unpacked =
        StateWithExtensions::<spl_token_2022::state::Mint>::unpack(&token_mint_data)?;

    let extensions = token_mint_unpacked.get_extension_types()?;
    for extension in extensions {
        match extension {
            // supported
            extension::ExtensionType::TransferFeeConfig => {}
            extension::ExtensionType::TokenMetadata => {}
            extension::ExtensionType::MetadataPointer => {}
            // partially supported
            extension::ExtensionType::ConfidentialTransferMint => {
                // Supported, but non-confidential transfer only
                //
                // poolProgram invokes TransferChecked instruction and it supports non-confidential transfer only.
                //
                // Because the vault accounts are not configured to support confidential transfer,
                // it is impossible to send tokens directly to the vault accounts confidentially.
                // Note: Only the owner (pool account) can call ConfidentialTransferInstruction::ConfigureAccount.
            }
            extension::ExtensionType::ConfidentialTransferFeeConfig => {
                // Supported, but non-confidential transfer only
                // When both TransferFeeConfig and ConfidentialTransferMint are initialized,
                // ConfidentialTransferFeeConfig is also initialized to store encrypted transfer fee amount.
            }
            // supported if token badge is initialized
            extension::ExtensionType::PermanentDelegate => {
                if !is_token_badge_initialized {
                    return Ok(false);
                }
            }
            extension::ExtensionType::TransferHook => {
                if !is_token_badge_initialized {
                    return Ok(false);
                }
            }
            extension::ExtensionType::MintCloseAuthority => {
                if !is_token_badge_initialized {
                    return Ok(false);
                }
            }
            extension::ExtensionType::DefaultAccountState => {
                if !is_token_badge_initialized {
                    return Ok(false);
                }

                // reject if default state is not Initialized even if it has token badge
                let default_state = token_mint_unpacked
                    .get_extension::<extension::default_account_state::DefaultAccountState>(
                )?;
                let initialized: u8 = AccountState::Initialized.into();
                if default_state.state != initialized {
                    return Ok(false);
                }
            }
            // No possibility to support the following extensions
            extension::ExtensionType::NonTransferable => {
                return Ok(false);
            }
            // mint has unknown or unsupported extensions
            _ => {
                return Ok(false);
            }
        }
    }

    return Ok(true);
}

pub fn is_token_badge_initialized<'info>(
    pools_config_key: Pubkey,
    token_mint_key: Pubkey,
    token_badge: &UncheckedAccount<'info>,
) -> Result<bool> {
    if *token_badge.owner != crate::id() {
        return Ok(false);
    }

    let token_badge = TokenBadge::try_deserialize(&mut token_badge.data.borrow().as_ref())?;

    Ok(token_badge.pools_config == pools_config_key && token_badge.token_mint == token_mint_key)
}

#[derive(Debug)]
pub struct TransferFeeIncludedAmount {
    pub amount: u64,
    pub transfer_fee: u64,
}

#[derive(Debug)]
pub struct TransferFeeExcludedAmount {
    pub amount: u64,
    pub transfer_fee: u64,
}

pub fn calculate_transfer_fee_excluded_amount<'info>(
    token_mint: &InterfaceAccount<'info, Mint>,
    transfer_fee_included_amount: u64,
) -> Result<TransferFeeExcludedAmount> {
    if let Some(epoch_transfer_fee) = get_epoch_transfer_fee(token_mint)? {
        let transfer_fee = match epoch_transfer_fee.calculate_fee(transfer_fee_included_amount) {
            Some(fee) => fee,
            None => return Err(ErrorCode::FeeCalculationFailed.into()), // Handle the error properly
        };

        let transfer_fee_excluded_amount =
            match transfer_fee_included_amount.checked_sub(transfer_fee) {
                Some(amount) => amount,
                None => return Err(ErrorCode::OverflowOrConversion.into()), // Handle underflow
            };

        return Ok(TransferFeeExcludedAmount {
            amount: transfer_fee_excluded_amount,
            transfer_fee,
        });
    }

    Ok(TransferFeeExcludedAmount {
        amount: transfer_fee_included_amount,
        transfer_fee: 0,
    })
}

pub fn calculate_transfer_fee_included_amount<'info>(
    token_mint: &InterfaceAccount<'info, Mint>,
    transfer_fee_excluded_amount: u64,
) -> Result<TransferFeeIncludedAmount> {
    if transfer_fee_excluded_amount == 0 {
        return Ok(TransferFeeIncludedAmount {
            amount: 0,
            transfer_fee: 0,
        });
    }

    // now transfer_fee_excluded_amount > 0

    if let Some(epoch_transfer_fee) = get_epoch_transfer_fee(token_mint)? {
        let transfer_fee: u64 =
            if u16::from(epoch_transfer_fee.transfer_fee_basis_points) == MAX_FEE_BASIS_POINTS {
                // edge-case: if transfer fee rate is 100%, current SPL implementation returns 0 as inverse fee.
                // https://github.com/solana-labs/solana-program-library/blob/fe1ac9a2c4e5d85962b78c3fc6aaf028461e9026/token/program-2022/src/extension/transfer_fee/mod.rs#L95

                // But even if transfer fee is 100%, we can use maximum_fee as transfer fee.
                // if transfer_fee_excluded_amount + maximum_fee > u64 max, the following checked_add should fail.
                u64::from(epoch_transfer_fee.maximum_fee)
            } else {
                epoch_transfer_fee
                    .calculate_inverse_fee(transfer_fee_excluded_amount)
                    .ok_or(ErrorCode::TransferFeeCalculationError)?
            };

        let transfer_fee_included_amount = transfer_fee_excluded_amount
            .checked_add(transfer_fee)
            .ok_or(ErrorCode::TransferFeeCalculationError)?;

        // verify transfer fee calculation for safety
        let transfer_fee_verification = epoch_transfer_fee
            .calculate_fee(transfer_fee_included_amount)
            .ok_or(ErrorCode::TransferFeeCalculationError)?;
        if transfer_fee != transfer_fee_verification {
            // We believe this should never happen
            return Err(ErrorCode::TransferFeeCalculationError.into());
        }

        return Ok(TransferFeeIncludedAmount {
            amount: transfer_fee_included_amount,
            transfer_fee,
        });
    }

    Ok(TransferFeeIncludedAmount {
        amount: transfer_fee_excluded_amount,
        transfer_fee: 0,
    })
}

pub fn get_epoch_transfer_fee<'info>(
    token_mint: &InterfaceAccount<'info, Mint>,
) -> Result<Option<TransferFee>> {
    let token_mint_info = token_mint.to_account_info();
    if *token_mint_info.owner == Token::id() {
        return Ok(None);
    }

    let token_mint_data = token_mint_info.try_borrow_data()?;
    let token_mint_unpacked =
        StateWithExtensions::<spl_token_2022::state::Mint>::unpack(&token_mint_data)?;
    if let Ok(transfer_fee_config) =
        token_mint_unpacked.get_extension::<extension::transfer_fee::TransferFeeConfig>()
    {
        let epoch = Clock::get()?.epoch;
        return Ok(Some(transfer_fee_config.get_epoch_fee(epoch).clone()));
    }

    Ok(None)
}
