use anchor_lang::{prelude::*, system_program};

use crate::{error::StakeError, pool::Pool};

pub fn fund_treasury(ctx: Context<FundTreasury>, amount: u64) -> Result<()> {
    // ✅ check admin
    require_keys_eq!(
        ctx.accounts.pool.admin,
        ctx.accounts.admin.key(),
        StakeError::Unauthorized
    );

    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.admin.to_account_info(),
            to: ctx.accounts.treasury_pda.to_account_info(),
        },
    );
    system_program::transfer(cpi_ctx, amount)?;

    Ok(())
}

#[derive(Accounts)]
pub struct FundTreasury<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"pool", pool.staking_mint.as_ref()],
        bump = pool.treasury_bump
    )]
    pub pool: Account<'info, Pool>,

    /// CHECK: PDA that stores SOL rewards
    #[account(
        mut,
        seeds = [b"treasury", pool.key().as_ref()],
        bump
    )]
    pub treasury_pda: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}
