"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"

export function TokenFilters() {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("apy")
  const [filterBy, setFilterBy] = useState("all")

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tokens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apy">Highest APY</SelectItem>
            <SelectItem value="tvl">Total Staked</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter */}
        <Select value={filterBy} onValueChange={setFilterBy}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tokens</SelectItem>
            <SelectItem value="defi">DeFi</SelectItem>
            <SelectItem value="gaming">Gaming</SelectItem>
            <SelectItem value="nft">NFT</SelectItem>
            <SelectItem value="meme">Meme</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters */}
      <div className="flex flex-wrap gap-2">
        {searchTerm && (
          <Badge variant="secondary" className="flex items-center gap-1">
            Search: {searchTerm}
            <button onClick={() => setSearchTerm("")} className="ml-1 hover:text-destructive">
              ×
            </button>
          </Badge>
        )}
        {filterBy !== "all" && (
          <Badge variant="secondary" className="flex items-center gap-1">
            Category: {filterBy}
            <button onClick={() => setFilterBy("all")} className="ml-1 hover:text-destructive">
              ×
            </button>
          </Badge>
        )}
      </div>
    </div>
  )
}
