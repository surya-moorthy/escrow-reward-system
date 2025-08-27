use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::listingaccount::ListingAccount;

#[derive(Accounts)]
pub struct BuyToken<'info> {
    #[account(mut, signer)]
    pub buyer: Signer<'info>,

    #[account(mut, has_one = seller)]
    pub listing_account: Account<'info, ListingAccount>,

    /// CHECK: seller receives payment directly
    #[account(mut)]
    pub seller: AccountInfo<'info>,

    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn buy_token(ctx: Context<BuyToken>) -> Result<()> {
    let listing = &mut ctx.accounts.listing_account;

    require!(listing.active, MarketplaceError::ListingInactive);

    // Transfer payment from buyer to seller (in SOL)
    **ctx.accounts.seller.try_borrow_mut_lamports()? += listing.price;
    **ctx.accounts.buyer.try_borrow_mut_lamports()? -= listing.price;

    // Transfer token from seller to buyer
    let cpi_accounts = anchor_spl::token::Transfer {
        from: ctx.accounts.seller_token_account.to_account_info(),
        to: ctx.accounts.buyer_token_account.to_account_info(),
        authority: ctx.accounts.seller.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    anchor_spl::token::transfer(
        CpiContext::new(cpi_program, cpi_accounts),
        listing.amount,
    )?;

    // Mark listing as inactive
    listing.active = false;

    Ok(())
}

#[error_code]
pub enum MarketplaceError {
    #[msg("Listing is inactive")]
    ListingInactive,
}
