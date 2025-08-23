use anchor_lang::prelude::*;

use crate::DepositSolState;

pub fn deposithandler(ctx: Context<DepositSolState>) -> Result<()> {
    msg!("Greetings from: {:?}", ctx.program_id);
    Ok(())
}
