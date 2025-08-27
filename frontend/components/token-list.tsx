"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Users, Lock, ExternalLink } from "lucide-react"
import { StakingModal } from "./staking-modal"

interface Token {
  id: string
  name: string
  symbol: string
  logo: string
  apy: number
  totalStaked: string
  totalStakedUSD: string
  activeStakers: number
  category: string
  lockPeriod: string
  minStake: string
  isVerified: boolean
  trend: "up" | "down" | "stable"
  description: string
}

const mockTokens: Token[] = [
  {
    id: "1",
    name: "Solana",
    symbol: "SOL",
    logo: "/solana-logo.png",
    apy: 12.5,
    totalStaked: "1.2M SOL",
    totalStakedUSD: "$1,200,000",
    activeStakers: 847,
    category: "Layer 1",
    lockPeriod: "Flexible",
    minStake: "1 SOL",
    isVerified: true,
    trend: "up",
    description: "Native Solana token with the highest liquidity and security.",
  },
  {
    id: "2",
    name: "Raydium",
    symbol: "RAY",
    logo: "/raydium-logo.png",
    apy: 15.8,
    totalStaked: "450K RAY",
    totalStakedUSD: "$890,000",
    activeStakers: 234,
    category: "DeFi",
    lockPeriod: "30 days",
    minStake: "10 RAY",
    isVerified: true,
    trend: "up",
    description: "Leading DEX and AMM protocol on Solana with high yield opportunities.",
  },
  {
    id: "3",
    name: "Serum",
    symbol: "SRM",
    logo: "/serum-logo.png",
    apy: 9.2,
    totalStaked: "120K SRM",
    totalStakedUSD: "$340,000",
    activeStakers: 156,
    category: "DeFi",
    lockPeriod: "14 days",
    minStake: "5 SRM",
    isVerified: true,
    trend: "stable",
    description: "Decentralized exchange protocol powering Solana's DeFi ecosystem.",
  },
  {
    id: "4",
    name: "Star Atlas",
    symbol: "ATLAS",
    logo: "/star-atlas-logo.png",
    apy: 18.3,
    totalStaked: "2.1M ATLAS",
    totalStakedUSD: "$210,000",
    activeStakers: 89,
    category: "Gaming",
    lockPeriod: "60 days",
    minStake: "100 ATLAS",
    isVerified: true,
    trend: "up",
    description: "Next-gen gaming metaverse with play-to-earn mechanics.",
  },
  {
    id: "5",
    name: "Mango",
    symbol: "MNGO",
    logo: "/mango-markets-logo.png",
    apy: 11.7,
    totalStaked: "890K MNGO",
    totalStakedUSD: "$178,000",
    activeStakers: 67,
    category: "DeFi",
    lockPeriod: "21 days",
    minStake: "50 MNGO",
    isVerified: true,
    trend: "down",
    description: "Decentralized trading platform with margin and perpetual futures.",
  },
  {
    id: "6",
    name: "Orca",
    symbol: "ORCA",
    logo: "/orca-protocol-logo.png",
    apy: 13.4,
    totalStaked: "67K ORCA",
    totalStakedUSD: "$134,000",
    activeStakers: 45,
    category: "DeFi",
    lockPeriod: "7 days",
    minStake: "2 ORCA",
    isVerified: true,
    trend: "up",
    description: "User-friendly DEX focused on capital efficiency and ease of use.",
  },
]

export function TokenList() {
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)
  const [isStakingModalOpen, setIsStakingModalOpen] = useState(false)

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <div className="h-4 w-4 rounded-full bg-muted-foreground" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "defi":
        return "bg-primary/10 text-primary"
      case "gaming":
        return "bg-accent/10 text-accent"
      case "layer 1":
        return "bg-green-500/10 text-green-500"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const handleStakeClick = (token: Token) => {
    setSelectedToken(token)
    setIsStakingModalOpen(true)
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockTokens.map((token) => (
          <Card key={token.id} className="hover:shadow-lg transition-all duration-200 hover:border-primary/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img src={token.logo || "/placeholder.svg"} alt={token.name} className="w-10 h-10 rounded-full" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-foreground">{token.name}</h3>
                      {token.isVerified && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          ✓
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{token.symbol}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">{getTrendIcon(token.trend)}</div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">APY</span>
                <span className="text-2xl font-bold text-primary">{token.apy}%</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Staked</p>
                  <p className="font-medium text-foreground">{token.totalStaked}</p>
                  <p className="text-xs text-muted-foreground">{token.totalStakedUSD}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Stakers</p>
                  <div className="flex items-center space-x-1">
                    <Users className="h-3 w-3" />
                    <span className="font-medium text-foreground">{token.activeStakers}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Badge className={getCategoryColor(token.category)}>{token.category}</Badge>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  <span>{token.lockPeriod}</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2">{token.description}</p>

              <div className="text-xs text-muted-foreground">
                Min stake: <span className="text-foreground font-medium">{token.minStake}</span>
              </div>

              <div className="flex space-x-2 pt-2">
                <Button className="flex-1" size="sm" onClick={() => handleStakeClick(token)}>
                  Stake Now
                </Button>
                <Button variant="outline" size="sm" className="bg-transparent">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <StakingModal
        token={selectedToken}
        isOpen={isStakingModalOpen}
        onClose={() => {
          setIsStakingModalOpen(false)
          setSelectedToken(null)
        }}
      />
    </>
  )
}
