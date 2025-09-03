"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calculator, Clock, Shield, TrendingUp, Wallet, AlertCircle, Lock } from "lucide-react"
import { useStaking } from "@/hooks/use-staking"
import { PublicKey } from "@solana/web3.js"

interface Token {
  id: string
  name: string
  symbol: string
  logo: string
  apy: number
  minStake: string
  lockPeriod: string
  description: string
  mint?: string
}

interface StakingModalProps {
  token: Token | null
  isOpen: boolean
  onClose: () => void
}

export function StakingModal({ token, isOpen, onClose }: StakingModalProps) {
  const [stakeAmount, setStakeAmount] = useState("")
  const [unstakeAmount, setUnstakeAmount] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("30")
  const [isStaking, setIsStaking] = useState(false)
  const [isUnstaking, setIsUnstaking] = useState(false)

  const { connected, userByMint, stakeToken, unstakeToken } = useStaking()

  const mintKey = useMemo(() => (token?.mint ? new PublicKey(token.mint) : null), [token?.mint])
  const live = mintKey ? userByMint[mintKey.toBase58()] : undefined

  const userBalance = live ? (Number(live.balance) / 10 ** (live.decimals || 9)).toFixed(2) : "1,250.50"
  const currentStaked = live ? (Number(live.staked) / 10 ** (live.decimals || 9)).toFixed(2) : "500.00"
  const pendingRewards = "12.45"

  if (!token) return null

  const calculateRewards = (amount: string, days: string) => {
    const principal = Number.parseFloat(amount) || 0
    const apy = token.apy / 100
    const daysNum = Number.parseInt(days) || 30
    const dailyRate = apy / 365
    return (principal * dailyRate * daysNum).toFixed(2)
  }

  const toBaseUnits = (val: string, decimals = 9) => {
    const n = Number(val || "0")
    return BigInt(Math.floor(n * 10 ** decimals))
  }

  const handleStake = async () => {
    if (!mintKey) return
    setIsStaking(true)
    try {
      await stakeToken(mintKey, toBaseUnits(stakeAmount, live?.decimals || 9))
      setStakeAmount("")
      onClose()
    } catch (e) {
      // optionally surface via toast
    } finally {
      setIsStaking(false)
    }
  }

  const handleUnstake = async () => {
    if (!mintKey) return
    setIsUnstaking(true)
    try {
      await unstakeToken(mintKey, toBaseUnits(unstakeAmount, live?.decimals || 9))
      setUnstakeAmount("")
      onClose()
    } catch (e) {
      // optionally surface via toast
    } finally {
      setIsUnstaking(false)
    }
  }

  const stakingPeriods = [
    { days: "7", multiplier: "1.0x", label: "7 Days" },
    { days: "30", multiplier: "1.2x", label: "30 Days" },
    { days: "90", multiplier: "1.5x", label: "90 Days" },
    { days: "365", multiplier: "2.0x", label: "1 Year" },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <img
              src={token.logo || "/placeholder.svg?height=32&width=32&query=token%20logo"}
              alt={token.name}
              className="w-8 h-8 rounded-full"
            />
            <span>
              Stake {token.name} ({token.symbol})
            </span>
          </DialogTitle>
        </DialogHeader>

        {!connected && (
          <Alert className="border-amber-500/20 bg-amber-500/10 mb-4">
            <AlertDescription className="text-amber-600 dark:text-amber-300">
              Connect your wallet to stake or unstake.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="stake" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stake">Stake</TabsTrigger>
            <TabsTrigger value="unstake">Unstake</TabsTrigger>
          </TabsList>

          <TabsContent value="stake" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Wallet className="h-5 w-5" />
                  <span>Your Position</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Balance</p>
                  <p className="font-semibold text-foreground">
                    {userBalance} {token.symbol}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Staked</p>
                  <p className="font-semibold text-foreground">
                    {currentStaked} {token.symbol}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Rewards</p>
                  <p className="font-semibold text-primary">
                    {pendingRewards} {token.symbol}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div>
                <Label htmlFor="stake-amount">Amount to Stake</Label>
                <div className="relative mt-1">
                  <Input
                    id="stake-amount"
                    type="number"
                    placeholder="0.00"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    className="pr-20"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">{token.symbol}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setStakeAmount(userBalance.replace(",", ""))}
                    >
                      MAX
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label>Staking Period</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {stakingPeriods.map((period) => (
                    <Button
                      key={period.days}
                      variant={selectedPeriod === period.days ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPeriod(period.days)}
                      className="flex flex-col h-auto py-3"
                    >
                      <span className="text-xs">{period.label}</span>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {period.multiplier}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>

              {stakeAmount && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Calculator className="h-5 w-5 text-primary" />
                      <span>Estimated Rewards</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Staking Amount:</span>
                      <span className="font-semibold">
                        {stakeAmount} {token.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">APY:</span>
                      <span className="font-semibold text-primary">{token.apy}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Period:</span>
                      <span className="font-semibold">{selectedPeriod} days</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center text-lg">
                      <span className="text-muted-foreground">Estimated Rewards:</span>
                      <span className="font-bold text-primary">
                        {calculateRewards(stakeAmount, selectedPeriod)} {token.symbol}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Funds secured by multi-signature escrow contracts</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Lock className="h-4 w-4 text-accent" />
                  <span>Time-locked withdrawals with 24-48 hour delay</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="h-4 w-4 text-accent" />
                  <span>Rewards are distributed daily</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span>APY adjusts based on network conditions</span>
                </div>
              </div>

              <Button
                onClick={handleStake}
                disabled={!stakeAmount || isStaking || !connected}
                className="w-full"
                size="lg"
              >
                {isStaking ? "Staking..." : `Stake ${stakeAmount || "0"} ${token.symbol}`}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="unstake" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Your Staked Position</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Staked</p>
                    <p className="font-semibold text-lg">
                      {currentStaked} {token.symbol}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Pending Rewards</p>
                    <p className="font-semibold text-lg text-primary">
                      {pendingRewards} {token.symbol}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Lock Period Progress</span>
                    <span>22/30 days</span>
                  </div>
                  <Progress value={73} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-700 dark:text-amber-400">Escrow Timelock Notice</p>
                  <p className="text-sm text-amber-600 dark:text-amber-300">
                    Unstaking will initiate a 24-hour timelock period through our escrow system. Early unstaking before
                    the lock period ends (8 days remaining) will result in a 5% penalty fee.
                  </p>
                </div>
              </div>
            </div>

            {unstakeAmount && (
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unstaking Amount:</span>
                    <span className="font-semibold">
                      {unstakeAmount} {token.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Early Unstaking Fee:</span>
                    <span className="font-semibold text-amber-600">
                      {(Number.parseFloat(unstakeAmount) * 0.05).toFixed(2)} {token.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rewards to Claim:</span>
                    <span className="font-semibold text-primary">
                      {pendingRewards} {token.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Escrow Timelock:</span>
                    <span className="font-semibold text-accent">24 hours</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg">
                    <span className="text-muted-foreground">You'll Receive:</span>
                    <span className="font-bold">
                      {(Number.parseFloat(unstakeAmount) * 0.95 + Number.parseFloat(pendingRewards)).toFixed(2)}{" "}
                      {token.symbol}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={handleUnstake}
              disabled={!unstakeAmount || isUnstaking || !connected}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              {isUnstaking ? "Initiating Unstake..." : `Unstake ${unstakeAmount || "0"} ${token.symbol}`}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
