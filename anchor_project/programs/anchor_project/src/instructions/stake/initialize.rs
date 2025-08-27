use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::pool::PoolAccount;

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

    /// CHECK: This is the PDA that will act as the authority for the pool vault.
    /// It does not need to be initialized or have any data. It only signs token transfers.
    #[account(
        seeds = [b"vault_authority", pool.key().as_ref()],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = admin,
        seeds = [b"pool_vault", pool.key().as_ref()],
        bump,
        token::mint = staking_mint,
         token::authority = vault_authority
    )]
    pub pool_token_vault: Account<'info, TokenAccount>,

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



