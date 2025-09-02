use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod errors;

pub use instructions::*;
pub use state::*;
pub use errors::*;

declare_id!("GMrRNhm2zodYbHJgZWr1iyqiRn7ExpQCN6cDJe1BcsVX");

#[program]
pub mod anchor_project {

    use super::*;

    pub fn initialize_pool(ctx: Context<Initialize>) -> Result<()> {
        init_pool::init_handler(ctx)
    }

    pub fn stake_token(ctx : Context<Stake>,amount : u64) -> Result<()> {
        stake::stake_handler(ctx, amount)
    }

    pub fn add_supported_token(ctx: Context<AddSupportedToken>,reward_rate: u64,) -> Result<()> {
        add_token::add_supported_token_handler(ctx, reward_rate)
    }
}
