import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert, expect } from "chai";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createAccount, createInitializeAccountInstruction, createMint, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
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
  let vaultTokenAccount:anchor.web3.PublicKey;
  let poolPda, treasuryPda,bump,poolBump,treasuryBump,vaultBump,vaultTokenBump;
  let vaultAuthority : anchor.web3.PublicKey;

  const admin = anchor.web3.Keypair.generate();

    before(async () => {
  // 1️⃣ Derive pool PDA
  [poolPda, poolBump] = await PublicKey.findProgramAddress(
    [Buffer.from("pool"), stakingMint?.toBuffer() || Buffer.alloc(32)], // placeholder for stakingMint if not yet created
    program.programId
  );

  // 2️⃣ Derive treasury PDA
  [treasuryPda, treasuryBump] = await PublicKey.findProgramAddress(
    [Buffer.from("treasury"), poolPda.toBuffer()],
    program.programId
  );

  // 3️⃣ Create staking mints
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

  // Re-derive pool PDA now that stakingMint exists (matches Rust seeds)
  [poolPda, poolBump] = await PublicKey.findProgramAddress(
    [Buffer.from("pool"), stakingMint.toBuffer()],
    program.programId
  );
[vaultAuthority, vaultBump] = await PublicKey.findProgramAddress(
  [Buffer.from("vault_auth"), wallet.publicKey.toBuffer()],
  program.programId
);

[vaultTokenPda, vaultTokenBump] = await PublicKey.findProgramAddress(
  [Buffer.from("vault"), wallet.publicKey.toBuffer()],
  program.programId
);
  // 7️⃣ Airdrop SOL to admin for fees
  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(admin.publicKey, 1e9),
    "confirmed"
  );
});

  // -----------------------
  // 1. Initialize
  // -----------------------
  describe("initialize", () => {
    before(async () => {
      // Create staking token mint
     
    });

    it("works with valid user", async () => {
      [stakeAccountPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), wallet.publicKey.toBuffer()],
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
  });


describe("initialize_pool", () => {
  it("initializes the pool correctly", async () => {
    const rewardRate = new anchor.BN(10); // example reward rate
    const lockDuration = new anchor.BN(60 * 60 * 24); // 1 day in seconds

    // Call initializePool using PDAs already derived in the main before hook
    await program.methods
      .initializePool(rewardRate, lockDuration)
      .accounts({
        // admin: admin.publicKey,
        // pool: poolPda,
        // treasury: treasuryPda,
        // stakingMint,
        // systemProgram: anchor.web3.SystemProgram.programId,
        admin: admin.publicKey,
        stakingMint
      })
      .signers([admin])
      .rpc();
  });
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
  });  
  
// -------------------------------
// Reward accrual
// -------------------------------
describe("reward accrual", () => {

 before(async ()=> {
      const [stakeAccountPda, stakeBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("stake"), wallet.publicKey.toBuffer()],
      program.programId
    );
 })

  it("rewards increase over time", async () => {
    try {
      await program.methods
        .depositSol(new anchor.BN(100_000_000))
        .accounts({
          owner: wallet.publicKey,
          stakingMint,
          userTokenAccount,
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
          // userTokenAccount,
          // vaultTokenAccount : vaultTokenPda,
          // vaultAuthority, 
          // treasuryPda,
          // pool: poolPda
          pool : poolPda,
          treasuryPda,
          userTokenAccount,
          vaultAuthority,
          vaultTokenAccount : vaultTokenPda
        })
        .rpc();

      const acc2 = await program.account.stakeAccount.fetch(stakeAccountPda);
      expect(acc2.claimPoints.toNumber()).to.be.greaterThan(beforePoints);
    } catch (err: any) {
      console.error("❌ rewards increase over time failed:", err.logs ?? err);
      throw err;
    }
  });

  it("no rewards if no tokens staked", async () => {
    try {
      const fakeUser = anchor.web3.Keypair.generate();
      const [fakeStake] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), fakeUser.publicKey.toBuffer()],
        program.programId
      );

      // ✅ Fund fakeUser so it can pay rent/fees
      const sig = await provider.connection.requestAirdrop(fakeUser.publicKey, 1e9); // 1 SOL
      await provider.connection.confirmTransaction(sig, "confirmed");

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
    } catch (err: any) {
      console.error("❌ no rewards if no tokens staked failed:", err.logs ?? err);
      throw err;
    }
  });

  it("accumulates across multiple staking periods", async () => {
    try {
      await program.methods
        .depositSol(new anchor.BN(50_000_000))
        .accounts({
          owner: wallet.publicKey,
          stakingMint,
          userTokenAccount,
        })
        .rpc();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await program.methods
        .unstakeSol(new anchor.BN(1))
        .accounts({
          owner: wallet.publicKey,
          userTokenAccount,
          vaultTokenAccount : vaultTokenPda,
          vaultAuthority, // ⚠️ include if required
          treasuryPda,
          pool: poolPda
        })
        .rpc();

      const acc = await program.account.stakeAccount.fetch(stakeAccountPda);
      expect(acc.claimPoints.toNumber()).to.be.greaterThan(0);
    } catch (err: any) {
      console.error("❌ accumulates across multiple staking periods failed:", err.logs ?? err);
      throw err;
    }
  });
});



  // -------------------------------
  // Unstake flow
  // -------------------------------
  describe("unstake the token", () => {


      before(async () => {
        // derive pool PDA
    [poolPda, poolBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("pool"), stakingMint.toBuffer()],
      program.programId
    );

    // derive treasury PDA
    [treasuryPda, treasuryBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("treasury"), poolPda.toBuffer()],
      program.programId
    );

  [vaultTokenPda, vaultTokenBump] = await PublicKey.findProgramAddress(
    [Buffer.from("vault"), wallet.publicKey.toBuffer()],
  program.programId
);

  })

    it("succeeds when user has enough staked", async () => {
      await program.methods
        .unstakeSol(new anchor.BN(10_000_000))
        .accounts({
          owner: wallet.publicKey,
          userTokenAccount,
          vaultTokenAccount : vaultTokenPda,
          vaultAuthority,
          treasuryPda,
          pool: poolPda
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
           vaultTokenAccount : vaultTokenPda,
          vaultAuthority,
          treasuryPda,
          pool: poolPda
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
           vaultTokenAccount : vaultTokenPda,
          vaultAuthority,
          treasuryPda,
              pool: poolPda
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
          vaultTokenAccount : vaultTokenPda,
          vaultAuthority,
          treasuryPda,
          pool: poolPda
        })
        .rpc();

      const after = await program.account.stakeAccount.fetch(stakeAccountPda);
      expect(after.claimPoints.toNumber()).to.be.greaterThanOrEqual(
        pointsBefore
      );
    });
  });


  // // -----------------------
  // // 5. Claim Rewards
  // // -----------------------
  // describe("claim rewards", () => {
  //   it("transfers reward tokens to user", async () => {});
  //   it("resets/deducts claim_points", async () => {});
  //   it("fails if treasury doesn’t have enough tokens", async () => {});
  //   it("fails if user has no rewards", async () => {});
  //   it("fails if unauthorized user tries to claim", async () => {});
  // });

  // -----------------------
