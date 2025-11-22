import { useState } from "react";
import { Marketplace } from "@/components/Marketplace";
import { Header } from "@/components/Header";

const Consumer = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header 
        isWalletConnected={isWalletConnected} 
        onWalletConnect={() => setIsWalletConnected(!isWalletConnected)} 
      />
      <Marketplace isWalletConnected={isWalletConnected} />
    </div>
  );
};

export default Consumer;
