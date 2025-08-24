
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct StakeAccount {
  pub owner : Pubkey,
  pub staked_amount : u64,
  pub claim_points : u64,
  pub recent_update_time : i64 ,
  pub bump : u8
}