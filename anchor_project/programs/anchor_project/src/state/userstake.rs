use anchor_lang::prelude::*;

#[account]
pub struct UserStakeAccount {
    pub staker: Pubkey,    // user wallet
    pub mint: Pubkey,      // which token they staked
    pub amount: u64,       // how many tokens staked
    pub start_time: i64,   // timestamp of stake
    pub reward_debt: u64,  // bookkeeping for rewards
}


impl UserStakeAccount {
     pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8;
}