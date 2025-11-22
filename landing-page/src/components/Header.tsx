import { Shield, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";

interface HeaderProps {
  isWalletConnected: boolean;
  onWalletConnect: () => void;
}

export const Header = ({ isWalletConnected, onWalletConnect }: HeaderProps) => {
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
              <p className="text-xs text-muted-foreground">Verified Data</p>
            </div>
          </NavLink>
          
          <nav className="hidden md:flex items-center gap-6">
            <NavLink 
              to="/producer" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth"
              activeClassName="text-foreground"
            >
              Producer
            </NavLink>
            <NavLink 
              to="/consumer" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth"
              activeClassName="text-foreground"
            >
              Consumer
            </NavLink>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            variant={isWalletConnected ? "secondary" : "default"} 
            onClick={onWalletConnect} 
            className="gap-2"
          >
            <Wallet className="w-4 h-4" />
            {isWalletConnected ? "0x7a8d...4f2c" : "Connect Wallet"}
          </Button>
        </div>
      </div>
    </header>
  );
};
