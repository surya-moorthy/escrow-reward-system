use anchor_lang::prelude::*;

use crate::stake::StakeAccount;

pub fn unstake_handler(ctx: Context<UnStake>) -> Result<()> {
    msg!("Greetings from: {:?}", ctx.program_id);
    Ok(())
}

#[derive(Accounts)] 
pub struct UnStake<'info> {
    #[account(mut)]
    pub owner : Signer<'info>,
    #[account(
        mut,
        seeds = [b"stake", owner.key().as_ref()],
        bump = stake_account.bump,
    )] 
    pub stake_account : Account<'info,StakeAccount>,

    pub system_program : Program<'info,System>

}