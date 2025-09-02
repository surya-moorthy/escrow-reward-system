use anchor_lang::prelude::*;

#[account]
pub struct StakingPool {
    pub admin: Pubkey,                     // platform owner (minter / initializer)
    pub supported_tokens: Vec<SupportedToken>, // list of supported SPL tokens
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SupportedToken {
    pub mint: Pubkey,     // token mint address (e.g. MYT)
    pub vault: Pubkey,    // PDA vault token account for escrow
    pub reward_rate: u64, // reward logic per token
    pub total_staked: u64 // total staked across all users for this mint
}

impl StakingPool {
    pub const MAX_TOKENS: usize = 10;

    pub const LEN: usize = 
        32 + // admin pubkey
        4 + (StakingPool::MAX_TOKENS * SupportedToken::LEN); 
        // 4 for Vec prefix (stores length)
}

impl SupportedToken {
    pub const LEN: usize = 32 + 32 + 8 + 8; // = 80 bytes
}
