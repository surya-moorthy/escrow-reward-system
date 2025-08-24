use anchor_lang::prelude::*;

use crate::{error::StakeError, pool::Pool, state::stake::StakeAccount};

#[constant]
pub const SEED: &str = "anchor";
#[constant]
const POINTS_PER_SOL_PER_DAY: u64 = 1_000_000; // Using micro-points for precision
#[constant]
const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
#[constant]
const SECONDS_PER_DAY: u64 = 86_400;

pub fn update_points(pda_account: &mut StakeAccount, current_time: i64) -> Result<()> {
    let time_elapsed = current_time.checked_sub(pda_account.recent_update_time)
        .ok_or(StakeError::InvalidTimestamp)? as u64;
    
    if time_elapsed > 0 && pda_account.staked_amount > 0 {
        let new_points = calculate_points_earned(pda_account.staked_amount, time_elapsed)?;
        pda_account.claim_points = pda_account.claim_points.checked_add(new_points)
            .ok_or(StakeError::Overflow)?;
    }
    
    pda_account.recent_update_time = current_time;
    Ok(())
}

pub fn calculate_points_earned(staked_amount: u64, time_elapsed_seconds: u64) -> Result<u64> {
    // Points = (staked_amount_in_sol * time_in_days * points_per_sol_per_day)
    // Using micro-points for precision to avoid floating point
    let points = (staked_amount as u128)
        .checked_mul(time_elapsed_seconds as u128)
        .ok_or(StakeError::Overflow)?
        .checked_mul(POINTS_PER_SOL_PER_DAY as u128)
        .ok_or(StakeError::Overflow)?
        .checked_div(LAMPORTS_PER_SOL as u128)
        .ok_or(StakeError::Overflow)?
        .checked_div(SECONDS_PER_DAY as u128)
        .ok_or(StakeError::Overflow)?;
    
    Ok(points as u64)
}

pub fn calculate_reward(
    staked_amount: u64,
    stake_account: &mut StakeAccount,
    current_time: i64,
    pool: &Pool,
) -> Result<u64> {
    // Ensure time is valid
    require!(current_time >= stake_account.recent_update_time, StakeError::InvalidTime);

    let time_diff = current_time - stake_account.recent_update_time;
    if time_diff == 0 || staked_amount == 0 {
        return Ok(0);
    }

    // reward = staked_amount * time_diff * reward_rate
    let reward = (staked_amount as u128)
        .checked_mul(time_diff as u128)
        .and_then(|v| v.checked_mul(pool.reward_rate as u128))
        .ok_or(StakeError::Overflow)?;

    // Update last updated time
    stake_account.recent_update_time = current_time;

    // Accumulate points in stake account
    stake_account.claim_points = stake_account.claim_points
        .checked_add(reward as u64)
        .ok_or(StakeError::Overflow)?;

    Ok(reward as u64)
}
