"use client";

import { Shield, Wallet } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useCurrentUser, useIsSignedIn } from "@coinbase/cdp-hooks";

export const Header = () => {
  const { currentUser } = useCurrentUser();
  const { isSignedIn } = useIsSignedIn();
  const address = currentUser?.evmAccounts?.[0];

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="fixed top-0 w-full z-50 border-b border-border/40 backdrop-blur-lg bg-background/80">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <NavLink to="/" className="flex items-center gap-3 hover:opacity-80 transition-smooth">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">ZKx402</h1>
              <p className="text-xs text-muted-foreground">Proof of Leak</p>
            </div>
          </NavLink>
          
          <nav className="hidden md:flex items-center gap-6">
          <NavLink
            to="/demo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth"
            activeClassName="text-foreground"
          >
            Demonstration
          </NavLink>

            <NavLink 
              to="/producer" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth"
              activeClassName="text-foreground"
            >
              Producer (Whistleblower)
            </NavLink>
            <NavLink 
              to="/consumer" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth"
              activeClassName="text-foreground"
            >
              Consumer (Journalist)
            </NavLink>
          </nav>
        </div>
        
        {isSignedIn && address && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono text-foreground">
              {formatAddress(address)}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};