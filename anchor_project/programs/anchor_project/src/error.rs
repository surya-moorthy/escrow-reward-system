use anchor_lang::prelude::*;


#[error_code]
pub enum CustomError {
    #[msg("Amount must be greater than 0")]
    InvalidAmount,
    #[msg("Insufficient staked amount")]
    InsufficientStake,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Arithmetic underflow")]
    Underflow,
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    #[msg("Stake is locked")]
    StakeLocked,
    #[msg("Given time is invalid")]
    InvalidTime
}