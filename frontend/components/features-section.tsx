import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Zap, TrendingUp, Lock, Clock, Award } from "lucide-react"

export function FeaturesSection() {
  const features = [
    {
      icon: Shield,
      title: "Secure Escrow",
      description:
        "Your funds are protected by smart contracts with multi-signature security and time-locked withdrawals.",
    },
    {
      icon: Zap,
      title: "Instant Staking",
      description:
        "Start earning rewards immediately with our optimized staking pools and automated reward distribution.",
    },
    {
      icon: TrendingUp,
      title: "Competitive APY",
      description: "Earn up to 15% APY with our dynamic reward system that adjusts based on network conditions.",
    },
    {
      icon: Lock,
      title: "Flexible Terms",
      description: "Choose from various staking periods from 7 days to 2 years with different reward multipliers.",
    },
    {
      icon: Clock,
      title: "Real-time Tracking",
      description: "Monitor your staking performance with detailed analytics and real-time reward calculations.",
    },
    {
      icon: Award,
      title: "Bonus Rewards",
      description: "Earn additional rewards through our loyalty program and referral system.",
    },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">Why Choose SolStake?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Built with security, transparency, and user experience in mind. Our platform offers the best staking
            experience on Solana.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