// 6. Admin Controls
// -----------------------
describe("admin controls", () => {
    // provider and program
  // generate keypairs

  before(async () => {
    // derive pool PDA
 [poolPda, poolBump] = await anchor.web3.PublicKey.findProgramAddress(
  [Buffer.from("pool"), stakingMint.toBuffer()],
  program.programId
);

// derive treasury PDA
 [treasuryPda, treasuryBump] = await anchor.web3.PublicKey.findProgramAddress(
  [Buffer.from("treasury"), poolPda.toBuffer()],
  program.programId
);

  });
  it("only admin can fund treasury", async () => {
    
    const before = await provider.connection.getBalance(treasuryPda);

    // admin funds treasury
    await program.methods
      .fundTreasury(new anchor.BN(1_000_000)) // 0.001 SOL for example
      .accounts({
        admin: admin.publicKey,
        pool: poolPda,
        treasury: treasuryPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const after = await provider.connection.getBalance(treasuryPda);
    expect(after).to.be.greaterThan(before);
  });

  it("fails if non-admin funds treasury", async () => {
    const randomUser = anchor.web3.Keypair.generate();

    try {
      await program.methods
        .fundTreasury(new anchor.BN(500_000))
        .accounts({
          admin: randomUser.publicKey,
          pool: poolPda,
          treasury: treasuryPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([randomUser])
        .rpc();
      expect.fail("should have thrown");
    } catch (err) {
      expect(err.error.errorCode.code).to.equal("Unauthorized");
    }
  });

  it("update_admin works for current admin", async () => {
    const newAdmin = anchor.web3.Keypair.generate();

    await program.methods
      .updateAdmin(newAdmin.publicKey)
      .accounts({
        admin: admin.publicKey,
        pool: poolPda,
      })
      .signers([admin])
      .rpc();

    const poolAccount = await program.account.pool.fetch(poolPda);
    expect(poolAccount.admin.toBase58()).to.equal(newAdmin.publicKey.toBase58());

    // set back to original admin for other tests
    await program.methods
      .updateAdmin(admin.publicKey)
      .accounts({
        admin: newAdmin.publicKey,
        pool: poolPda,
      })
      .signers([newAdmin])
      .rpc();
  });

  it("update_admin fails for non-admin", async () => {
    const randomUser = anchor.web3.Keypair.generate();

    try {
      await program.methods
        .updateAdmin(randomUser.publicKey)
        .accounts({
          admin: randomUser.publicKey,
          pool: poolPda,
        })
        .signers([randomUser])
        .rpc();
      expect.fail("should have thrown");
    } catch (err) {
      expect(err.error.errorCode.code).to.equal("Unauthorized");
    }
  });
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

