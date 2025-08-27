pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use instructions::*;
pub use constants::*;
pub use state::*;

declare_id!("AxiqW8eWPtAVnshxH3WdeTYhUdsvYuzRC5LquzmJEpob");

#[program]
pub mod anchor_project {

    use super::*;

    pub fn initialize(ctx: Context<InitializeState>) -> Result<()> {
        initialize::init_handler(ctx)
    }

    pub fn deposit_sol(ctx : Context<Stake>,amount : u64) -> Result<()> {
        stakesol::stake(ctx,amount)
    }

    pub fn unstake_sol(ctx : Context<Unstake>,amount: u64) -> Result<()> {
        unstakesol::unstake(ctx,amount)
    }

     pub fn initialize_pool(ctx : Context<InitializePool>,reward_rate: u64,lock_duration: i64) -> Result<()> {
        initpool::initialize_pool(ctx,reward_rate,lock_duration)
    }

     pub fn close_pool(ctx : Context<ClosePool>) -> Result<()> {
        closepool::close_pool(ctx)
    }

     pub fn fund_treasury(ctx : Context<FundTreasury>,amount: u64) -> Result<()> {
        fundtreasury::fund_treasury(ctx,amount)
    }

    pub fn update_admin(ctx : Context<UpdateAdmin>,new_admin: Pubkey) -> Result<()> {
       updateadmin::update_admin(ctx, new_admin)
    }
    
}
