use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_lang::prelude::*;
use crate::{error::CustomError, pool::PoolAccount, state::stake::UserStakeAccount};

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, seeds = [b"stake", user.key().as_ref()], bump)]
    pub user_stake: Account<'info, UserStakeAccount>,

    #[account(mut, seeds = [b"pool"], bump)]
    pub pool: Account<'info, PoolAccount>,

    /// CHECK: This is the PDA that will act as the authority for the pool vault.
    /// Vault PDA that owns the pool_token_vault
    #[account(seeds = [b"vault_authority", pool.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,

    /// Pool token vault (already initialized in `InitializePool`)
    #[account(mut, seeds = [b"pool_vault", pool.key().as_ref()], bump)]
    pub pool_token_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
    let user_stake = &mut ctx.accounts.user_stake;
    let pool = &mut ctx.accounts.pool;
    
    require!(amount > 0, CustomError::InvalidAmount);
    require!(user_stake.staked_amount >= amount, CustomError::InsufficientStake);

    // Update user and pool state
    user_stake.staked_amount = user_stake.staked_amount.checked_sub(amount).unwrap();
    user_stake.last_stake_time = Clock::get()?.unix_timestamp as u64;
    pool.total_staked = pool.total_staked.checked_sub(amount).unwrap();
    pool.last_update_time = Clock::get()?.unix_timestamp as u64;

    let cpi_accounts = Transfer {
    from: ctx.accounts.pool_token_vault.to_account_info(),
    to: ctx.accounts.user_token_account.to_account_info(),
    authority: ctx.accounts.vault_authority.to_account_info(),
};

let pool_key = ctx.accounts.pool.key();
let bump = ctx.bumps.vault_authority; // bind the bump to a variable
let seeds = &[
    b"vault_authority",
    pool_key.as_ref(),
    &[bump], // use the variable here
];
let signer = &[&seeds[..]];

let cpi_ctx = CpiContext::new_with_signer(
    ctx.accounts.token_program.to_account_info(),
    cpi_accounts,
    signer,
);

token::transfer(cpi_ctx, amount)?;



    Ok(())
}