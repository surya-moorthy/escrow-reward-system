"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Wallet, ChevronDown, Copy, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useWallet } from "@solana/wallet-adapter-react" // use real wallet adapter

export function Navbar() {
  const pathname = usePathname()
  const { connected, publicKey, connect, disconnect, wallet, select, wallets } = useWallet()

  const walletAddress = useMemo(() => (publicKey ? publicKey.toBase58() : ""), [publicKey])
  const isConnected = connected

  const connectWallet = async (walletName: string) => {
    try {
      await select(walletName);
      await connect()
    } catch (e) {
      // swallow for UX; surface via toast if desired
    }
  }

  const disconnectWallet = async () => {
    try {
      await disconnect()
    } catch (e) {
      // swallow for UX; surface via toast if desired
    }
  }

  const copyAddress = () => {
    if (walletAddress) navigator.clipboard.writeText(walletAddress)
  }

  const truncateAddress = (address: string) => {
    if (!address) return ""
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Title */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">S</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">SolStake</h1>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={`transition-colors ${pathname === "/" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              Home
            </Link>
            <Link
              href="/tokens"
              className={`transition-colors ${pathname === "/tokens" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              Tokens
            </Link>
            <Link
              href="/portfolio"
              className={`transition-colors ${pathname === "/portfolio" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              Portfolio
            </Link>
            <Link
              href="/escrow"
              className={`transition-colors ${pathname === "/escrow" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              Escrow
            </Link>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <Badge variant={isConnected ? "default" : "secondary"}>{isConnected ? "Connected" : "Not Connected"}</Badge>

            {/* Wallet Button/Dropdown */}
            {!isConnected ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4" />
                    <span>Connect Wallet</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {wallets.map((wallet) => (
                    <DropdownMenuItem
                      key={wallet.adapter.name}
                      onClick={() => connectWallet(wallet.adapter.name)}
                      className="flex items-center space-x-2"
                    >
                      <img
                        src={wallet.adapter.icon}
                        alt={wallet.adapter.name}
                        className="h-4 w-4"
                      />
                      <span>{wallet.adapter.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2 bg-transparent">
                    <Wallet className="h-4 w-4" />
                    {truncateAddress(publicKey?.toString() as string)}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={copyAddress} className="flex items-center space-x-2">
                    <Copy className="h-4 w-4" />
                    <span>Copy Address</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={disconnectWallet} className="flex items-center space-x-2 text-destructive">
                    <LogOut className="h-4 w-4" />
                    <span>Disconnect</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}