"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, Coins, RefreshCw, ExternalLink, Search } from "lucide-react"
import { useConnection } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"

interface TokenInfo {
  mint: string
  name?: string
  symbol?: string
  decimals: number
  supply: string
  authority: string | null
  freezeAuthority: string | null
  isInitialized: boolean
}

export default function SPLTokensPage() {
  const { connection } = useConnection()

  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [programId, setProgramId] = useState("")

  // Fetch tokens created by the program ID
  const fetchTokensByProgram = async (programAddress: PublicKey) => {
    setLoading(true)
    setError(null)

    try {
      // Fetch all accounts owned by your custom program
      const programAccounts = await connection.getParsedProgramAccounts(programAddress)

      const tokenInfos: TokenInfo[] = []

      for (const account of programAccounts) {
        try {
          const mintInfo = account.account.data.parsed?.info
          if (!mintInfo) continue

          // Build token info object
          const tokenInfo: TokenInfo = {
            mint: account.pubkey.toString(),
            decimals: mintInfo.decimals ?? 0,
            supply: mintInfo.supply
              ? (Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals)).toString()
              : "0",
            authority: mintInfo.mintAuthority ?? null,
            freezeAuthority: mintInfo.freezeAuthority ?? null,
            isInitialized: mintInfo.isInitialized ?? false,
            name: `Token ${account.pubkey.toString().slice(0, 8)}`,
            symbol: `TK${account.pubkey.toString().slice(0, 4).toUpperCase()}`,
          }

          tokenInfos.push(tokenInfo)
        } catch (err) {
          console.warn("Error processing program account:", err)
        }
      }

      setTokens(tokenInfos)
    } catch (err) {
      console.error("Error fetching tokens by program:", err)
      setError("Failed to fetch tokens. Please check the Program ID and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleFetchTokens = () => {
    try {
      const programPublicKey = new PublicKey(programId)
      fetchTokensByProgram(programPublicKey)
    } catch {
      setError("Invalid Program ID format")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const truncateAddress = (address: string, chars = 8) => {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`
  }

  const filteredTokens = tokens.filter(
    (token) =>
      token.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.mint.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Coins className="h-8 w-8" />
              SPL Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              View custom SPL tokens created and minted by your program
            </p>
          </div>
        </div>

        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Token Program Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="programId">Program ID</Label>
              <Input
                id="programId"
                placeholder="Enter your program ID"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
              />
            </div>

            <Button
              onClick={handleFetchTokens}
              disabled={!programId || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Fetching Tokens...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Fetch Tokens
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search */}
        {tokens.length > 0 && (
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tokens by name, symbol, or mint address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        )}

        {/* Tokens Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-8 w-1/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTokens.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTokens.map((token) => (
              <Card key={token.mint} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{token.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{token.symbol}</p>
                    </div>
                    <Badge variant="secondary">SPL Token</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mint Address:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono">{truncateAddress(token.mint)}</span>
                        <Button
                          onClick={() => copyToClipboard(token.mint)}
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Supply:</span>
                      <span className="font-medium">{token.supply}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Decimals:</span>
                      <span>{token.decimals}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={token.isInitialized ? "default" : "secondary"}>
                        {token.isInitialized ? "Initialized" : "Not Initialized"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        window.open(`https://explorer.solana.com/address/${token.mint}`, "_blank")
                      }
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Explorer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !loading && tokens.length === 0 && programId ? (
          <div className="text-center py-12">
            <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Tokens Found</h3>
            <p className="text-muted-foreground">
              No SPL tokens were found for the specified Program ID.
            </p>
          </div>
        ) : null}

        {/* Summary */}
        {tokens.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tokens Found</p>
                  <p className="text-2xl font-bold">{tokens.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Filtered Results</p>
                  <p className="text-2xl font-bold">{filteredTokens.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
