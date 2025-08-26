use anchor_lang::{prelude::*, system_program};

use crate::{error::StakeError, pool::{Pool, Treasury}};

/// Deposit SOL into the Treasury PDA (admin only).
pub fn fund_treasury(ctx: Context<FundTreasury>, amount: u64) -> Result<()> {
// extra defense in depth: require explicit admin match
require_keys_eq!(
ctx.accounts.pool.admin,
ctx.accounts.admin.key(),
StakeError::Unauthorized
);


let cpi_ctx = CpiContext::new(
ctx.accounts.system_program.to_account_info(),
system_program::Transfer {
from: ctx.accounts.admin.to_account_info(),
to: ctx.accounts.treasury.to_account_info(),
},
);
system_program::transfer(cpi_ctx, amount)?;
Ok(())
}


#[derive(Accounts)]
pub struct FundTreasury<'info> {
#[account(mut)]
pub admin: Signer<'info>,


// Important: use the POOL seeds and its own bump here.
#[account(
mut,
seeds = [b"pool", pool.staking_mint.as_ref()],
bump = pool.pool_bump,
has_one = admin @ StakeError::Unauthorized,
)]
pub pool: Account<'info, Pool>,


/// Program-owned treasury PDA that stores SOL rewards.
#[account(
mut,
seeds = [b"treasury", pool.key().as_ref()],
bump = pool.treasury_bump,
)]
pub treasury: Account<'info, Treasury>,


pub system_program: Program<'info, System>,
}