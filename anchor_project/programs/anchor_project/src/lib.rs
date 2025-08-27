
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use instructions::*;

pub use state::*;

declare_id!("HqPFKnfyYcEVkPkfg883mhu2YgPMKWt7sZQTFmZRXAC9");

#[program]
pub mod anchor_project {

    use super::*;

    pub fn initialize(ctx: Context<InitializePool>,reward_rate: u64) -> Result<()> {
        initialize::init_handler(ctx,reward_rate)
    }

    pub fn stakesol(ctx: Context<Stake>, amount : u64) -> Result<()> {
        stake_event::stake_handler(ctx, amount)
    }


    pub fn unstakesol(ctx: Context<Unstake>, amount : u64) -> Result<()> {
        unstake::unstake(ctx, amount)
    }

    pub fn claim_rewards_sol(ctx: Context<ClaimRewards>) -> Result<()> {
          claimrewards::claim_rewards(ctx)
}
    
}
