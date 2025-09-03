import { Navbar } from "@/components/navbar"
import { PortfolioDashboard } from "@/components/portfolio-dashboard"

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Your Portfolio</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Track your staking positions, rewards, and performance across all your investments.
          </p>
        </div>

        <PortfolioDashboard />
      </main>
    </div>
  )
}
