
use anchor_lang::prelude::*;

use anchor_spl::token::Mint;

use crate::pool::Pool;

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

    Ok(())
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>, // must be the creator

    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 32 + 8 + 8 + 1,
        seeds = [b"pool", staking_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    pub staking_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
}
