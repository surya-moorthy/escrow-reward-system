import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import { createAccount, createAssociatedTokenAccountInstruction, createMint, getAccount, getAssociatedTokenAddress, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SendTransactionError } from "@solana/web3.js";
import { BN } from "bn.js";
import { describe } from "mocha";

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
   let vaultAuthority: PublicKey;
  let vaultAuthorityBump: number;
  let userStakePda: PublicKey;
  let user: anchor.web3.Keypair;
  let userTokenAccount: PublicKey;
  let userStakeBump: number;
  let rewardVault: PublicKey;

  describe("initialize_pool", () => {
    before(async () => {
      admin = Keypair.generate();
      
      // Airdrop SOL to admin
      const airdropSig = await provider.connection.requestAirdrop(admin.publicKey, 2e9);
      await provider.connection.confirmTransaction(airdropSig);

      // Create mints
      stakingMint = await createMint(provider.connection, admin, admin.publicKey, null, 9);
      rewardMint = await createMint(provider.connection, admin, admin.publicKey, null, 9);
      invalidMint = Keypair.generate().publicKey;

      // Derive pool PDAs with proper bump
      [poolPda, poolBump] = await PublicKey.findProgramAddress([Buffer.from("pool")], program.programId);
      [poolVault, poolVaultBump] = await PublicKey.findProgramAddress(
        [Buffer.from("pool_vault"), poolPda.toBuffer()],
        program.programId
      );
      [fakePoolPda] = await PublicKey.findProgramAddress(
        [Buffer.from("pool-fake")],
        program.programId
      );
      
      [vaultAuthority, vaultAuthorityBump] = await PublicKey.findProgramAddress(
      [Buffer.from("vault_authority"), poolPda.toBuffer()], 
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
            poolVault,
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
          msg.includes("already in use") || 
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
            poolVault: fakePoolPda, // Use a different vault for this test
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

        console.log("Expected failure for invalid staking mint or reward mint:", err.message);

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
      // Initialize user and derive user stake PDA once
      user = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(user.publicKey, 2e9);

      // Derive user stake PDA consistently
      [userStakePda, userStakeBump] = await PublicKey.findProgramAddress(
        [Buffer.from("stake"), user.publicKey.toBuffer()],
        program.programId
      );

      // Create user token account and mint tokens
      userTokenAccount = await createAccount(provider.connection, admin, stakingMint, user.publicKey);
      await mintTo(provider.connection, admin, stakingMint, userTokenAccount, admin, 2_000_000);

      console.log("User:", user.publicKey.toBase58());
      console.log("User Stake PDA:", userStakePda.toBase58());
      console.log("User Token Account:", userTokenAccount.toBase58());
      console.log("Pool PDA:", poolPda.toBase58());
      console.log("Pool Vault:", poolVault.toBase58());
    });

    it("User can stake tokens successfully and updates accounts correctly", async () => {
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
      console.log("user stake account:", userStake);
      const pool = await program.account.poolAccount.fetch(poolPda);

      expect(userStake.stakedAmount.toNumber()).to.equal(stakeAmount);
      expect(userStake.lastStakeTime.toNumber()).to.be.greaterThan(0);
      expect(pool.totalStaked.toNumber()).to.equal(stakeAmount);
    });

    it("Fails staking with zero amount", async () => {
      // Create a new user for this test to avoid conflicts
      const testUser = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(testUser.publicKey, 2e9);

      const testUserTokenAccount = await createAccount(provider.connection, admin, stakingMint, testUser.publicKey);

      const [testUserStakePda] = await PublicKey.findProgramAddress(
        [Buffer.from("stake"), testUser.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .stakesol(new BN(0))
          .accounts({
            user: testUser.publicKey,
            userStake: testUserStakePda,
            pool: poolPda,
            userTokenAccount: testUserTokenAccount,
            poolTokenVault: poolVault,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([testUser])
          .rpc();

        throw new Error("Staking zero amount should have failed");
      } catch (err: any) {
        expect(err.toString()).to.include("InvalidAmount");
      }
    });

    it("Fails staking when user has insufficient balance", async () => {
      // Create a new user for this test
      const testUser = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(testUser.publicKey, 2e9);

      const testUserTokenAccount = await createAccount(provider.connection, admin, stakingMint, testUser.publicKey);
      // Don't mint any tokens to this account

      const [testUserStakePda] = await PublicKey.findProgramAddress(
        [Buffer.from("stake"), testUser.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .stakesol(new BN(1_000_000)) // user has zero tokens
          .accounts({
            user: testUser.publicKey,
            userStake: testUserStakePda,
            pool: poolPda,
            userTokenAccount: testUserTokenAccount,
            poolTokenVault: poolVault,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([testUser])
          .rpc();

        throw new Error("Staking should have failed due to insufficient balance");
      } catch (err: any) {
        expect(err.toString()).to.include("insufficient"); // adjust to match your program's error message
      }
    });

    it("Multiple users staking updates total staked correctly", async () => {
      const users = [anchor.web3.Keypair.generate(), anchor.web3.Keypair.generate()];
      let totalExpectedStaked = 500_000; // From first successful test

      for (const testUser of users) {
        await provider.connection.requestAirdrop(testUser.publicKey, 2e9);
        const testUserTokenAccount = await createAccount(provider.connection, admin, stakingMint, testUser.publicKey);
        await mintTo(provider.connection, admin, stakingMint, testUserTokenAccount, admin, 500_000);

        const [testUserStakePda] = await PublicKey.findProgramAddress(
          [Buffer.from("stake"), testUser.publicKey.toBuffer()],
          program.programId
        );

        await program.methods
          .stakesol(new BN(500_000))
          .accounts({
            user: testUser.publicKey,
            userStake: testUserStakePda,
            pool: poolPda,
            userTokenAccount: testUserTokenAccount,
            poolTokenVault: poolVault,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([testUser])
          .rpc();

        totalExpectedStaked += 500_000;
      }

      const pool = await program.account.poolAccount.fetch(poolPda);
      expect(pool.totalStaked.toNumber()).to.equal(totalExpectedStaked);
    });
  });

  describe("unstake instruction tests", () => {
    let unstakeUser: anchor.web3.Keypair;
    let unstakeUserStakePda: PublicKey;
    let unstakeUserTokenAccount: PublicKey;
    let vaultAuthority: PublicKey;
    let vaultAuthorityBump: number;
    const initialStakeAmount = 500_000;

    before(async () => {
      // Create a dedicated user for unstake tests
      unstakeUser = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(unstakeUser.publicKey, 2e9);

      // Derive user stake PDA consistently
      [unstakeUserStakePda] = await PublicKey.findProgramAddress(
        [Buffer.from("stake"), unstakeUser.publicKey.toBuffer()],
        program.programId
      );

      // Derive vault authority PDA (this should be the authority for the pool vault)
      [vaultAuthority, vaultAuthorityBump] = await PublicKey.findProgramAddress(
        [Buffer.from("vault_authority"), poolPda.toBuffer()],
        program.programId
      );

      // Create user token account and mint tokens
      unstakeUserTokenAccount = await createAccount(provider.connection, admin, stakingMint, unstakeUser.publicKey);
      await mintTo(provider.connection, admin, stakingMint, unstakeUserTokenAccount, admin, 1_000_000);

      // First, stake tokens so we can unstake them
      await program.methods
        .stakesol(new BN(initialStakeAmount))
        .accounts({
          user: unstakeUser.publicKey,
          userStake: unstakeUserStakePda,
          pool: poolPda,
          userTokenAccount: unstakeUserTokenAccount,
          poolTokenVault: poolVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([unstakeUser])
        .rpc();

      console.log("Unstake User:", unstakeUser.publicKey.toBase58());
      console.log("Unstake User Stake PDA:", unstakeUserStakePda.toBase58());
      console.log("Vault Authority:", vaultAuthority.toBase58());
    });

    it("User can unstake part of their staked tokens", async () => {
      const unstakeAmount = 200_000;

      // Get initial balances
      const initialUserStake = await program.account.userStakeAccount.fetch(unstakeUserStakePda);
      const initialPool = await program.account.poolAccount.fetch(poolPda);

      try {
        await program.methods
          .unstakesol(new BN(unstakeAmount))
          .accounts({
            user: unstakeUser.publicKey,
            userStake: unstakeUserStakePda,
            pool: poolPda,
            poolTokenVault: poolVault,
            // vaultAuthority: vaultAuthority, // Include this if using Option 2
            userTokenAccount: unstakeUserTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([unstakeUser])
          .rpc();

        const userStake = await program.account.userStakeAccount.fetch(unstakeUserStakePda);
        const pool = await program.account.poolAccount.fetch(poolPda);

        expect(userStake.stakedAmount.toNumber()).to.equal(initialStakeAmount - unstakeAmount);
        expect(pool.totalStaked.toNumber()).to.equal(initialPool.totalStaked.toNumber() - unstakeAmount);
      } catch (error: any) {
        console.log("Error details:", error.logs);
        throw error;
      }
    });

    it("User can unstake remaining staked amount", async () => {
      const remainingAmount = 300_000; // remaining tokens after first unstake

      // Get initial balances
      const initialPool = await program.account.poolAccount.fetch(poolPda);

      await program.methods
        .unstakesol(new BN(remainingAmount))
        .accounts({
          user: unstakeUser.publicKey,
          userStake: unstakeUserStakePda,
          pool: poolPda,
          poolTokenVault: poolVault,
          userTokenAccount: unstakeUserTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([unstakeUser])
        .rpc();

      const userStake = await program.account.userStakeAccount.fetch(unstakeUserStakePda);
      const pool = await program.account.poolAccount.fetch(poolPda);

      expect(userStake.stakedAmount.toNumber()).to.equal(0);
      expect(pool.totalStaked.toNumber()).to.equal(initialPool.totalStaked.toNumber() - remainingAmount);
    });

    it("Fails if user tries to unstake more than staked", async () => {
      try {
        await program.methods
          .unstakesol(new BN(1)) // user has 0 staked now
          .accounts({
            user: unstakeUser.publicKey,
            userStake: unstakeUserStakePda,
            pool: poolPda,
            poolTokenVault: poolVault,
            userTokenAccount: unstakeUserTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([unstakeUser])
          .rpc();
        throw new Error("Unstake should have failed but succeeded");
      } catch (err: any) {
        expect(err.toString()).to.include("InsufficientStake");
      }
    });

    it("Fails if unstaking zero tokens", async () => {
      // Create a new user with staked tokens for this test
      const testUser = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(testUser.publicKey, 2e9);

      const [testUserStakePda] = await PublicKey.findProgramAddress(
        [Buffer.from("stake"), testUser.publicKey.toBuffer()],
        program.programId
      );

      const testUserTokenAccount = await createAccount(provider.connection, admin, stakingMint, testUser.publicKey);
      await mintTo(provider.connection, admin, stakingMint, testUserTokenAccount, admin, 100_000);

      // First stake some tokens
      await program.methods
        .stakesol(new BN(100_000))
        .accounts({
          user: testUser.publicKey,
          userStake: testUserStakePda,
          pool: poolPda,
          userTokenAccount: testUserTokenAccount,
          poolTokenVault: poolVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([testUser])
        .rpc();

      // Now try to unstake zero
      try {
        await program.methods
          .unstakesol(new BN(0))
          .accounts({
            user: testUser.publicKey,
            userStake: testUserStakePda,
            pool: poolPda,
            poolTokenVault: poolVault,
            userTokenAccount: testUserTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([testUser])
          .rpc();
        throw new Error("Unstake with zero should have failed but succeeded");
      } catch (err: any) {
        expect(err.toString()).to.include("InvalidAmount");
      }
    });
  });  describe("claim_rewards instruction tests", () => {
    let rewardUser: anchor.web3.Keypair;
    let rewardUserStakePda: PublicKey;
    let rewardUserTokenAccount: PublicKey;
    let rewardUserRewardAccount: PublicKey;

    before(async () => {
      // Create reward vault with proper authority
      rewardVault = await createAccount(provider.connection, admin, rewardMint, vaultAuthority);
      await mintTo(provider.connection, admin, rewardMint, rewardVault, admin, 10_000_000);

      // Create reward user
      rewardUser = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(rewardUser.publicKey, 2e9);

      [rewardUserStakePda] = await PublicKey.findProgramAddress(
        [Buffer.from("stake"), rewardUser.publicKey.toBuffer()],
        program.programId
      );

      // Create user accounts
      rewardUserTokenAccount = await createAccount(provider.connection, admin, stakingMint, rewardUser.publicKey);
      rewardUserRewardAccount = await createAccount(provider.connection, admin, rewardMint, rewardUser.publicKey);

      // Fund and stake tokens
      await mintTo(provider.connection, admin, stakingMint, rewardUserTokenAccount, admin, 500_000);

      await program.methods
        .stakesol(new BN(500_000))
        .accounts({
          user: rewardUser.publicKey,
          userStake: rewardUserStakePda,
          pool: poolPda,
          userTokenAccount: rewardUserTokenAccount,
          poolTokenVault: poolVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([rewardUser])
        .rpc();

      console.log("Reward User:", rewardUser.publicKey.toBase58());
      console.log("Reward User Stake PDA:", rewardUserStakePda.toBase58());
      console.log("Reward Vault:", rewardVault.toBase58());
    });

    it("✅ User can claim rewards after staking", async () => {
      // Wait to accumulate rewards
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const initialRewardBalance = await getAccount(provider.connection, rewardUserRewardAccount);

      await program.methods
        .claimRewardsSol()
        .accounts({
          user: rewardUser.publicKey,
          userStake: rewardUserStakePda,
          pool: poolPda,
          rewardVault,
          userRewardAccount: rewardUserRewardAccount,
          vaultAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([rewardUser])
        .rpc();

      const finalRewardBalance = await getAccount(provider.connection, rewardUserRewardAccount);
      const rewardsClaimed = Number(finalRewardBalance.amount) - Number(initialRewardBalance.amount);

      expect(rewardsClaimed).to.be.greaterThan(0);
      console.log("Rewards claimed:", rewardsClaimed);

      const userStake = await program.account.userStakeAccount.fetch(rewardUserStakePda);
      expect(userStake.rewardDebt.toNumber()).to.equal(0);
    });

    it("❌ Should fail claiming rewards with no staked tokens", async () => {
      const noStakeUser = anchor.web3.Keypair.generate();
      await provider.connection.requestAirdrop(noStakeUser.publicKey, 2e9);

      const [noStakeUserPda] = await PublicKey.findProgramAddress(
        [Buffer.from("stake"), noStakeUser.publicKey.toBuffer()],
        program.programId
      );

      const noStakeRewardAccount = await createAccount(provider.connection, admin, rewardMint, noStakeUser.publicKey);

      try {
        await program.methods
          .claimRewardsSol()
          .accounts({
            user: noStakeUser.publicKey,
            userStake: noStakeUserPda,
            pool: poolPda,
            rewardVault,
            userRewardAccount: noStakeRewardAccount,
            vaultAuthority,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([noStakeUser])
          .rpc();

        expect.fail("Expected claim rewards to fail for user with zero stake");
      } catch (err: any) {
        expect(err.toString()).to.include("AccountNotInitialized");
      }
    });

    it("❌ Should fail with insufficient reward vault balance", async () => {
      // Create empty reward vault
      const emptyRewardVault = await createAccount(provider.connection, admin, rewardMint, vaultAuthority);

      try {
        await program.methods
          .claimRewardsSol()
          .accounts({
            user: rewardUser.publicKey,
            userStake: rewardUserStakePda,
            pool: poolPda,
            rewardVault: emptyRewardVault,
            userRewardAccount: rewardUserRewardAccount,
            vaultAuthority,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([rewardUser])
          .rpc();

        expect.fail("Expected claim rewards to fail due to insufficient vault balance");
      } catch (err: any) {
        expect(err.toString()).to.include("insufficient");
      }
    });
  });

});