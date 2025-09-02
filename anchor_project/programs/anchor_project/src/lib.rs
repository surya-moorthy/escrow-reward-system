use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

pub use instructions::*;
pub use state::*;

declare_id!("GMrRNhm2zodYbHJgZWr1iyqiRn7ExpQCN6cDJe1BcsVX");

#[program]
pub mod anchor_project {
    
    use super::*;

    pub fn initialize_pool(ctx: Context<Initialize>) -> Result<()> {
        init_pool::init_handler(ctx)
    }
}
