import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import { createAccount, createMint, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SendTransactionError } from "@solana/web3.js";

import { BN } from "bn.js";

describe("staking_program - initialize_pool", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.AnchorProject;

  let admin: Keypair;
  let stakingMint: PublicKey;
  let rewardMint: PublicKey;
  let poolPda: PublicKey;
  let invalidMint: PublicKey;
  let fakePoolPda: PublicKey;
  let poolVaultBump: number;
  let poolVault: PublicKey;
   let poolBump: number;

  describe("initialize_pool", ()=> {

  before(async () => {
    admin = Keypair.generate();
    
    // Airdrop SOL to admin
    const airdropSig = await provider.connection.requestAirdrop(admin.publicKey, 2e9);
    await provider.connection.confirmTransaction(airdropSig);

    // Create mints
    stakingMint = await createMint(provider.connection, admin, admin.publicKey, null, 9);
    rewardMint = await createMint(provider.connection, admin, admin.publicKey, null, 9);
    invalidMint = Keypair.generate().publicKey;

    // Derive pool PDAs
    [poolPda] = await PublicKey.findProgramAddress([Buffer.from("pool")], program.programId);
    [fakePoolPda] = await PublicKey.findProgramAddress(
      [Buffer.from("pool-fake")],
      program.programId
    );
  });

  it("✅ Should create a pool successfully", async () => {
    await program.methods
      .initialize(new BN(10))
      .accounts({
        admin: admin.publicKey,
        pool: poolPda,
        poolVault,
        stakingMint,
        rewardMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })

      .signers([admin])
      .rpc();

    const poolAccount = await program.account.poolAccount.fetch(poolPda);
    expect(poolAccount.rewardRate.toNumber()).to.equal(10);
    expect(poolAccount.stakingMint.toBase58()).to.equal(stakingMint.toBase58());
    expect(poolAccount.rewardMint.toBase58()).to.equal(rewardMint.toBase58());
  });

  it("❌ Should fail if pool PDA already exists", async () => {
    try {
      await program.methods
        .initialize(new BN(10))
        .accounts({
          admin: admin.publicKey,
          pool: poolPda, // same PDA
          stakingMint,
          rewardMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([admin])
        .rpc();
      
      // If we reach here, the test should fail
      expect.fail("Expected transaction to fail but it succeeded");
    } catch (err: any) {
      console.log("Expected failure:", err.error?.errorMessage ?? err.message);
      // Check for common Solana account already exists errors
      expect(err.message).to.satisfy((msg: string) => 
        msg.includes("alreacdy in use") || 
        msg.includes("custom program error: 0x0") ||
        msg.includes("AccountAlreadyInUse")
      );
    }
  });

it("❌ Should fail if staking mint or reward mint is invalid", async () => {
  try {
    await program.methods
      .initialize(new BN(10))
      .accounts({
        admin: admin.publicKey,
        pool: fakePoolPda,
        stakingMint: invalidMint, // invalid mint
        rewardMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([admin])
      .rpc();

    expect.fail("Expected transaction to fail with invalid mint");
  } catch (err: any) {
    // Print logs for debugging
    if ("logs" in err) {
      console.log("Transaction logs:", err.logs);
    }

    console.log("Expected failure for invalid staking mint or or reward mint:", err.message);

    // Update assertion to include AccountNotInitialized
    expect(err.message).to.satisfy((msg: string) =>
      msg.includes("Invalid account") ||
      msg.includes("Account does not exist") ||
      msg.includes("AccountNotFound") ||
      msg.includes("InvalidAccountData") ||
      msg.includes("AccountNotInitialized")
    );
  }
});
});



describe("stake instruction tests", () => {
 
  before(async () => {
    // Generate admin Keypair and fund
     const airdropSig = await provider.connection.requestAirdrop(admin.publicKey, 2e9);
     await provider.connection.confirmTransaction(airdropSig, "confirmed");


    // Derive pool PDA and vault PDA
    [poolPda, poolBump] = await PublicKey.findProgramAddress([Buffer.from("pool")], program.programId);
    [poolVault, poolVaultBump] = await PublicKey.findProgramAddress(
      [Buffer.from("pool_vault"), poolPda.toBuffer()],
      program.programId
    );
  });

  it("User can stake tokens successfully and updates accounts correctly", async () => {
    const user = anchor.web3.Keypair.generate();
    await provider.connection.requestAirdrop(user.publicKey, 2e9);

    const userTokenAccount = await createAccount(provider.connection, admin, stakingMint, user.publicKey);
    await mintTo(provider.connection, admin, stakingMint, userTokenAccount, admin, 1_000_000);

    const [userStakePda] = await PublicKey.findProgramAddress(
      [Buffer.from("stake"), user.publicKey.toBuffer()],
      program.programId
    );

    const stakeAmount = 500_000;

    await program.methods
      .stakesol(new BN(stakeAmount))
      .accounts({
        user: user.publicKey,
        userStake: userStakePda,
        pool: poolPda,
        userTokenAccount,
        poolTokenVault: poolVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([user])
      .rpc();

    const userStake = await program.account.userStakeAccount.fetch(userStakePda);
    const pool = await program.account.poolAccount.fetch(poolPda);

    expect(userStake.stakedAmount.toNumber()).to.equal(stakeAmount);
    expect(userStake.lastStakeTime.toNumber()).to.be.greaterThan(0);
    expect(pool.totalStaked.toNumber()).to.equal(stakeAmount);
  });

  it("Fails staking with zero amount", async () => {
    const user = anchor.web3.Keypair.generate();
    await provider.connection.requestAirdrop(user.publicKey, 2e9);

    const userTokenAccount = await createAccount(provider.connection, admin, stakingMint, user.publicKey);

    const [userStakePda] = await PublicKey.findProgramAddress(
      [Buffer.from("stake"), user.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .stakesol(new BN(0))
        .accounts({
          user: user.publicKey,
          userStake: userStakePda,
          pool: poolPda,
          userTokenAccount,
          poolTokenVault: poolVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user])
        .rpc();

      throw new Error("Staking zero amount should have failed");
    } catch (err: any) {
      expect(err.toString()).to.include("InvalidAmount");
    }
  });

  it("Fails staking when user has insufficient balance", async () => {
    const user = anchor.web3.Keypair.generate();
    await provider.connection.requestAirdrop(user.publicKey, 2e9);

    const userTokenAccount = await createAccount(provider.connection, admin, stakingMint, user.publicKey);

    const [userStakePda] = await PublicKey.findProgramAddress(
      [Buffer.from("stake"), user.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .stakesol(new BN(1_000_000)) // user has zero tokens
        .accounts({
          user: user.publicKey,
          userStake: userStakePda,
          pool: poolPda,
          userTokenAccount,
          poolTokenVault: poolVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user])
        .rpc();

      throw new Error("Staking should have failed due to insufficient balance");
    } catch (err: any) {
      expect(err.toString()).to.include("insufficient"); // adjust to match your program's error message
    }
  });

  it("Multiple users staking updates total staked correctly", async () => {
    const users = [anchor.web3.Keypair.generate(), anchor.web3.Keypair.generate()];

    for (const user of users) {
      await provider.connection.requestAirdrop(user.publicKey, 2e9);
      const userTokenAccount = await createAccount(provider.connection, admin, stakingMint, user.publicKey);
      await mintTo(provider.connection, admin, stakingMint, userTokenAccount, admin, 500_000);

      const [userStakePda] = await PublicKey.findProgramAddress(
        [Buffer.from("stake"), user.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .stakesol(new BN(500_000))
        .accounts({
          user: user.publicKey,
          userStake: userStakePda,
          pool: poolPda,
          userTokenAccount,
          poolTokenVault: poolVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user])
        .rpc();
    }

    const pool = await program.account.poolAccount.fetch(poolPda);

    // 1 user from first successful test + 2 more users
    expect(pool.totalStaked.toNumber()).to.equal(500_000 * 3);
  });
});
});

