import { useState } from "react";
import { Upload, Lock, CheckCircle, Loader2, FileText, Image as ImageIcon, File, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const ProducerUpload = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [proofHash, setProofHash] = useState<string>("");
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [price, setPrice] = useState<string>("");
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'text/plain'];
      if (validTypes.includes(file.type)) {
        setSelectedFile(file);
        setIsVerified(false);
        toast({
          title: "File selected",
          description: `${file.name} ready for verification`,
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF, image, or text file",
          variant: "destructive",
        });
      }
    }
  };

  const handleVerify = async () => {
    if (!selectedFile) return;

    setIsVerifying(true);

    // Simulate API call for ZK verification
    // TODO: Replace with actual vLayer API call
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Simulated hash from vLayer API response
    const mockHash = `0x${Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;

    setIsVerifying(false);
    setIsVerified(true);
    setProofHash(mockHash);

    toast({
      title: "Verification Complete",
      description: "Content authenticity verified with ZK proof",
    });
  };

  const handlePublish = () => {
    // TODO: Implement actual publish to marketplace
    toast({
      title: "Published to Marketplace",
      description: `Your data is now available for ${price} ETH`,
    });
    setShowPublishDialog(false);
    setSelectedFile(null);
    setIsVerified(false);
    setProofHash("");
    setPrice("");
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="w-12 h-12 text-muted-foreground" />;
    
    if (selectedFile.type.startsWith('image/')) {
      return <ImageIcon className="w-12 h-12 text-primary" />;
    } else if (selectedFile.type === 'application/pdf') {
      return <FileText className="w-12 h-12 text-primary" />;
    } else {
      return <File className="w-12 h-12 text-primary" />;
    }
  };

  return (
    <section className="py-20 px-6">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-foreground"></h2>
          <p className="text-lg text-muted-foreground">
            Upload sensitive documents and create cryptographic proof of authenticity
          </p>
        </div>

        <Card className="p-8 bg-card border-border">
          {!isVerified ? (
            <div className="space-y-6">
              <div
                className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-smooth cursor-pointer"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                {getFileIcon()}
                <p className="mt-4 text-muted-foreground">
                  {selectedFile ? selectedFile.name : "Click to upload or drag and drop"}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  PDF, PNG, JPG or TXT (max 10MB)
                </p>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.txt"
                  onChange={handleFileChange}
                />
              </div>

              {selectedFile && (
                <div className="space-y-4">
                  {isVerifying ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="relative">
                        <Lock className="w-16 h-16 text-primary animate-pulse" />
                        <Loader2 className="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-spin" />
                      </div>
                      <p className="mt-4 text-foreground font-medium">Verifying content authenticity...</p>
                      <p className="text-sm text-muted-foreground">Creating ZK proof with vLayer</p>
                    </div>
                  ) : (
                    <Button
                      onClick={handleVerify}
                      size="lg"
                      className="w-full gap-2 shadow-glow"
                    >
                      <Lock className="w-5 h-5" />
                      Verify with ZK Proof
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary mb-6 shadow-glow">
                <CheckCircle className="w-10 h-10 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-foreground">Authentic Content Verified</h3>
              <p className="text-muted-foreground mb-6">
                Your data has been cryptographically verified and is ready for the marketplace
              </p>
              
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-secondary/50 border border-primary/50 mb-6">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-foreground">ZK Proof Badge</span>
              </div>

              <div className="w-full max-w-2xl mx-auto mb-6 p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Proof Hash</p>
                <code className="text-xs text-foreground break-all font-mono">{proofHash}</code>
              </div>

              <div className="flex gap-4 justify-center">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedFile(null);
                    setIsVerified(false);
                    setProofHash("");
                  }}
                >
                  Upload Another File
                </Button>
                <Button onClick={() => setShowPublishDialog(true)}>
                  Publish
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle></DialogTitle>
              <DialogDescription>
                Set a price for your verified data. 
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    placeholder="0.01"
                    step="0.001"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">File:</span> {selectedFile?.name}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">Status:</span> Verified with ZK Proof
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setShowPublishDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handlePublish} disabled={!price || parseFloat(price) <= 0}>
                Confirm & Publish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};
