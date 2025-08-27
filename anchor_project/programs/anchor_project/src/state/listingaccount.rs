use anchor_lang::prelude::*;


#[account]
pub struct ListingAccount {
    pub seller: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub price: u64,
    pub active: bool,
}
