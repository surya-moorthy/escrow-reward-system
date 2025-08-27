import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Shield, Zap, Users } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        {/* Hero Content */}
        <div className="text-center mb-16">
          <Badge className="mb-4" variant="secondary">
            Powered by Solana
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance">
            Stake Your SOL,
            <span className="text-primary"> Earn Rewards</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto text-pretty">
            Secure, transparent, and efficient staking platform built on Solana. Maximize your returns with our advanced
            escrow system and competitive APY rates.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8">
              Start Staking
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent">
              View Tokens
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">12.5%</h3>
              <p className="text-muted-foreground">Average APY</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg mx-auto mb-4">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">$2.4M</h3>
              <p className="text-muted-foreground">Total Staked</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">24</h3>
              <p className="text-muted-foreground">Active Tokens</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg mx-auto mb-4">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">1,247</h3>
              <p className="text-muted-foreground">Active Stakers</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
