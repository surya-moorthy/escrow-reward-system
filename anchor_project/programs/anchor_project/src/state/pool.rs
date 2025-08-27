use anchor_lang::prelude::*;

#[account]
pub struct PoolAccount {
    pub staking_mint: Pubkey,
    pub reward_mint: Pubkey,
    pub reward_rate: u64,
    pub total_staked: u64,
    pub last_update_time: u64,
}

impl PoolAccount {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8;
}

