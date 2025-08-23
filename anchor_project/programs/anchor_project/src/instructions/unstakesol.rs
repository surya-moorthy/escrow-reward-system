use anchor_lang::prelude::*;

use crate::UnStakeSolState;

pub fn unstakehandler(ctx: Context<UnStakeSolState>) -> Result<()> {
    msg!("Greetings from: {:?}", ctx.program_id);
    Ok(())
}
