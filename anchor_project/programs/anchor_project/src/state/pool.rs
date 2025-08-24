use anchor_lang::prelude::*;

#[account]
pub struct Pool {
    pub admin: Pubkey,          // who controls this pool
    pub staking_mint: Pubkey,   // token users must stake
    pub reward_rate: u64,       // rewards per token per lock period
    pub lock_duration: i64,     // in seconds
    pub bump: u8,               // bump for PDA
}
