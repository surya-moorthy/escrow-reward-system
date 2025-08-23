use anchor_lang::prelude::*;

use crate::InitializeState;

pub fn inithandler(ctx: Context<InitializeState>) -> Result<()> {
    msg!("Greetings from: {:?}", ctx.program_id);
    Ok(())
}
