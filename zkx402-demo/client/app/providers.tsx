"use client";

import { ReactNode } from "react";
import { CDPHooksProvider } from "@coinbase/cdp-hooks";
import type { Config } from "@coinbase/cdp-core";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config as wagmiConfig } from "@/lib/wagmi";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const cdpConfig: Config = {
  projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID!,
  ethereum: {
    createOnLogin: "eoa",
  },
};

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CDPHooksProvider config={cdpConfig}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            {children}
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </CDPHooksProvider>
  );
}
