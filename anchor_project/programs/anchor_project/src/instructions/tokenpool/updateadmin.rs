use anchor_lang::{prelude::*};

use crate::{error::StakeError, pool::Pool};


/// Update the admin of a pool.
pub fn update_admin(ctx: Context<UpdateAdmin>, new_admin: Pubkey) -> Result<()> {
require_keys_eq!(
ctx.accounts.pool.admin,
ctx.accounts.admin.key(),
StakeError::Unauthorized
);


ctx.accounts.pool.admin = new_admin;
Ok(())
}


#[derive(Accounts)]
pub struct UpdateAdmin<'info> {
pub admin: Signer<'info>,


#[account(
mut,
seeds = [b"pool", pool.staking_mint.as_ref()],
bump = pool.pool_bump,
has_one = admin @ StakeError::Unauthorized,
)]
pub pool: Account<'info, Pool>,
}