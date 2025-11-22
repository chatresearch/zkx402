import { useState } from "react";
import { Header } from "@/components/Header";
import { ProducerUpload } from "@/components/ProducerUpload";

const Producer = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header 
        isWalletConnected={isWalletConnected} 
        onWalletConnect={() => setIsWalletConnected(!isWalletConnected)} 
      />
      <ProducerUpload />
    </div>
  );
};

export default Producer;
