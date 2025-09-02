use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use crate::{errors::errors::CustomError, StakingPool, UserStakeAccount};

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        mut,
        seeds = [b"user-stake", staker.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub user_stake: Account<'info, UserStakeAccount>,

    #[account(mut)]
    pub staker: Signer<'info>,

    #[account(mut)]
    pub staker_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault", staking_pool.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>, // PDA vault

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

pub fn unstake_handler(ctx: Context<Unstake>, amount: u64) -> Result<()> {
    // Check user has enough staked
    let user_stake = &mut ctx.accounts.user_stake;
    require!(user_stake.amount >= amount, CustomError::InsufficientStake); // Changed error type

    let mint_key = ctx.accounts.mint.key();
    let staking_pool_key = ctx.accounts.staking_pool.key();
    
    // Get the bump for the vault PDA
    let vault_bump = ctx.bumps.vault; // Use the bump from context
    
    let vault_seeds = &[
        b"vault",
        staking_pool_key.as_ref(),
        mint_key.as_ref(),
        &[vault_bump]
    ];
    
    let signer_seeds = &[&vault_seeds[..]];

    // Transfer tokens from vault to staker
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.staker_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),// vault is the authority
            },
            signer_seeds,
        ),
        amount,
    )?;

    // Update records
    user_stake.amount -= amount;
    
    if let Some(token) = ctx.accounts.staking_pool.supported_tokens
        .iter_mut()
        .find(|t| t.mint == ctx.accounts.mint.key()) 
    {
        token.total_staked -= amount;
    }

    Ok(())
}