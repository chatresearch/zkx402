import { useState } from "react";
import { Hero } from "@/components/Hero";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { Upload, Search } from "lucide-react";

const Index = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header 
        isWalletConnected={isWalletConnected} 
        onWalletConnect={() => setIsWalletConnected(!isWalletConnected)} 
      />
      <Hero />
    </div>
  );
};

export default Index;
