use anchor_lang::prelude::*;

#[error_code]
pub enum CustomError {
    #[msg("Staking pool does not support this token")]
    UnsupportedToken,

    #[msg("Invalid vault account")]
    InvalidVault,

    #[msg("Insufficient token balance to stake")]
    InsufficientBalance,

    #[msg("Staking amount must be greater than zero")]
    InvalidAmount,

    #[msg("Numerical overflow occurred")]
    NumericalOverflow,

    #[msg("Token Already initialized")]
    TokenAlreadySupported,
    #[msg("over the limit")]
    Overflow
}
