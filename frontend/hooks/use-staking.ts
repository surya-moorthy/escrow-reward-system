"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { PublicKey, SystemProgram } from "@solana/web3.js"
import * as anchor from "@coral-xyz/anchor"
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token"
import { IDL as SOLSTAKE_IDL } from "@/lib/idl/solstake-idl"

type SupportedToken = {
  mint: PublicKey
  symbol?: string
  name?: string
  vault?: PublicKey
  apy?: number
}

type UserTokenState = {
  balance: bigint // raw units
  staked: bigint // raw units
  decimals: number
}

const PROGRAM_ID_STR = process.env.NEXT_PUBLIC_PROGRAM_ID
const PROGRAM_ID = PROGRAM_ID_STR ? new PublicKey(PROGRAM_ID_STR) : undefined

const STAKING_POOL_SEED = process.env.NEXT_PUBLIC_STAKING_POOL_SEED || "staking-pool"
const USER_STAKE_SEED = process.env.NEXT_PUBLIC_USER_STAKE_SEED || "user-stake"
const VAULT_SEED = process.env.NEXT_PUBLIC_VAULT_SEED || "vault"

function ensureProgram() {
  if (!PROGRAM_ID) throw new Error("Missing NEXT_PUBLIC_PROGRAM_ID")
  if (!SOLSTAKE_IDL || Object.keys(SOLSTAKE_IDL).length === 0) {
    throw new Error("Missing Anchor IDL (lib/idl/solstake-idl.ts). Please paste your program's IDL.")
  }
}

