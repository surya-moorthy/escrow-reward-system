use anchor_lang::prelude::*;
use crate::{calculate_reward, pool::Pool, state::stake::StakeAccount, update_points};
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
use crate::error::StakeError;

pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
    require!(amount > 0, StakeError::InvalidAmount);

    let stake = &mut ctx.accounts.stake_account;
    let clock = Clock::get()?;

    // Ensure enough staked balance
    require!(stake.staked_amount >= amount, StakeError::InsufficientStake);

    // Ensure lock time has passed
    require!(clock.unix_timestamp >= stake.unlock_time, StakeError::StakeLocked);

    // Update reward points before unstake
    update_points(stake, clock.unix_timestamp)?;

    // -------------------------------
    // 1. Transfer staked SPL tokens back to user
    // -------------------------------
    let owner_key = ctx.accounts.owner.key();

    let vault_seeds = &[
        b"vault",
        owner_key.as_ref(),
        &[stake.vault_bump], // store vault bump in stake_account
    ];
    let signer_seeds = &[&vault_seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(cpi_ctx, amount)?;

    // -------------------------------
    // 2. Send SPL reward tokens from treasury to user
    // -------------------------------
    let reward_amount = calculate_reward(
        amount,
        stake,
        clock.unix_timestamp,
        &ctx.accounts.pool,
    )?;

    let pool_key = ctx.accounts.pool.key();
    let reward_key = ctx.accounts.reward_mint.key();
    let pool_seeds = &[
        b"pool",
        reward_key.as_ref(),
        &[ctx.accounts.pool.pool_bump],
    ];
    let signer_seeds = &[&pool_seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.treasury_token_account.to_account_info(),
            to: ctx.accounts.user_reward_token_account.to_account_info(),
            authority: ctx.accounts.pool.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(cpi_ctx, reward_amount)?;

    // -------------------------------
    // 3. Update stake account state
    // -------------------------------
    stake.staked_amount = stake
        .staked_amount
        .checked_sub(amount)
        .ok_or(StakeError::Underflow)?;

    msg!(
        "Unstaked {} tokens. Remaining staked: {}, Rewards paid: {} reward tokens",
        amount,
        stake.staked_amount,
        reward_amount
    );

    Ok(())
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"stake", owner.key().as_ref()],
        bump = stake_account.bump,
    )]
    pub stake_account: Account<'info, StakeAccount>,

    // User’s SPL token account (where staked tokens are returned)
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    // Vault token account holding staked SPL
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: vault authority PDA
    pub vault_authority: UncheckedAccount<'info>,

    // User’s reward token account (receives rewards)
    #[account(mut)]
    pub user_reward_token_account: Account<'info, TokenAccount>,

    // Treasury SPL token account (PDA) holding reward tokens
    #[account(
        mut,
        token::mint = reward_mint,
        token::authority = pool,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    // Reward token mint
    pub reward_mint: Account<'info, Mint>,

    // Pool PDA (stores config and treasury bump)
    pub pool: Account<'info, Pool>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
