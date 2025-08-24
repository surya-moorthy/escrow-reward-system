use anchor_lang::prelude::*;

use crate::{error::StakeError, stake::StakeAccount};

pub fn deposit_handler(ctx: Context<Stake>,amount : u64) -> Result<()> {
    let stake_account = &mut ctx.accounts.stake_account;

    require!(ctx.accounts.owner.key() == stake_account.owner.key(), StakeError::Unauthorized);

    stake_account.staked_amount = amount;
  
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info()
        , system 
    )

    
    Ok(())
}

#[derive(Accounts)] 
pub struct Stake<'info> {
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