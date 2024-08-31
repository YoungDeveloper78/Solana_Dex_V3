use crate::errors::ErrorCode;
use anchor_lang::prelude::*;

pub const POSITION_BITMAP_USIZE: usize = 32;
pub const POSITION_BUNDLE_SIZE: u16 = 8 * POSITION_BITMAP_USIZE as u16;

#[account]
#[derive(Default)]
pub struct PositionBundle {
    pub position_bundle_mint: Pubkey, // 32
    pub position_bitmap: [u8; POSITION_BITMAP_USIZE], // 32
                                      // 64 RESERVE
}

impl PositionBundle {
    pub const LEN: usize = 8 + 32 + 32 + 64;

    pub fn initialize(&mut self, position_bundle_mint: Pubkey) -> Result<()> {
        self.position_bundle_mint = position_bundle_mint;
        // position_bitmap is initialized using Default trait
        Ok(())
    }

    pub fn is_deletable(&self) -> bool {
        for bitmap in self.position_bitmap.iter() {
            if *bitmap != 0 {
                return false;
            }
        }
        true
    }

    pub fn open_bundled_position(&mut self, bundle_index: u16) -> Result<()> {
        self.update_bitmap(bundle_index, true)
    }

    pub fn close_bundled_position(&mut self, bundle_index: u16) -> Result<()> {
        self.update_bitmap(bundle_index, false)
    }

    fn update_bitmap(&mut self, bundle_index: u16, open: bool) -> Result<()> {
        if !PositionBundle::is_valid_bundle_index(bundle_index) {
            return Err(ErrorCode::InvalidBundleIndex.into());
        }

        let bitmap_index = bundle_index / 8;
        let bitmap_offset = bundle_index % 8;
        let bitmap = self.position_bitmap[bitmap_index as usize];

        let mask = 1 << bitmap_offset;
        let bit = bitmap & mask;
        let opened = bit != 0;

        if open && opened {
            // UNREACHABLE
            // Anchor should reject with AccountDiscriminatorAlreadySet
            return Err(ErrorCode::BundledPositionAlreadyOpened.into());
        }
        if !open && !opened {
            // UNREACHABLE
            // Anchor should reject with AccountNotInitialized
            return Err(ErrorCode::BundledPositionAlreadyClosed.into());
        }

        let updated_bitmap = bitmap ^ mask;
        self.position_bitmap[bitmap_index as usize] = updated_bitmap;

        Ok(())
    }

    fn is_valid_bundle_index(bundle_index: u16) -> bool {
        bundle_index < POSITION_BUNDLE_SIZE
    }
}
