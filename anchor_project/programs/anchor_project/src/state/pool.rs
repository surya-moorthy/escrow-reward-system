use anchor_lang::prelude::*;

#[account]
pub struct Pool {
/// Admin/owner authority
pub admin: Pubkey,
/// Staking mint this pool is configured for
pub staking_mint: Pubkey,
/// Reward rate in your chosen units (program-specific semantics)
pub reward_rate: u64,
/// Lock period in seconds (program-specific semantics)
pub lock_duration: i64,
/// PDA bump for the pool account (seeds: [b"pool", staking_mint])
pub pool_bump: u8,
/// PDA bump for the treasury account (seeds: [b"treasury", pool])
pub treasury_bump: u8,
}

impl Pool {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1 + 1;
}

#[account]
pub struct Treasury {}
