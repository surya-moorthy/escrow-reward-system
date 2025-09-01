use anchor_lang::prelude::*;

declare_id!("GMrRNhm2zodYbHJgZWr1iyqiRn7ExpQCN6cDJe1BcsVX");

#[program]
pub mod anchor_project {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
