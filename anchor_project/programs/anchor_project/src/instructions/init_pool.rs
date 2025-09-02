use anchor_lang::prelude::*;

use crate::StakingPool;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
         payer = admin, 
         space = 8 + StakingPool::LEN,
         seeds = [b"staking-pool",admin.key().as_ref()],
         bump)]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn init_handler(ctx: Context<Initialize>) -> Result<()> {
    let pool = &mut ctx.accounts.staking_pool;
    pool.admin = ctx.accounts.admin.key();
    pool.supported_tokens = vec![];
    Ok(())
}
