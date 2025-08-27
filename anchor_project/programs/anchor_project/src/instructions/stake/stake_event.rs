use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{error::CustomError, pool::PoolAccount, state::stake::UserStakeAccount};

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init_if_needed,
        payer = user,
        space = UserStakeAccount::LEN, // UserStakeAccount size
        seeds = [b"stake", user.key().as_ref()],
        bump
    )]
    pub user_stake: Account<'info, UserStakeAccount>,

    #[account(mut)]
    pub pool: Account<'info, PoolAccount>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>, // source

    #[account(
        mut,
        seeds = [b"pool_vault", pool.key().as_ref()],
        bump
    )]
    pub pool_token_vault: Account<'info, TokenAccount>, // destination

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn stake_handler(ctx: Context<Stake>, amount: u64) -> Result<()> {
    require!(amount > 0, CustomError::InvalidAmount);

    let user_stake = &mut ctx.accounts.user_stake;
    let pool: &mut Account<'_, PoolAccount> = &mut ctx.accounts.pool;

    // Transfer tokens from user to pool vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.pool_token_vault.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    // Update state
    if user_stake.staked_amount == 0 {
        user_stake.owner = ctx.accounts.user.key();
    }
    user_stake.staked_amount = user_stake.staked_amount.checked_add(amount).unwrap();
    user_stake.last_stake_time = Clock::get()?.unix_timestamp as u64;

    pool.total_staked = pool.total_staked.checked_add(amount).unwrap();
    pool.last_update_time = Clock::get()?.unix_timestamp as u64;

    Ok(())
}
