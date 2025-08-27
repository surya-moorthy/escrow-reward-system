"use client";

import { ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";

// Default styles (needed for WalletModalProvider)
import "@solana/wallet-adapter-react-ui/styles.css";

export function WalletContextProvider({ children }: { children: ReactNode }) {
  // RPC endpoint
  const endpoint = useMemo(() => "https://api.mainnet-beta.solana.com", []);

  // Wallets you want to support
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
