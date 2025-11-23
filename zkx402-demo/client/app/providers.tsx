"use client";

import { ReactNode, useState } from "react";
import { CDPHooksProvider } from "@coinbase/cdp-hooks";
import type { Config } from "@coinbase/cdp-core";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config as wagmiConfig } from "@/lib/wagmi";

const cdpConfig: Config = {
  projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID!,
  ethereum: {
    createOnLogin: "eoa",
  },
};

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <CDPHooksProvider config={cdpConfig}>
          {children}
        </CDPHooksProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
