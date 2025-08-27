
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::pool::{Pool};

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
pool.treasury_bump = ctx.bumps.treasury_token_account;


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

    #[account(
        init,
        payer = admin,
        token::mint = reward_mint,
        token::authority = pool,
        seeds = [b"treasury", pool.key().as_ref()],
        bump
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    /// Staking mint (what users deposit)
    pub staking_mint: Account<'info, Mint>,

    /// Reward mint (what users earn)
    pub reward_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}
