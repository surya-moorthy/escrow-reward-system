pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("HqPFKnfyYcEVkPkfg883mhu2YgPMKWt7sZQTFmZRXAC9");

#[program]
pub mod anchor_project {
    use super::*;

    pub fn initialize(ctx: Context<InitializeState>) -> Result<()> {
        initialize::inithandler(ctx)
    }

    pub fn deposit_sol(ctx : Context<DepositSolState>) -> Result<()> {
        depositsol::deposithandler(ctx)
    }

    pub fn unstake_sol(ctx : Context<UnStakeSolState>) -> Result<()> {
        unstakesol::unstakehandler(ctx)
    }
}
