use anchor_lang::prelude::*;

use crate::{error::StakeError, pool::Pool};


pub fn close_pool(ctx: Context<ClosePool>) -> Result<()> {
    // ✅ check admin
    require_keys_eq!(
        ctx.accounts.pool.admin,
        ctx.accounts.admin.key(),
        StakeError::Unauthorized
    );

    // Transfer all SOL from treasury back to admin
    let lamports = ctx.accounts.treasury_pda.lamports();
    **ctx.accounts.treasury_pda.to_account_info().try_borrow_mut_lamports()? -= lamports;
    **ctx.accounts.admin.to_account_info().try_borrow_mut_lamports()? += lamports;

    Ok(())
}

#[derive(Accounts)]
pub struct ClosePool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        close = admin,
        seeds = [b"pool", pool.staking_mint.as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    /// CHECK: Treasury PDA
    #[account(
        mut,
        seeds = [b"treasury", pool.key().as_ref()],
        bump
    )]
    pub treasury_pda: SystemAccount<'info>,
}
