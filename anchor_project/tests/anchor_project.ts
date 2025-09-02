import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert, expect } from "chai";
import { AnchorProject } from "../target/types/anchor_project";
import * as spl from "@solana/spl-token";
import { Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";


describe("staking", () => {
  // Configure client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AnchorProject as Program<AnchorProject>;

  // Admin wallet (initializer)
  const admin = provider.wallet;

  // StakingPool PDA
  let stakingPoolPda: anchor.web3.PublicKey;
  let stakingPoolBump: number;

  before(async () => {
    [stakingPoolPda, stakingPoolBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("staking-pool"), admin.publicKey.toBuffer()],
      program.programId
    );

  });

  describe("initialize pool", async ()=> {
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
    try {
      await program.methods
        .initializePool()
        .accounts({
          staking_pool: stakingPoolPda,
          admin: fakeUser.publicKey,
          system_program: anchor.web3.SystemProgram.programId,
        })
        .signers([fakeUser])
        .rpc();

      assert.fail("Should have thrown an error but did not.");
    } catch (err: any) {
      console.log("Caught expected error:", err.message);
      expect(err.error.errorMessage).to.include("Unauthorized");
    }

  });

    it("Initialize Pool - failure (already initialized)", async () => {
    try {
      await program.methods
        .initializePool()
        .accounts({
          admin: admin.publicKey,
        })
        .rpc();

      assert.fail("Should not allow double initialization.");
    } catch (err) {
      expect(err.message).to.include("already in use");
    }
  });
  })
describe("Staking Pool - Full Flow Tests", () => {

  let admin = provider.wallet;
  let user: anchor.web3.Keypair;
  let otherMint: anchor.web3.PublicKey;

  let stakingPool: anchor.web3.PublicKey;
  let stakingPoolBump: number;

  let mint: anchor.web3.PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;

  let vaultPda: anchor.web3.PublicKey;
  let vaultBump: number;

  let userStakePda: anchor.web3.PublicKey;
  let userStakeBump: number;

  beforeEach(async () => {
    user = anchor.web3.Keypair.generate();

    // Fund user for transactions
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );

    // 1️⃣ Initialize staking pool
    [stakingPool, stakingPoolBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("staking-pool"), admin.publicKey.toBuffer()],
      program.programId
    );


    // 2️⃣ Create mint (custom token)
    mint = await spl.createMint(
      provider.connection,
      admin.payer,
      admin.publicKey,
      null,
      9
    );

    // 3️⃣ Create user token account and mint tokens
    userTokenAccount = (await spl.getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin.payer,
      mint,
      user.publicKey
    )).address;

    await spl.mintTo(
      provider.connection,
      admin.payer,
      mint,
      userTokenAccount,
      admin.publicKey,
      1000
    );

    // 4️⃣ Create vault PDA
    [vaultPda, vaultBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("vault"), stakingPool.toBuffer(), mint.toBuffer()],
      program.programId
    );

    // 5️⃣ Derive userStake PDA
    [userStakePda, userStakeBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("user-stake"), user.publicKey.toBuffer(), mint.toBuffer()],
      program.programId
    );
  });

  it("❌ should fail staking before adding token", async () => {
    try {
      await program.methods
        .stakeToken(new anchor.BN(100))
        .accounts({
          stakingPool,
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
      .addSupportedToken(new anchor.BN(10))
      .accounts({
        stakingPool,
        admin: admin.publicKey,
        mint: mint,
        vault: vaultPda,
      })
      .rpc();

    // Stake tokens
    await program.methods
      .stakeToken(new anchor.BN(100))
      .accounts({
        stakingPool,
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
    const pool = await program.account.stakingPool.fetch(stakingPool);
    const tokenInfo = pool.supportedTokens.find(t => t.mint.equals(mint));
    assert.equal(tokenInfo.totalStaked.toNumber(), 100);
  });

  it("❌ should fail if staking 0 amount", async () => {
    try {
      await program.methods
        .stakeToken(new anchor.BN(0))
        .accounts({
          stakingPool,
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

    try {
      await program.methods
        .stakeToken(new anchor.BN(50))
        .accounts({
          stakingPool,
          userStake: userStakePda,
          staker: user.publicKey,
          stakerTokenAccount: userTokenAccount,
          vault: vaultPda,
          mint: otherMint,
          tokenProgram: spl.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user])
        .rpc();
      assert.fail("Expected UnsupportedToken error");
    } catch (err: any) {
      assert.equal(err.error.errorCode.code, "UnsupportedToken");
    }
  });

  it("❌ should fail if staking more than balance", async () => {
    try {
      await program.methods
        .stakeToken(new anchor.BN(999999))
        .accounts({
          stakingPool,
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
});