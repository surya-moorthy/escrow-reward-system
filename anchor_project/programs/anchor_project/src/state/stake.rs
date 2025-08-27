use anchor_lang::prelude::*;

#[account]
pub struct UserStakeAccount {
    pub owner: Pubkey,        // The user who staked
    pub staked_amount: u64,   // How many tokens are staked
    pub reward_debt: u64,     // Rewards accumulated but not yet claimed
    pub last_stake_time: u64, // When they last staked/unstaked
}


impl UserStakeAccount {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 ;
}