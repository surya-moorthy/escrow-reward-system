"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Wallet, ChevronDown, Copy, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";

export function Navbar() {
  const { connected, publicKey, connect, disconnect, select } = useWallet();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const connectPhantom = async () => {
    await select("Phantom"); // tells adapter which wallet
    await connect(); // then connect
  };

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
              className={`transition-colors ${
                pathname === "/" ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              Home
            </Link>
            <Link
              href="/tokens"
              className={`transition-colors ${
                pathname === "/tokens" ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              Tokens
            </Link>
            <Link
              href="/portfolio"
              className={`transition-colors ${
                pathname === "/portfolio" ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              Portfolio
            </Link>
            <Link
              href="/escrow"
              className={`transition-colors ${
                pathname === "/escrow" ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              Escrow
            </Link>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            <Badge variant={connected ? "default" : "secondary"}>
              {connected ? "Connected" : "Not Connected"}
            </Badge>

            {!connected ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4" />
                    <span>Connect Wallet</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Add more wallets here later */}
                  <DropdownMenuItem onClick={connectPhantom}>
                    <Wallet className="h-4 w-4 mr-2" /> Phantom
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2 bg-transparent">
                    <Wallet className="h-4 w-4" />
                    <span>{truncateAddress(publicKey?.toBase58() || "")}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={copyAddress}>
                    <Copy className="h-4 w-4 mr-2" />
                    {copied ? "Copied!" : "Copy Address"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={disconnect}
                    className="flex items-center space-x-2 text-destructive"
                  >
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
  );
}
