import { Shield, FileCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Hero = () => {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Powered by Zero-Knowledge Proofs</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
            Secure Data Exchange
            <br />
            <span className="text-primary">Verified by ZK</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            A trustless marketplace connecting whistleblowers with journalists and AI agents. 
            Verify identity, prove authenticity, and exchange sensitive data securely.
          </p>
        </div>
      </div>
    </section>
  );
};
