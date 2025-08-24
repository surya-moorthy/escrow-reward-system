use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct StakeAccount {
    // Who owns this stake
    pub owner: Pubkey,

    // How many tokens staked
    pub staked_amount: u64,

    // For reward calculation
    pub claim_points: u64,

    // Last time rewards were updated
    pub recent_update_time: i64,

    // Unlock time (when stake can be withdrawn)
    pub unlock_time: i64,

    // PDA bumps
    pub bump: u8,          // bump for this StakeAccount
    pub vault_bump: u8,    // bump for the token vault PDA
}

impl StakeAccount {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 16 + 8 + 8 + 1;
}