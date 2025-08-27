use anchor_lang::prelude::*;

use crate::{buy_token::MarketplaceError, listingaccount::ListingAccount};

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(mut, signer)]
    pub seller: Signer<'info>,

    #[account(mut)]
    pub listing_account: Account<'info, ListingAccount>,
}

pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
    let listing = &mut ctx.accounts.listing_account;
    require!(listing.active, MarketplaceError::ListingInactive);

    listing.active = false; // mark inactive
    Ok(())
}
