import { Navbar } from "@/components/navbar"
import { EscrowDashboard } from "@/components/escrow-dashboard"

export default function EscrowPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Escrow System</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Monitor and manage the security infrastructure that protects all staked funds through multi-signature
            contracts and time-locked withdrawals.
          </p>
        </div>

        <EscrowDashboard />
      </main>
    </div>
  )
}
