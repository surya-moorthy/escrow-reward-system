
use anchor_lang::prelude::*;

use anchor_spl::token::Mint;

use crate::pool::{Pool, Treasury};

pub fn initialize_pool(
ctx: Context<InitializePool>,
reward_rate: u64,
lock_duration: i64,
) -> Result<()> {
let pool = &mut ctx.accounts.pool;


pool.admin = ctx.accounts.admin.key();
pool.staking_mint = ctx.accounts.staking_mint.key();
pool.reward_rate = reward_rate;
pool.lock_duration = lock_duration;
pool.pool_bump = ctx.bumps.pool;
pool.treasury_bump = ctx.bumps.treasury;


Ok(())
}


#[derive(Accounts)]
pub struct InitializePool<'info> {
#[account(mut)]
pub admin: Signer<'info>,


#[account(
init,
payer = admin,
space = Pool::LEN,
seeds = [b"pool", staking_mint.key().as_ref()],
bump
)]
pub pool: Account<'info, Pool>,


/// Treasury is a program-owned PDA we can safely close later.
#[account(
init,
payer = admin,
space = 8, // discriminator only
seeds = [b"treasury", pool.key().as_ref()],
bump
)]
pub treasury: Account<'info, Treasury>,


/// Staking mint associated to this pool
pub staking_mint: AccountInfo<'info>,


pub system_program: Program<'info, System>,
}