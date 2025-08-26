use anchor_lang::{prelude::*, system_program};
use crate::{calculate_reward, pool::Pool, state::stake::StakeAccount, update_points};
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
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
    // 1. Transfer SPL tokens back to user
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
    // 2. Send SOL rewards from treasury to user
    // -------------------------------

    let pool_key = ctx.accounts.pool.key();

    let treasury_seeds = &[
        b"treasury",
        pool_key.as_ref(),
        &[ctx.accounts.pool.treasury_bump],
    ];
    let treasury_signer = &[&treasury_seeds[..]];

    let reward_amount = calculate_reward(amount, stake, clock.unix_timestamp, &ctx.accounts.pool)?;

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.treasury_pda.to_account_info(),
            to: ctx.accounts.owner.to_account_info(),
        },
        treasury_signer,
    );
    system_program::transfer(cpi_ctx, reward_amount)?;

    // -------------------------------
    // 3. Update stake account state
    // -------------------------------

    stake.staked_amount = stake
        .staked_amount
        .checked_sub(amount)
        .ok_or(StakeError::Underflow)?;

    msg!("Unstaked {} tokens. Remaining staked: {}, Rewards paid: {} lamports", amount, stake.staked_amount, reward_amount);

    Ok(())
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    // The bookkeeping PDA
    #[account(
        mut,
        seeds = [b"stake", owner.key().as_ref()],
        bump = stake_account.bump,
    )]
    pub stake_account: Account<'info, StakeAccount>,

    // User's SPL token account (where tokens return)
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    // Vault token account holding staked SPL
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: vault authority PDA
    pub vault_authority: UncheckedAccount<'info>,

    // Treasury PDA (SOL rewards vault)
    #[account(mut)]
    pub treasury_pda: SystemAccount<'info>,

    // Pool PDA (stores reward rate, lock duration, treasury bump)
    #[account()]
    pub pool: Account<'info, Pool>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
