import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert, expect } from "chai";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createAccount, createInitializeAccountInstruction, createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { AnchorProject } from "../target/types/anchor_project"; // update name

describe("staking program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.AnchorProject as Program<AnchorProject>;
  const wallet = provider.wallet as anchor.Wallet;

  let stakingMint: anchor.web3.PublicKey;
  let wrongMint: anchor.web3.PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;
  let stakeAccountPda: anchor.web3.PublicKey;
  let vaultTokenPda: anchor.web3.PublicKey;

  // -----------------------
  // 1. Initialize
  // -----------------------
  describe("initialize", () => {
    before(async () => {
      // Create staking token mint
      stakingMint = await createMint(
        provider.connection,
        wallet.payer,
        wallet.publicKey,
        null,
        9
      );

      wrongMint = await createMint(
        provider.connection,
        wallet.payer,
        wallet.publicKey,
        null,
        9
      );
    });

    it("works with valid user", async () => {
      [stakeAccountPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), wallet.publicKey.toBuffer()],
        program.programId
      );
      [vaultTokenPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), wallet.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initialize()
        .accounts({
          signer: wallet.publicKey,
          stakingMint,
        })
        .rpc();

      const stakeAccount = await program.account.stakeAccount.fetch(stakeAccountPda);
      assert.ok(stakeAccount.owner.equals(wallet.publicKey));
      assert.equal(stakeAccount.stakedAmount.toNumber(), 0);
    });

    it("fails if called twice with same seeds", async () => {
      try {
        await program.methods
          .initialize()
          .accounts({
            signer: wallet.publicKey,
            stakingMint,
          })
          .rpc();
        assert.fail("Expected an error but transaction succeeded");
      } catch (err) {
        expect(err.toString()).to.include("already in use");
      }
    });

    it("fails if user signer is not provided", async () => {
      const fakeUser = anchor.web3.Keypair.generate();
      try {
        await program.methods
          .initialize()
          .accounts({
            signer: fakeUser.publicKey,
            stakingMint,
          })
          .rpc();
        assert.fail("Expected signer missing error");
      } catch (err) {
        expect(err.toString()).to.include("Signature verification failed");
      }
    });

    it("fails if stake mint does not match", async () => {
      try {
        await program.methods
          .initialize()
          .accounts({
            signer: wallet.publicKey,
            stakingMint: wrongMint,
           
          })
          .rpc();
        assert.fail("Expected mint mismatch error");
      } catch (err) {
        expect(err.toString()).to.satisfy((msg: string) =>
          msg.includes("ConstraintTokenMint") ||
          msg.includes("ConstraintSeeds") ||
          msg.includes("Simulation failed")
        );
      }
    });

  // -----------------------
  // 2. Stake Flow
  // -----------------------
  describe("stake the token", () => {
    before(async () => {
      // Mint some tokens to user ATA
      userTokenAccount = (
        await getOrCreateAssociatedTokenAccount(
          provider.connection,
          wallet.payer,
          stakingMint,
          wallet.publicKey
        )
      ).address;

      await mintTo(
        provider.connection,
        wallet.payer,
        stakingMint,
        userTokenAccount,
        wallet.publicKey,
        1_000_000_000 // 1000 tokens
      );
    });

    it("succeeds when user has enough tokens", async () => {
      await program.methods
        .depositSol(new anchor.BN(100_000_000)) // 100 tokens
        .accounts({
           owner: wallet.publicKey,
            userTokenAccount,
            stakingMint,
        })
        .rpc();

      const stakeAccount = await program.account.stakeAccount.fetch(stakeAccountPda);
      expect(stakeAccount.stakedAmount.toNumber()).to.equal(100_000_000);
    });

    it("fails if amount = 0", async () => {
      try {
        await program.methods
          .depositSol(new anchor.BN(0))
          .accounts({
             owner: wallet.publicKey,
            userTokenAccount,
            stakingMint,
          })
          .rpc();
        expect.fail("Should have thrown InvalidAmount error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InvalidAmount");
      }
    });

    it("fails if user doesn’t have enough balance", async () => {
      try {
        await program.methods
          .depositSol(new anchor.BN(10_000_000_000)) // too much
          .accounts({
            owner: wallet.publicKey,
            userTokenAccount,
            stakingMint,
          })
          .rpc();
        expect.fail("Should have failed with insufficient funds");
      } catch (err: any) {
        expect(err.logs.join()).to.include("insufficient funds");
      }
    });

    it("updates staked_amount and recent_update_time", async () => {
      await program.methods
        .depositSol(new anchor.BN(50_000_000))
        .accounts({
           owner: wallet.publicKey,
            userTokenAccount,
            stakingMint,
        })
        .rpc();

      const stakeAccount = await program.account.stakeAccount.fetch(stakeAccountPda);
      expect(stakeAccount.stakedAmount.toNumber()).to.be.greaterThan(0);
      expect(stakeAccount.recentUpdateTime.toNumber()).to.be.greaterThan(0);
    });

    it("multiple stakes add up correctly", async () => {
      const before = await program.account.stakeAccount.fetch(stakeAccountPda);
      const beforeAmount = before.stakedAmount.toNumber();

      await program.methods
        .depositSol(new anchor.BN(25_000_000))
        .accounts({

         owner: wallet.publicKey,
            userTokenAccount,
            stakingMint,
        })
        .rpc();

      const after = await program.account.stakeAccount.fetch(stakeAccountPda);
      expect(after.stakedAmount.toNumber()).to.equal(beforeAmount + 25_000_000);
    });
  });  // -------------------------------
  // Reward accrual
  // -------------------------------
  describe("reward accrual", () => {
    it("rewards increase over time", async () => {
      await program.methods
        .depositSol(new anchor.BN(100_000_000))
        .accounts({
          owner: wallet.publicKey,
          stakingMint,
 
        })
        .rpc();

      const acc1 = await program.account.stakeAccount.fetch(stakeAccountPda);
      const beforePoints = acc1.claimPoints.toNumber();

      // Wait for some time
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Trigger update via a small unstake
      await program.methods
        .unstakeSol(new anchor.BN(1))
        .accounts({
          owner: wallet.publicKey,
          userTokenAccount,
 
        })
        .rpc();

      const acc2 = await program.account.stakeAccount.fetch(stakeAccountPda);
      expect(acc2.claimPoints.toNumber()).to.be.greaterThan(beforePoints);
    });

    it("no rewards if no tokens staked", async () => {
      const fakeUser = anchor.web3.Keypair.generate();
      const [fakeStake] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), fakeUser.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initialize()
        .accounts({
          signer: fakeUser.publicKey,
          stakingMint,
        })
        .signers([fakeUser])
        .rpc();

      const acc = await program.account.stakeAccount.fetch(fakeStake);
      expect(acc.claimPoints.toNumber()).to.equal(0);
    });

    it("accumulates across multiple staking periods", async () => {
      await program.methods
        .depositSol(new anchor.BN(50_000_000))
        .accounts({
          owner: wallet.publicKey,
          stakingMint,
 
        })
        .rpc();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await program.methods
        .unstakeSol(new anchor.BN(1))
        .accounts({
           owner: wallet.publicKey,
          userTokenAccount,
 
        })
        .rpc();

      const acc = await program.account.stakeAccount.fetch(stakeAccountPda);
      expect(acc.claimPoints.toNumber()).to.be.greaterThan(0);
    });
  });

  // -------------------------------
  // Unstake flow
  // -------------------------------
  describe("unstake the token", () => {
    it("succeeds when user has enough staked", async () => {
      await program.methods
        .unstakeSol(new anchor.BN(10_000_000))
        .accounts({
          owner: wallet.publicKey,
          userTokenAccount,
        })
        .rpc();

      const acc = await program.account.stakeAccount.fetch(stakeAccountPda);
      expect(acc.stakedAmount.toNumber()).to.be.lessThan(100_000_000);
    });

    it("fails if unstaking more than staked amount", async () => {
      try {
        await program.methods
          .unstakeSol(new anchor.BN(10_000_000_000))
          .accounts({
             owner: wallet.publicKey,
          userTokenAccount,
 
          })
          .rpc();
        expect.fail("Should have failed with InsufficientStake");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InsufficientStake");
      }
    });

    it("updates staked_amount correctly", async () => {
      const before = await program.account.stakeAccount.fetch(stakeAccountPda);
      const beforeAmount = before.stakedAmount.toNumber();

      await program.methods
        .unstakeSol(new anchor.BN(5_000_000))
        .accounts({
          owner: wallet.publicKey,
          userTokenAccount,
 
        })
        .rpc();

      const after = await program.account.stakeAccount.fetch(stakeAccountPda);
      expect(after.stakedAmount.toNumber()).to.equal(
        beforeAmount - 5_000_000
      );
    });

    it("rewards updated before unstake (no lost points)", async () => {
      const before = await program.account.stakeAccount.fetch(stakeAccountPda);
      const pointsBefore = before.claimPoints.toNumber();

      await new Promise((resolve) => setTimeout(resolve, 1500));

      await program.methods
        .unstakeSol(new anchor.BN(1))
        .accounts({
          owner: wallet.publicKey,
          userTokenAccount,
 
        })
        .rpc();

      const after = await program.account.stakeAccount.fetch(stakeAccountPda);
      expect(after.claimPoints.toNumber()).to.be.greaterThanOrEqual(
        pointsBefore
      );
    });
  });
});

  // -----------------------
  // 5. Claim Rewards
  // -----------------------
  describe("claim rewards", () => {
    it("transfers reward tokens to user", async () => {});
    it("resets/deducts claim_points", async () => {});
    it("fails if treasury doesn’t have enough tokens", async () => {});
    it("fails if user has no rewards", async () => {});
    it("fails if unauthorized user tries to claim", async () => {});
  });

  // -----------------------
  // 6. Admin Controls
  // -----------------------
  describe("admin controls", () => {
    it("only admin can fund treasury", async () => {});
    it("fails if non-admin funds treasury", async () => {});
    it("update_admin works for current admin", async () => {});
    it("update_admin fails for non-admin", async () => {});
  });

  // -----------------------
  // 7. Treasury / Escrow Safety
  // -----------------------
  describe("treasury & escrow safety", () => {
    it("tokens transferred into escrow PDA during stake", async () => {});
    it("user cannot withdraw directly from escrow PDA", async () => {});
    it("unstake returns tokens from escrow to user", async () => {});
  });

  // -----------------------
  // 8. Edge Cases
  // -----------------------
  describe("edge cases", () => {
    it("stake with max u64::MAX tokens", async () => {});
    it("very long staking durations", async () => {});
    it("fails with wrong reward_mint or mismatched treasury", async () => {});
  });

  // -----------------------
  // 9. Integration Scenarios
  // -----------------------
  describe("integration flows", () => {
    it("user stake → wait → unstake → claim rewards → balances correct", async () => {});
    it("multiple users stake, rewards calculated individually", async () => {});
    it("partial unstake, remaining stake keeps accruing rewards", async () => {});
  });

  // -----------------------
  // 10. Security Tests
  // -----------------------
  describe("security", () => {
    it("no one can transfer treasury funds without PDA seeds", async () => {});
    it("double-claim not possible (2nd gives 0)", async () => {});
    it("unauthorized user cannot manipulate another’s stake", async () => {});
  });
});

