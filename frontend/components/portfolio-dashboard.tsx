"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Wallet, Clock, Award, Eye, EyeOff } from "lucide-react"

interface StakingPosition {
  id: string
  tokenName: string
  tokenSymbol: string
  tokenLogo: string
  stakedAmount: string
  currentValue: string
  apy: number
  rewards: string
  lockPeriod: string
  daysRemaining: number
  status: "active" | "unlocked" | "pending"
}

const mockPositions: StakingPosition[] = [
  {
    id: "1",
    tokenName: "Solana",
    tokenSymbol: "SOL",
    tokenLogo: "/solana-logo.png",
    stakedAmount: "500.00",
    currentValue: "$12,500.00",
    apy: 12.5,
    rewards: "15.62",
    lockPeriod: "Flexible",
    daysRemaining: 0,
    status: "active",
  },
  {
    id: "2",
    tokenName: "Raydium",
    tokenSymbol: "RAY",
    tokenLogo: "/raydium-logo.png",
    stakedAmount: "1,200.00",
    currentValue: "$2,400.00",
    apy: 15.8,
    rewards: "8.45",
    lockPeriod: "30 days",
    daysRemaining: 8,
    status: "active",
  },
  {
    id: "3",
    tokenName: "Star Atlas",
    tokenSymbol: "ATLAS",
    tokenLogo: "/star-atlas-logo.png",
    stakedAmount: "50,000.00",
    currentValue: "$5,000.00",
    apy: 18.3,
    rewards: "125.30",
    lockPeriod: "60 days",
    daysRemaining: 0,
    status: "unlocked",
  },
]

export function PortfolioDashboard() {
  const [hideBalances, setHideBalances] = useState(false)

  const totalValue = mockPositions.reduce(
    (sum, pos) => sum + Number.parseFloat(pos.currentValue.replace(/[$,]/g, "")),
    0,
  )
  const totalRewards = mockPositions.reduce((sum, pos) => sum + Number.parseFloat(pos.rewards), 0)
  const activePositions = mockPositions.filter((pos) => pos.status === "active").length

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500"
      case "unlocked":
        return "bg-primary/10 text-primary"
      case "pending":
        return "bg-amber-500/10 text-amber-500"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const formatValue = (value: string) => {
    if (hideBalances) return "****"
    return value
  }

  return (
    <div className="space-y-8">
      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setHideBalances(!hideBalances)} className="h-8 w-8 p-0">
              {hideBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatValue(`$${totalValue.toLocaleString()}`)}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatValue(`${totalRewards.toFixed(2)}`)}</div>
            <p className="text-xs text-muted-foreground">Across all positions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activePositions}</div>
            <p className="text-xs text-muted-foreground">Currently earning rewards</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average APY</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">15.2%</div>
            <p className="text-xs text-muted-foreground">Weighted average</p>
          </CardContent>
        </Card>
      </div>

      {/* Staking Positions */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Positions</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {mockPositions.map((position) => (
            <Card key={position.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img
                      src={position.tokenLogo || "/placeholder.svg"}
                      alt={position.tokenName}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{position.tokenName}</h3>
                      <p className="text-muted-foreground">{position.tokenSymbol}</p>
                    </div>
                  </div>

                  <Badge className={getStatusColor(position.status)}>
                    {position.status.charAt(0).toUpperCase() + position.status.slice(1)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Staked Amount</p>
                    <p className="font-semibold text-foreground">
                      {formatValue(`${position.stakedAmount} ${position.tokenSymbol}`)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Current Value</p>
                    <p className="font-semibold text-foreground">{formatValue(position.currentValue)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">APY</p>
                    <p className="font-semibold text-primary">{position.apy}%</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Rewards</p>
                    <p className="font-semibold text-primary">
                      {formatValue(`${position.rewards} ${position.tokenSymbol}`)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Lock Period</p>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{position.lockPeriod}</p>
                      {position.daysRemaining > 0 && (
                        <div className="space-y-1">
                          <Progress value={((30 - position.daysRemaining) / 30) * 100} className="h-1" />
                          <p className="text-xs text-muted-foreground">{position.daysRemaining} days remaining</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 mt-6">
                  {position.status === "unlocked" ? (
                    <Button size="sm">Claim Rewards</Button>
                  ) : (
                    <Button size="sm" variant="outline" className="bg-transparent">
                      <Clock className="h-4 w-4 mr-2" />
                      Manage Position
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="bg-transparent">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Transaction history will be displayed here</p>
              <p className="text-sm">All your staking and unstaking activities</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
