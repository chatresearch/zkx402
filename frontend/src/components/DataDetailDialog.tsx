import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, CheckCircle2, AlertCircle, Wallet, Info } from "lucide-react";
import { toast } from "sonner";

interface DataDetailDialogProps {
  data: {
    title: string;
    description: string;
    type: string;
    price: number;
    verifiedPrice: number;
    zkVerified: boolean;
    dataPoints: number;
    timestamp: string;
    tags: string[];
  };
  isOpen: boolean;
  onClose: () => void;
  isWalletConnected: boolean;
}

export const DataDetailDialog = ({ data, isOpen, onClose, isWalletConnected }: DataDetailDialogProps) => {
  const [isVerified, setIsVerified] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  const handlePurchase = () => {
    if (!isWalletConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    const price = isVerified ? data.verifiedPrice : data.price;
    toast.success(`Purchase initiated for $${price}`, {
      description: "Confirm the transaction in your wallet",
    });
  };

  const handleVerify = () => {
    // Simulate verification
    setTimeout(() => {
      setIsVerified(true);
      toast.success("Identity verified successfully!", {
        description: "You now qualify for preferential pricing",
      });
      setShowVerification(false);
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between mb-2">
            <DialogTitle className="text-2xl pr-8">{data.title}</DialogTitle>
            {data.zkVerified && (
              <Badge variant="outline" className="gap-1 border-verified text-verified shadow-glow-verified">
                <Shield className="w-3 h-3" />
                ZK Verified
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{data.description}</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Pricing Tiers
              </h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-verified" />
                  <span className="font-medium">Verified Credentials</span>
                </div>
                <span className="text-lg font-bold text-verified">${data.verifiedPrice}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Unverified</span>
                </div>
                <span className="text-lg font-bold text-muted-foreground">${data.price}</span>
              </div>
            </div>

            {!isVerified && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3"
                onClick={() => setShowVerification(true)}
              >
                Verify Identity for 50% Discount
              </Button>
            )}
            
            {isVerified && (
              <div className="mt-3 p-2 bg-verified/10 border border-verified/20 rounded-lg text-sm text-verified flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                You qualify for verified pricing
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handlePurchase} className="gap-2">
            <Wallet className="w-4 h-4" />
            Purchase for ${isVerified ? data.verifiedPrice : data.price}
          </Button>
        </DialogFooter>

        {/* Verification Modal */}
        {showVerification && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm rounded-lg flex items-center justify-center p-6">
            <div className="max-w-md text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto shadow-glow">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold">Verify Your Identity</h3>
              <p className="text-muted-foreground">
                Connect with Self.xyz to verify your credentials and unlock preferential pricing
              </p>
              <div className="flex gap-3 justify-center pt-4">
                <Button variant="outline" onClick={() => setShowVerification(false)}>
                  Cancel
                </Button>
                <Button onClick={handleVerify} className="gap-2">
                  <Shield className="w-4 h-4" />
                  Verify with Self.xyz
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
