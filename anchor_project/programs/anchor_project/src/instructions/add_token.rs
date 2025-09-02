use anchor_lang::prelude::*;
use crate::{ errors::errors::CustomError, StakingPool, SupportedToken};

#[derive(Accounts)]
pub struct AddSupportedToken<'info> {
    #[account(mut, has_one = admin)]
    pub staking_pool: Account<'info, StakingPool>,

    /// CHECK: The mint account of the token being added
    pub mint: AccountInfo<'info>,

    /// CHECK: The vault PDA token account to hold staked tokens
    pub vault: AccountInfo<'info>,

    pub admin: Signer<'info>,
}

pub fn add_supported_token_handler(
    ctx: Context<AddSupportedToken>,
    reward_rate: u64,
) -> Result<()> {
    let pool = &mut ctx.accounts.staking_pool;

    let mint = ctx.accounts.mint.key();
    let vault = ctx.accounts.vault.key();

    // Check if token is already supported
    require!(
        !pool.supported_tokens.iter().any(|t| t.mint == mint),
        CustomError::TokenAlreadySupported
    );

    // Add the new token to the pool
    pool.supported_tokens.push(SupportedToken {
        mint,
        vault,
        reward_rate,
        total_staked: 0,
    });

    Ok(())
}
