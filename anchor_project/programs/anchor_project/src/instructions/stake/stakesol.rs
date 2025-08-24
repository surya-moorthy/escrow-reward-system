use anchor_lang::prelude::*;

use crate::{error::StakeError, state::stake::StakeAccount, update_points};


use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
    require!(amount > 0, StakeError::InvalidAmount);

    let pda_account = &mut ctx.accounts.stake_account;
    let clock = Clock::get()?;

    // Update reward points before modifying stake
    update_points(pda_account, clock.unix_timestamp)?;

    // Transfer SPL tokens from user's ATA to vault (escrow PDA)
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        },
    );
    token::transfer(cpi_ctx, amount)?;

    // Update bookkeeping
    pda_account.staked_amount = pda_account
        .staked_amount
        .checked_add(amount)
        .ok_or(StakeError::Overflow)?;

    msg!(
        "Staked {} tokens. Total staked: {}, Total points: {}",
        amount,
        pda_account.staked_amount,
        pda_account.claim_points / 1_000_000
    );

    Ok(())
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    // User’s associated token account (where their staking tokens are)
    #[account(
        mut,
        constraint = user_token_account.owner == owner.key(),
        constraint = user_token_account.mint == staking_mint.key(),
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    // Vault PDA that holds staked tokens (escrow)
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    // The stake bookkeeping PDA
    #[account(
        mut,
        seeds = [b"stake", owner.key().as_ref()],
        bump = stake_account.bump,
    )]
    pub stake_account: Account<'info, StakeAccount>,

    // Mint of the staking token
    pub staking_mint: Account<'info, Mint>,

    // Token program
    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}
