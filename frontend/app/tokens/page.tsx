import { Navbar } from "@/components/navbar"
import { TokenList } from "@/components/token-list"
import { TokenFilters } from "@/components/token-filters"

export default function TokensPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Available Tokens</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Discover and stake from our curated selection of high-yield Solana tokens. All tokens are verified and
            secured through our escrow system.
          </p>
        </div>

        <TokenFilters />
        <TokenList />
      </main>
    </div>
  )
}
