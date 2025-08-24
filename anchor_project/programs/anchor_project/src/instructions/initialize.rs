use anchor_lang::prelude::*;

use crate::stake::StakeAccount;

pub fn init_handler(ctx: Context<InitializeState>) -> Result<()> {
    
    let pda_account = &mut ctx.accounts.stake_account;
    let clock = Clock::get()?;

    pda_account.owner = ctx.accounts.signer.key();
    pda_account.staked_amount = 0;
    pda_account.claim_points = 0;
    pda_account.recent_update_time = clock.unix_timestamp;
    pda_account.bump = ctx.bumps.stake_account;
   
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeState<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + StakeAccount::INIT_SPACE,
        seeds = [b"stake", signer.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,

    pub system_program: Program<'info, System>,
}
