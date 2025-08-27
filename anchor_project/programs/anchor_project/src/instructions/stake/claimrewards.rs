use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{pool::PoolAccount, state::stake::UserStakeAccount};

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut, signer)]
    pub user: AccountInfo<'info>,

    #[account(mut, seeds = [b"stake", user.key().as_ref()], bump)]
    pub user_stake: Account<'info, UserStakeAccount>,

    #[account(mut, seeds = [b"pool"], bump)]
    pub pool: Account<'info, PoolAccount>,

    #[account(mut)]
    pub reward_vault: Account<'info, TokenAccount>, // where rewards are stored

    #[account(mut)]
    pub user_reward_account: Account<'info, TokenAccount>, // user destination

    pub token_program: Program<'info, Token>,
}

pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
    let user_stake = &mut ctx.accounts.user_stake;
    let pool = &mut ctx.accounts.pool;

    let now = Clock::get()?.unix_timestamp as u64;
    let staked_time = now.checked_sub(user_stake.last_stake_time).unwrap();
    
    let rewards = staked_time
        .checked_mul(user_stake.staked_amount)
        .unwrap()
        .checked_mul(pool.reward_rate)
        .unwrap();

    // Transfer rewards from vault to user
    let cpi_accounts = Transfer {
        from: ctx.accounts.reward_vault.to_account_info(),
        to: ctx.accounts.user_reward_account.to_account_info(),
        authority: pool.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, rewards)?;

    user_stake.reward_debt = 0;
    user_stake.last_stake_time = now;

    pool.last_update_time = now;

    Ok(())
}

