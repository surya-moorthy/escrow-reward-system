use anchor_lang::prelude::*;

#[account]
pub struct Pool {
    pub admin: Pubkey,           // immutable admin for capstone
    pub staking_mint: Pubkey,    // SPL token users must stake
    pub reward_rate: u64,        // reward units per token per second
    pub lock_duration: i64,      // seconds
    pub pool_bump: u8,           // bump for pool PDA
    pub treasury_bump: u8,       // bump for treasury PDA (SOL)
    pub vault_auth_bump: u8,     // bump for the vault authority PDA seed namespace
}

impl Pool {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1 + 1 + 1;
}
