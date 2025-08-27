use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Mint, Token, TokenAccount}};

use crate::state::stake::StakeAccount;

pub fn init_handler(ctx: Context<InitializeState>) -> Result<()> {
    let clock = Clock::get()?;

    let stake_account = &mut ctx.accounts.stake_account;
    stake_account.owner = ctx.accounts.signer.key();
    stake_account.staked_amount = 0;
    stake_account.claim_points = 0;
    stake_account.recent_update_time = clock.unix_timestamp;
    stake_account.bump = ctx.bumps.stake_account;
    stake_account.vault_bump = ctx.bumps.vault_authority; // ✅ use correct bump

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeState<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    // The bookkeeping PDA
    #[account(
        init,
        payer = signer,
        space = 8 + StakeAccount::INIT_SPACE,
        seeds = [b"stake", signer.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,

    // Token vault to hold user staked SPL tokens (PDA)
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = staking_mint,
        associated_token::authority = vault_authority
    )]
    pub vault_token_account: Account<'info, TokenAccount>,


    /// CHECK: PDA authority for the vault
    #[account(
        seeds = [b"vault_auth", signer.key().as_ref()],   // ✅ tie to signer
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    pub staking_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}
