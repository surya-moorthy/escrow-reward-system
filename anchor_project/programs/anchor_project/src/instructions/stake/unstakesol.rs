use anchor_lang::{prelude::*, system_program};
use crate::{calculate_reward, pool::Pool, state::stake::StakeAccount, update_points};
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::error::StakeError;

pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
    require!(amount > 0, StakeError::InvalidAmount);

    let pda_account = &mut ctx.accounts.stake_account;
    let clock = Clock::get()?;

    // Ensure enough staked balance
    require!(pda_account.staked_amount >= amount, StakeError::InsufficientStake);

    // Ensure lock time has passed
    require!(
        clock.unix_timestamp >= pda_account.unlock_time,
        StakeError::StakeLocked
    );

    // Update reward points before unstake
    update_points(pda_account, clock.unix_timestamp)?;

    // -------------------------------
    // 1. Transfer SPL tokens back to user
    // -------------------------------

    let owner_key = ctx.accounts.owner.key();
    
    let seeds = &[
        b"vault",
        owner_key.as_ref(),
        &[pda_account.bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        },
        signer,
    );
    token::transfer(cpi_ctx, amount)?;

    // -------------------------------
    // 2. Send SOL rewards from treasury to user
    // -------------------------------
    let stake_key = ctx.accounts.pool.key(); // now it's owned and lives longer

    let seeds: &[&[u8]] = &[
        b"stake",
        stake_key.as_ref(),            // borrow from owned variable
        &[pda_account.bump],
    ];

    let signer = &[&seeds[..]];


    let reward_amount = calculate_reward(amount, pda_account, clock.unix_timestamp,&ctx.accounts.pool)?;
    
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.treasury_pda.to_account_info(),
            to: ctx.accounts.owner.to_account_info(),
        },
        signer,
    );
    system_program::transfer(cpi_ctx, reward_amount)?;

    // -------------------------------
    // 3. Update stake account state
    // -------------------------------
    pda_account.staked_amount = pda_account
        .staked_amount
        .checked_sub(amount)
        .ok_or(StakeError::Underflow)?;

    msg!(
        "Unstaked {} tokens. Remaining staked: {}, Rewards paid: {} lamports",
        amount,
        pda_account.staked_amount,
        reward_amount
    );

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

    // User’s SPL token account (where tokens go back)
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    // Vault (escrow) token account holding staked SPL
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: vault authority PDA
    pub vault_authority: UncheckedAccount<'info>,

    // Treasury PDA (SOL vault for rewards)
    #[account(mut)]
    pub treasury_pda: SystemAccount<'info>,

    // Pool PDA (stores reward rate, lock duration, bump)
    #[account()]
    pub pool: Account<'info, Pool>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
