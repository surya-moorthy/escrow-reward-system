import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert, expect } from "chai";
import { AnchorProject } from "../target/types/anchor_project";

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
    [stakingPoolPda, stakingPoolBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("staking-pool")],
      program.programId
    );
  });

  describe("initialize pool", async ()=> {
      it("Initialize Pool - success", async () => {
    await program.methods
      .initializePool()
      .accounts({
        stakingPool: stakingPoolPda,
        admin: admin.publicKey,
      })
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
          stakingPool: stakingPoolPda,
          admin: fakeUser.publicKey
        })
        .signers([fakeUser]) // fake signer
        .rpc();

      assert.fail("Should have thrown an error but did not.");
    } catch (err) {
      expect(err.message).to.include("Constraint"); // generic Anchor error
    }
  });

    it("Initialize Pool - failure (already initialized)", async () => {
    try {
      await program.methods
        .initializePool()
        .accounts({
          stakingPool: stakingPoolPda,
          admin: admin.publicKey,
        })
        .rpc();

      assert.fail("Should not allow double initialization.");
    } catch (err) {
      expect(err.message).to.include("already in use");
    }
  });
  })

})