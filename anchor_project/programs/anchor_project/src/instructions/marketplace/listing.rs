use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};

use crate::listingaccount::ListingAccount;

#[derive(Accounts)]
pub struct ListToken<'info> {
    #[account(mut, signer)]
    pub seller: Signer<'info>,

    #[account(
        init,
        payer = seller,
        space = 8 + 32 + 32 + 8 + 8 + 1, // ListingAccount size
        seeds = [b"listing", seller.key().as_ref(), token_mint.key().as_ref()],
        bump
    )]
    pub listing_account: Account<'info, ListingAccount>,

    pub token_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn list_token(
    ctx: Context<ListToken>,
    amount: u64,
    price: u64,
) -> Result<()> {
    let listing = &mut ctx.accounts.listing_account;
    listing.seller = ctx.accounts.seller.key();
    listing.token_mint = ctx.accounts.token_mint.key();
    listing.amount = amount;
    listing.price = price;
    listing.active = true;

    Ok(())
}
