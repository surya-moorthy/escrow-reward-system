import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert, expect } from "chai";
import { AnchorProject } from "../target/types/anchor_project";
import * as spl from "@solana/spl-token";
import { Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.AnchorProject as Program<AnchorProject>;

async function getTokenBalance(tokenAccount: anchor.web3.PublicKey): Promise<anchor.BN> {
  const accountInfo = await program.provider.connection.getAccountInfo(tokenAccount);
  if (!accountInfo) throw new Error(`Token account ${tokenAccount.toBase58()} does not exist`);
  const account = await program.provider.connection.getTokenAccountBalance(tokenAccount);
  return new anchor.BN(account.value.amount);
}

describe("staking", () => {
  // Admin wallet (initializer)
  const admin = provider.wallet;

  // StakingPool PDA
  let stakingPoolPda: anchor.web3.PublicKey;
  let stakingPoolBump: number;

  let mint: anchor.web3.PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;

  let vaultPda: anchor.web3.PublicKey;
  let vaultBump: number;
  let user: anchor.web3.Keypair;

  let userStakePda: anchor.web3.PublicKey;
  let userStakeBump: number;

  let otherMint: anchor.web3.PublicKey;

  beforeEach(async () => {
    // ----------------------------
    // 1️⃣ Create user keypair
    // ----------------------------
    user = anchor.web3.Keypair.generate();

    // Fund user with SOL for transactions
    const airdropSig = await provider.connection.requestAirdrop(
      user.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    // ----------------------------
    // 2️⃣ Derive staking pool PDA
    // ----------------------------
    [stakingPoolPda, stakingPoolBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("staking-pool"), admin.publicKey.toBuffer()],
      program.programId
    );

    // ----------------------------
    // 3️⃣ Create custom mint
    // ----------------------------
    mint = await spl.createMint(
      provider.connection,
      admin.payer,       // payer
      admin.publicKey,   // mint authority
      null,              // freeze authority
      9                  // decimals
    );

    // ----------------------------
    // 4️⃣ Create user token account and mint tokens
    // ----------------------------
    const userTokenAcc = await spl.getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin.payer,
      mint,
      user.publicKey
    );
    userTokenAccount = userTokenAcc.address;

    // Mint tokens to user
    await spl.mintTo(
      provider.connection,
      admin.payer,
      mint,
      userTokenAccount,
      admin.publicKey,
      1000
    );

    // ----------------------------
    // 5️⃣ Create vault PDA (escrow) - FIXED: Use correct seeds
    // ----------------------------
    [vaultPda, vaultBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("vault"), stakingPoolPda.toBuffer(), mint.toBuffer()],
      program.programId
    );

    // ----------------------------
    // 6️⃣ Derive userStake PDA
    // ----------------------------
    [userStakePda, userStakeBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("user-stake"), user.publicKey.toBuffer(), mint.toBuffer()],
      program.programId
    );
  });

  before(async () => {
    [stakingPoolPda, stakingPoolBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("staking-pool"), admin.publicKey.toBuffer()],
      program.programId
    );
  });

  describe("initialize pool", async () => {
    it("Initialize Pool - success", async () => {
      await program.methods
        .initializePool()
        .accounts({
          staking_pool: stakingPoolPda,
          admin: admin.publicKey,
          system_program: anchor.web3.SystemProgram.programId,
        })
        .signers([admin.payer])
        .rpc();

      const pool = await program.account.stakingPool.fetch(stakingPoolPda);

      assert.ok(pool.admin.equals(admin.publicKey));
      assert.equal(pool.supportedTokens.length, 0);
    });

    it("Initialize Pool - failure (wrong signer)", async () => {
      // Create a random wallet
      const fakeUser = anchor.web3.Keypair.generate();

      // Airdrop some SOL to pay rent
      const sig = await provider.connection.requestAirdrop(fakeUser.publicKey, 1_000_000_000);
      await provider.connection.confirmTransaction(sig);

       let [fakestakingPoolPda, stakingPoolBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("staking-pool"), admin.publicKey.toBuffer()],
      program.programId
    );

      try {
        // Try to initialize with fake user but admin's PDA - this should fail
         await program.methods
          .initializePool()
          .accounts({
            stakingPool: fakestakingPoolPda, // Admin's PDA but fake user signing
            admin: fakeUser.publicKey,    // Wrong admin
            system_program: anchor.web3.SystemProgram.programId,
          })
          .signers([fakeUser])
          .rpc();

        assert.fail("Should have thrown an error but did not.");
      } catch (err: any) {
        // The error should be about seeds constraint or unauthorized access
        const errorMessage = err.toString();
        const hasExpectedError = errorMessage.includes("ConstraintSeeds") || 
                                errorMessage.includes("Unauthorized") ||
                                errorMessage.includes("seeds constraint");
        expect(hasExpectedError).to.be.true;
      }
    });

    it("Initialize Pool - failure (already initialized)", async () => {
      try {
        await program.methods
          .initializePool()
          .accounts({
            staking_pool: stakingPoolPda,
            admin: admin.publicKey,
            system_program: anchor.web3.SystemProgram.programId,
          })
          .signers([admin.payer])
          .rpc();

        assert.fail("Should not allow double initialization.");
      } catch (err: any) {
        expect(err.message).to.include("already in use");
      }
    });
  });

  describe("Staking Pool - Full Flow Tests", () => {
    beforeEach(async () => {
      [stakingPoolPda, stakingPoolBump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("staking-pool"), admin.publicKey.toBuffer()],
        program.programId
      );
    });

    it("❌ should fail staking before adding token", async () => {
      try {
        await program.methods
          .stakeToken(new anchor.BN(100))
          .accounts({
            stakingPool: stakingPoolPda,
            userStake: userStakePda,
            staker: user.publicKey,
            stakerTokenAccount: userTokenAccount,
            vault: vaultPda,
            mint: mint,
            tokenProgram: spl.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([user])
          .rpc();
        assert.fail("Expected UnsupportedToken error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("UnsupportedToken");
      }
    });

    it("✅ should add supported token and stake successfully", async () => {
      // Add token
      await program.methods
        .addSupportedToken(new anchor.BN(10), vaultBump)  // <-- pass bump
        .accounts({
          stakingPool: stakingPoolPda,
          admin: admin.publicKey,
          mint: mint,
          vault: vaultPda,
        })
        .rpc();

      // Stake tokens
      await program.methods
        .stakeToken(new anchor.BN(100))
        .accounts({
          stakingPool: stakingPoolPda,
          userStake: userStakePda,
          staker: user.publicKey,
          stakerTokenAccount: userTokenAccount,
          vault: vaultPda,
          mint: mint,
          tokenProgram: spl.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user])
        .rpc();

      // Verify user stake
      const userStake = await program.account.userStakeAccount.fetch(userStakePda);
      assert.equal(userStake.amount.toNumber(), 100);

      // Verify total staked in pool
      const pool = await program.account.stakingPool.fetch(stakingPoolPda);
      const tokenInfo = pool.supportedTokens.find(t => t.mint.equals(mint));
      assert.equal(tokenInfo.totalStaked.toNumber(), 100);
    });

    it("❌ should fail if staking 0 amount", async () => {
      try {
        await program.methods
          .stakeToken(new anchor.BN(0))
          .accounts({
            stakingPool: stakingPoolPda,
            userStake: userStakePda,
            staker: user.publicKey,
            stakerTokenAccount: userTokenAccount,
            vault: vaultPda,
            mint: mint,
            tokenProgram: spl.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([user])
          .rpc();
        assert.fail("Expected InvalidAmount error");
      } catch (err: any) {
        assert.equal(err.error.errorCode.code, "InvalidAmount");
      }
    });

    it("❌ should fail if staking unsupported token", async () => {
      // Create another mint
      otherMint = await spl.createMint(
        provider.connection,
        admin.payer,
        admin.publicKey,
        null,
        9
      );

      // Create user token account for the other mint and mint some tokens
      const userOtherTokenAcc = await spl.getOrCreateAssociatedTokenAccount(
        provider.connection,
        admin.payer,
        otherMint,
        user.publicKey
      );

      // Mint tokens to user for the other mint
      await spl.mintTo(
        provider.connection,
        admin.payer,
        otherMint,
        userOtherTokenAcc.address,
        admin.publicKey,
        1000
      );

      // Derive correct vault and userStake PDAs for the other mint
      const [otherVaultPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("vault"), stakingPoolPda.toBuffer(), otherMint.toBuffer()],
        program.programId
      );

      const [otherUserStakePda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("user-stake"), user.publicKey.toBuffer(), otherMint.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .stakeToken(new anchor.BN(50))
          .accounts({
            stakingPool: stakingPoolPda,
            userStake: otherUserStakePda, // Use correct PDA
            staker: user.publicKey,
            stakerTokenAccount: userOtherTokenAcc.address, // Use correct token account
            vault: otherVaultPda, // Use correct vault PDA
            mint: otherMint, // Use the other mint
            tokenProgram: spl.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([user])
          .rpc();
        assert.fail("Expected UnsupportedToken error");
      } catch (err: any) {
        // The error might be UnsupportedToken or related to the token not being added
        if (err.error && err.error.errorCode && err.error.errorCode.code) {
          expect(err.error.errorCode.code).to.equal("UnsupportedToken");
        } else {
          // If it's a different error structure, check the message
          const errorMessage = err.toString();
          const hasUnsupportedTokenError = errorMessage.includes("UnsupportedToken");
          expect(hasUnsupportedTokenError).to.be.true;
        }
      }
    });

    it("❌ should fail if staking more than balance", async () => {
      try {
        await program.methods
          .stakeToken(new anchor.BN(999999))
          .accounts({
            stakingPool: stakingPoolPda,
            userStake: userStakePda,
            staker: user.publicKey,
            stakerTokenAccount: userTokenAccount,
            vault: vaultPda,
            mint: mint,
            tokenProgram: spl.TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([user])
          .rpc();
        assert.fail("Expected InsufficientBalance error");
      } catch (err: any) {
        assert.equal(err.error.errorCode.code, "InsufficientBalance");
      }
    });
  });

  describe("unstake tests", () => {
  const stakeAmount = new anchor.BN(100);
  const unstakeAmount = new anchor.BN(50);
  const failUnstakeAmount = new anchor.BN(200); // More than staked

  beforeEach(async () => {
    // Add supported token first
    await program.methods
      .addSupportedToken(new anchor.BN(10), vaultBump)
      .accounts({
        stakingPool: stakingPoolPda,
        admin: admin.publicKey,
        mint: mint,
        vault: vaultPda, // Use the PDA vault, not ATA
      })
      .rpc();

    // The vault should already be created as a PDA in your addSupportedToken function
    // No need to create an ATA here
  });

  it("✅ should unstake partial amount successfully", async () => {
    // 1️⃣ Stake first
    await program.methods
      .stakeToken(stakeAmount)
      .accounts({
        stakingPool: stakingPoolPda,
        userStake: userStakePda,
        staker: user.publicKey,
        stakerTokenAccount: userTokenAccount,
        vault: vaultPda, // Use PDA vault
        mint: mint,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // 2️⃣ Get balances before unstaking
    const userBalanceBefore = await getTokenBalance(userTokenAccount);
    const vaultBalanceBefore = await getTokenBalance(vaultPda); // Use PDA vault

    // 3️⃣ Unstake
    await program.methods
      .unstake(unstakeAmount)
      .accounts({
        stakingPool: stakingPoolPda,
        userStake: userStakePda,
        staker: user.publicKey,
        stakerTokenAccount: userTokenAccount,
        vault: vaultPda, // Use PDA vault, not ATA
        mint: mint,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    // 4️⃣ Get balances after unstaking
    const userBalanceAfter = await getTokenBalance(userTokenAccount);
    const vaultBalanceAfter = await getTokenBalance(vaultPda); // Use PDA vault

    // 5️⃣ Assertions with BN
    assert(userBalanceAfter.eq(userBalanceBefore.add(unstakeAmount)));
    assert(vaultBalanceAfter.eq(vaultBalanceBefore.sub(unstakeAmount)));
  });

  it("❌ should fail when unstaking more than staked", async () => {
    // First stake some tokens
    await program.methods
      .stakeToken(stakeAmount)
      .accounts({
        stakingPool: stakingPoolPda,
        userStake: userStakePda,
        staker: user.publicKey,
        stakerTokenAccount: userTokenAccount,
        vault: vaultPda, // Use PDA vault
        mint: mint,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    try {
      await program.methods
        .unstake(failUnstakeAmount)
        .accounts({
          stakingPool: stakingPoolPda,
          userStake: userStakePda,
          staker: user.publicKey,
          stakerTokenAccount: userTokenAccount,
          vault: vaultPda, // Use PDA vault
          mint: mint,
          tokenProgram: spl.TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      assert.fail("Expected failure due to insufficient stake");
    } catch (err: any) {
      // Check for the correct error code
      if (err.error && err.error.errorCode && err.error.errorCode.code) {
        expect(err.error.errorCode.code).to.equal("InsufficientStake");
      } else {
        // Fallback to string matching if error structure is different
        const errorMessage = err.toString();
        const hasInsufficientStakeError = errorMessage.includes("InsufficientStake");
        expect(hasInsufficientStakeError).to.be.true;
      }
    }
  });
});
});