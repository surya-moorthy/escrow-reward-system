use anchor_lang::prelude::*;

use crate::{error::StakeError, pool::{Pool, Treasury}};

/// Close the pool and treasury. Remaining lamports are returned to `admin` via
/// the `close = admin` attribute — no manual lamport hacking required.
pub fn close_pool(ctx: Context<ClosePool>) -> Result<()> {
// ✅ check admin
require_keys_eq!(
ctx.accounts.pool.admin,
ctx.accounts.admin.key(),
StakeError::Unauthorized
);


// Nothing else to do. The `close = admin` attributes handle lamport refunds.
Ok(())
}


#[derive(Accounts)]
pub struct ClosePool<'info> {
#[account(mut)]
pub admin: Signer<'info>,


// Keep `pool` before `treasury`. Anchor processes `close` on drop; order
// does not strictly matter here, but this is a common convention.
#[account(
mut,
close = admin,
seeds = [b"pool", pool.staking_mint.as_ref()],
bump = pool.pool_bump,
has_one = admin @ StakeError::Unauthorized,
)]
pub pool: Account<'info, Pool>,


#[account(
mut,
close = admin,
seeds = [b"treasury", pool.key().as_ref()],
bump = pool.treasury_bump,
)]
pub treasury: Account<'info, Treasury>,
}