use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::pool::PoolAccount;

pub fn init_handler( ctx: Context<InitializePool>,
        reward_rate: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;

        pool.staking_mint = ctx.accounts.staking_mint.key();
        pool.reward_mint = ctx.accounts.reward_mint.key();
        pool.reward_rate = reward_rate;
        pool.total_staked = 0;
        pool.last_update_time = Clock::get()?.unix_timestamp as u64;

        Ok(())
    }


#[derive(Accounts)]
pub struct InitializePool<'info> {
    /// Admin who pays for initialization and controls the pool
    #[account(mut)]
    pub admin: Signer<'info>, // ✅ better than raw AccountInfo

    /// Pool account (PDA)
    #[account(
        init,
        payer = admin,
        space = PoolAccount::LEN,
        seeds = [b"pool"],
        bump
    )]
    pub pool: Account<'info, PoolAccount>,

    /// Token that will be staked
    pub staking_mint: Account<'info, Mint>,

    /// Token used for rewards
    pub reward_mint: Account<'info, Mint>,

    /// System program for creating accounts
    pub system_program: Program<'info, System>,

    /// Token program for token operations
    pub token_program: Program<'info, Token>,

    /// Rent sysvar
    pub rent: Sysvar<'info, Rent>,
}




