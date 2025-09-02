use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{errors::errors::CustomError, StakingPool, UserStakeAccount};

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(mut)]
    pub staker: Signer<'info>,

    #[account(
        mut,
        constraint = staker_token_account.mint == mint.key()
    )]
    pub staker_token_account: Account<'info, TokenAccount>,   // user ATA

    #[account(
    init_if_needed,
    payer = staker,
    seeds = [b"vault", staking_pool.key().as_ref(), mint.key().as_ref()],
    bump,
    token::mint = mint,
    token::authority = staking_pool
    )]
    pub vault: Account<'info, TokenAccount>,                        // PDA escrow vault

    pub mint: Account<'info, Mint>,                           // token being staked

    #[account(
        init_if_needed,
        payer = staker,
        space = 8 + UserStakeAccount::LEN,
        seeds = [b"user-stake", staker.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub user_stake: Account<'info, UserStakeAccount>,         // user staking record

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn stake_handler(ctx: Context<Stake>, amount: u64) -> Result<()> {
    // 1. Validate amount
    if amount == 0 {
        return Err(error!(CustomError::InvalidAmount));
    }

    // 2. Check staker balance
    if ctx.accounts.staker_token_account.amount < amount {
        return Err(error!(CustomError::InsufficientBalance));
    }

    // 3. Ensure pool supports this mint
    let pool = &mut ctx.accounts.staking_pool;
    let supported_token = pool
        .supported_tokens
        .iter_mut()
        .find(|t| t.mint == ctx.accounts.mint.key())
        .ok_or(CustomError::UnsupportedToken)?;

    // 4. Transfer from user -> vault
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.staker_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.staker.to_account_info(),
        },
    );
    token::transfer(cpi_ctx, amount)?;

    // 5. Update user stake record
    let user_stake = &mut ctx.accounts.user_stake;
    user_stake.staker = ctx.accounts.staker.key();
    user_stake.mint = ctx.accounts.mint.key();
    // 5. Update user stake record
    let user_stake = &mut ctx.accounts.user_stake;
    user_stake.staker = ctx.accounts.staker.key();
    user_stake.mint = ctx.accounts.mint.key();
    user_stake.amount = user_stake.amount.checked_add(amount)
        .ok_or(CustomError::Overflow)?; // safely increment

    // 6. Update pool stats
    supported_token.total_staked = supported_token.total_staked.checked_add(amount)
        .ok_or(CustomError::Overflow)?;

        
    Ok(())
}