export function useStaking() {
  const { connection } = useConnection()
  const { publicKey, wallet } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supportedTokens, setSupportedTokens] = useState<SupportedToken[]>([])
  const [userByMint, setUserByMint] = useState<Record<string, UserTokenState>>({})

  const provider = useMemo(() => {
    if (!wallet) return null
    // Anchor provider using WalletAdapter
    // @ts-expect-error wallet conforms to Anchor wallet interface at runtime
    return new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    })
  }, [connection, wallet])

  const program = useMemo(() => {
    try {
      if (!provider || !PROGRAM_ID) return null
      return new anchor.Program(SOLSTAKE_IDL as anchor.Idl, PROGRAM_ID, provider)
    } catch (_e) {
      return null
    }
  }, [provider])

  const stakingPoolPda = useMemo(() => {
    if (!PROGRAM_ID) return null
    return PublicKey.findProgramAddressSync([Buffer.from(STAKING_POOL_SEED)], PROGRAM_ID)[0]
  }, [])

  const userStakePdaFor = useCallback((owner: PublicKey, mint: PublicKey) => {
    if (!PROGRAM_ID) return null
    return PublicKey.findProgramAddressSync(
      [Buffer.from(USER_STAKE_SEED), owner.toBuffer(), mint.toBuffer()],
      PROGRAM_ID,
    )[0]
  }, [])

  const vaultPdaFor = useCallback((mint: PublicKey) => {
    if (!PROGRAM_ID) return null
    return PublicKey.findProgramAddressSync([Buffer.from(VAULT_SEED), mint.toBuffer()], PROGRAM_ID)[0]
  }, [])

  // 2) Fetch Supported Tokens from stakingPool
  const fetchSupportedTokens = useCallback(async () => {
    setError(null)
    if (!program || !stakingPoolPda) return
    try {
      setLoading(true)
      // Assumes your account layout: program.account.stakingPool.fetch(...) returns { supportedTokens: [{ mint, vault, apy, symbol, name }] }
      // Adjust property names to your IDL.
      const pool: any = await program.account.stakingPool.fetch(stakingPoolPda)
      const list: SupportedToken[] = (pool?.supportedTokens || []).map((t: any) => ({
        mint: new PublicKey(t.mint),
        symbol: t.symbol,
        name: t.name,
        vault: t.vault ? new PublicKey(t.vault) : undefined,
        apy: t.apy ? Number(t.apy) : undefined,
      }))
      setSupportedTokens(list)
    } catch (e: any) {
      setError(e?.message || "Failed to fetch supported tokens")
    } finally {
      setLoading(false)
    }
  }, [program, stakingPoolPda])

  // 3) Show User Balances (SPL balance + staked amount)
  const fetchUserStateForMint = useCallback(
    async (mint: PublicKey) => {
      if (!publicKey) return
      try {
        // SPL token balance
        const ata = await getAssociatedTokenAddress(mint, publicKey, true)
        let balance = 0n
        const decimals = 9
        try {
          const acc = await getAccount(connection, ata)
          balance = acc.amount
          // If you store decimals in pool or token meta, set it here
        } catch {
          balance = 0n
        }

        // user stake account
        let staked = 0n
        if (program) {
          const pda = userStakePdaFor(publicKey, mint)
          try {
            const userStake: any = await program.account.userStake.fetch(pda!)
            staked = BigInt(userStake.amount ?? 0)
          } catch {
            staked = 0n
          }
        }

        setUserByMint((prev) => ({
          ...prev,
          [mint.toBase58()]: { balance, staked, decimals },
        }))
      } catch (e) {
        // ignore per-mint errors; surface aggregate via setError if desired
      }
    },
    [connection, publicKey, program],
  )

  // 6) Optional: fetch vault info (total staked) - expose helper
  const fetchVaultInfo = useCallback(
    async (mint: PublicKey) => {
      try {
        const vaultPda = vaultPdaFor(mint)
        if (!vaultPda) return null
        // If vault is an SPL token account:
        const acc = await getAccount(connection, vaultPda, "confirmed")
        return { amount: acc.amount }
      } catch {
        return null
      }
    },
    [connection],
  )

  // 4) Stake
  const stakeToken = useCallback(
    async (mint: PublicKey, rawAmount: bigint) => {
      setError(null)
      ensureProgram()
      if (!program || !publicKey) throw new Error("Wallet not connected")
      // Basic validations (7)
      const user = userByMint[mint.toBase58()]
      if (!user) throw new Error("Unsupported token or user state missing")
      if (rawAmount <= 0n) throw new Error("Invalid amount")
      if (rawAmount > (user.balance ?? 0n)) throw new Error("Insufficient balance")

      const stakerTokenAccount = await getAssociatedTokenAddress(mint, publicKey, true)
      const userStakePda = userStakePdaFor(publicKey, mint)
      const vaultPda = vaultPdaFor(mint)
      if (!vaultPda || !userStakePda || !stakingPoolPda) throw new Error("Missing PDAs")

      // Adjust method/accounts to match your IDL
      await program.methods
        // @ts-expect-error replace with your Anchor method signature
        .stakeToken(new anchor.BN(rawAmount.toString()))
        .accounts({
          stakingPool: stakingPoolPda,
          userStake: userStakePda,
          staker: publicKey,
          stakerTokenAccount,
          vault: vaultPda,
          mint,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" })

      // refresh state
      await Promise.all([fetchUserStateForMint(mint), fetchSupportedTokens()])
    },
    [program, publicKey, userByMint],
  )

  // 5) Unstake
  const unstakeToken = useCallback(
    async (mint: PublicKey, rawAmount: bigint) => {
      setError(null)
      ensureProgram()
      if (!program || !publicKey) throw new Error("Wallet not connected")

      const user = userByMint[mint.toBase58()]
      if (!user) throw new Error("Unsupported token or user state missing")
      if (rawAmount <= 0n) throw new Error("Invalid unstake amount")
      if (rawAmount > (user.staked ?? 0n)) throw new Error("Insufficient staked amount")

      const stakerTokenAccount = await getAssociatedTokenAddress(mint, publicKey, true)
      const userStakePda = userStakePdaFor(publicKey, mint)
      const vaultPda = vaultPdaFor(mint)
      if (!vaultPda || !userStakePda || !stakingPoolPda) throw new Error("Missing PDAs")

      await program.methods
        // @ts-expect-error replace with your Anchor method signature
        .unstakeToken(new anchor.BN(rawAmount.toString()))
        .accounts({
          stakingPool: stakingPoolPda,
          userStake: userStakePda,
          staker: publicKey,
          stakerTokenAccount,
          vault: vaultPda,
          mint,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" })

      await Promise.all([fetchUserStateForMint(mint), fetchSupportedTokens()])
    },
    [program, publicKey, userByMint],
  )

  useEffect(() => {
    // initial load
    fetchSupportedTokens()
  }, [fetchSupportedTokens])

  useEffect(() => {
    // refresh user balances when supported tokens or wallet changes
    if (!publicKey) return
    supportedTokens.forEach((t) => {
      fetchUserStateForMint(t.mint)
    })
  }, [publicKey, supportedTokens])

  return {
    loading,
    error,
    connected: !!publicKey,
    supportedTokens,
    userByMint,
    fetchSupportedTokens,
    fetchVaultInfo,
    stakeToken,
    unstakeToken,
  }
}
