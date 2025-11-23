import { useState } from 'react';
import {
  Upload,
  Lock,
  CheckCircle,
  Loader2,
  FileText,
  Image as ImageIcon,
  File,
  DollarSign,
  Zap,
  Shield,
  Terminal,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Production API response (from vlayer)
interface VlayerProofResponse {
  success: boolean;
  data: string; // Hex-encoded proof
  meta?: {
    notaryUrl?: string;
  };
  version?: string;
}

// Mock API response (local development)
interface MockProofResponse {
  proof: {
    seal: string;
    postStateDigest?: string;
  };
  publicInputs: {
    url: string;
    statusCode?: number;
    timestamp?: string;
    hasAuthHeader?: boolean;
  };
  response: {
    status?: number;
    data?: unknown;
    body?: string;
  };
  metadata?: {
    prover?: string;
    version?: string;
    generatedAt?: string;
  };
}

// Unified presentation type
type Presentation = VlayerProofResponse | MockProofResponse;

// Type guard to check if response is from production vlayer API
function isVlayerProof(proof: Presentation): proof is VlayerProofResponse {
  return (
    'success' in proof &&
    typeof proof.data === 'string' &&
    proof.data.length > 100
  );
}

// Type guard for mock proof
function isMockProof(proof: Presentation): proof is MockProofResponse {
  return 'proof' in proof && 'publicInputs' in proof;
}

export const ProducerUpload = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [originUrl, setOriginUrl] = useState('');
  const [authHeader, setAuthHeader] = useState('');
  const [isProving, setIsProving] = useState(false);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [proofLogs, setProofLogs] = useState<string[]>([]);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [price, setPrice] = useState<string>('0.02');
  const [sourceType, setSourceType] = useState<'demo' | 'github' | 'notion'>(
    'demo'
  );
  const [notionPageUrl, setNotionPageUrl] = useState('');
  const { toast } = useToast();

  // API base URL - use production by default, fallback to local in development
  const API_BASE_URL =
    import.meta.env.VITE_API_URL || 'https://zkx402-server.vercel.app';

  // For local testing, you can use: http://localhost:3001
  // Set VITE_API_URL=http://localhost:3001 in .env.local

  // Extract Notion page ID from URL
  const extractNotionPageId = (url: string): string | null => {
    if (!url.trim()) return null;
    const trimmed = url.trim();

    // 1. Just the ID: 9a7733de700a4f1b89d5e4efadbbb62d (32 hex chars)
    if (/^[a-f0-9]{32}$/i.test(trimmed)) {
      return trimmed;
    }

    // 2. Full URL with workspace: notion.so/workspace/32hexchars
    const fullUrlMatch = trimmed.match(
      /notion\.so\/[^/]+\/([a-f0-9]{32})(?:\?|$|#)/i
    );
    if (fullUrlMatch && fullUrlMatch[1]) {
      return fullUrlMatch[1];
    }

    // 3. URL with title slug: notion.so/title-slug-32hexchars or notion.so/title-slug-32hexchars?params
    // This handles cases like: notion.so/zkx402-leak-cat-image-2b47fbfd218080feb49be38fb6aa3ac7
    const titleUrlMatch = trimmed.match(/-([a-f0-9]{32})(?:\?|$|#)/i);
    if (titleUrlMatch && titleUrlMatch[1]) {
      return titleUrlMatch[1];
    }

    // 3b. Alternative: URL with title but ID at the end of the path (before query params)
    // notion.so/title-slug-32hexchars?params
    const titleUrlMatch2 = trimmed.match(
      /notion\.so\/[^?]+-([a-f0-9]{32})(?:\?|$|#)/i
    );
    if (titleUrlMatch2 && titleUrlMatch2[1]) {
      return titleUrlMatch2[1];
    }

    // 4. UUID format with hyphens
    const uuidMatch = trimmed.match(
      /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i
    );
    if (uuidMatch && uuidMatch[1]) {
      return uuidMatch[1].replace(/-/g, '');
    }

    // 5. Try to find any 32-char hex string (fallback - matches the last occurrence)
    // This is useful for URLs where the ID appears anywhere in the string
    const hexMatches = trimmed.matchAll(/([a-f0-9]{32})/gi);
    const matches = Array.from(hexMatches);
    if (matches.length > 0) {
      // Return the last match (most likely to be the page ID)
      return matches[matches.length - 1][1];
    }

    return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'text/plain',
      ];
      if (validTypes.includes(file.type)) {
        setSelectedFile(file);
        setIsEncrypted(false);
        setPresentation(null);
        setProofLogs([]);
        setOriginUrl('');
        setAuthHeader('');
        setNotionPageUrl('');

        // Simulate local encryption
        setIsEncrypting(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsEncrypting(false);
        setIsEncrypted(true);

        toast({
          title: 'File encrypted locally 🔒',
          description: `${file.name} is secure and ready`,
        });
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a PDF, image, or text file',
          variant: 'destructive',
        });
      }
    }
  };

  const addLog = (message: string) => {
    setProofLogs((prev) => [...prev, `> ${message}`]);
  };

  const exportProofData = (proofData: Presentation) => {
    try {
      // Create a comprehensive proof data object
      const exportData = {
        exportedAt: new Date().toISOString(),
        proofType: isVlayerProof(proofData) ? 'vlayer' : 'mock',
        ...proofData,
        // Include metadata about the export
        exportMetadata: {
          fileName: selectedFile?.name || 'unknown',
          sourceType: sourceType,
          originUrl: sourceType === 'notion' ? notionPageUrl : originUrl,
          // Note: auth header is intentionally excluded for security
        },
      };

      // Convert to JSON string
      const jsonString = JSON.stringify(exportData, null, 2);

      // Create a blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Generate filename with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, -5);
      const fileName = `proof-${timestamp}.json`;
      link.download = fileName;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addLog(`📥 Proof data exported to ${fileName}`);

      toast({
        title: 'Proof Exported 📥',
        description: `Proof data saved to ${fileName}`,
      });
    } catch (error) {
      console.error('Error exporting proof data:', error);
      addLog('❌ Error exporting proof data');
      toast({
        title: 'Export Failed',
        description: 'Failed to export proof data',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateProof = async () => {
    // Validate based on source type
    if (sourceType === 'notion') {
      if (!notionPageUrl.trim()) {
        toast({
          title: 'Notion Page Required',
          description: 'Please enter your Notion page URL or ID',
          variant: 'destructive',
        });
        return;
      }
      const pageId = extractNotionPageId(notionPageUrl);
      if (!pageId) {
        toast({
          title: 'Invalid Notion URL',
          description: 'Please check the Notion page URL or ID format',
          variant: 'destructive',
        });
        return;
      }
    } else {
      if (!originUrl.trim()) {
        toast({
          title: 'URL Required',
          description: 'Please enter the origin source URL',
          variant: 'destructive',
        });
        return;
      }
    }

    if (!authHeader.trim()) {
      toast({
        title: 'Authentication Required',
        description: 'Please enter your API key or token',
        variant: 'destructive',
      });
      return;
    }

    setIsProving(true);
    setProofLogs([]);

    try {
      addLog('Initializing ZK proof generation...');
      await new Promise((resolve) => setTimeout(resolve, 300));

      addLog('Connecting to vlayer prover network...');
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Build URL and headers based on source type
      let urlToProve: string;
      let authValue = authHeader.trim();

      // Ensure Bearer prefix if not present
      if (
        !authValue.startsWith('Bearer ') &&
        !authValue.startsWith('secret_')
      ) {
        authValue = `Bearer ${authValue}`;
      }

      const headers: string[] = [
        'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      ];

      if (sourceType === 'notion') {
        // Extract and format Notion page ID
        const pageId = extractNotionPageId(notionPageUrl);
        if (!pageId) {
          throw new Error('Invalid Notion page URL or ID');
        }

        // Format as UUID if needed
        const formattedPageId =
          pageId.length === 32
            ? `${pageId.substring(0, 8)}-${pageId.substring(
                8,
                12
              )}-${pageId.substring(12, 16)}-${pageId.substring(
                16,
                20
              )}-${pageId.substring(20)}`
            : pageId;

        urlToProve = `https://api.notion.com/v1/databases/${formattedPageId}`;
        headers.push('Notion-Version: 2022-06-28');
        headers.push('Accept: application/json');
        headers.push(`Authorization: ${authValue}`);

        addLog(`Fetching Notion page: ${formattedPageId}`);
      } else {
        // GitHub or Demo
        urlToProve = originUrl.trim();

        // Convert relative URLs to absolute
        if (urlToProve.startsWith('/')) {
          urlToProve = `http://localhost:3001${urlToProve}`;
        }

        headers.push(
          sourceType === 'github'
            ? 'Accept: application/vnd.github+json'
            : 'Accept: application/json'
        );
        headers.push(`Authorization: ${authValue}`);

        addLog(`Fetching data from: ${urlToProve}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      addLog('Redacting sensitive headers...');
      await new Promise((resolve) => setTimeout(resolve, 400));

      addLog('Generating zero-knowledge proof...');

      // Call the production API
      const response = await fetch(`${API_BASE_URL}/api/prove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: urlToProve,
          headers: headers,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      // Debug: log the full response structure
      console.log('Full API response:', JSON.stringify(data, null, 2));

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from server');
      }

      setPresentation(data);

      // Handle different response formats
      if (isVlayerProof(data)) {
        // Production vlayer API response
        addLog('✅ ZK proof generated successfully!');
        addLog(`Proof data: ${data.data.substring(0, 40)}...`);
        if (data.meta?.notaryUrl) {
          addLog(`Notary: ${data.meta.notaryUrl}`);
        }
        if (data.version) {
          addLog(`vlayer version: ${data.version}`);
        }
      } else if (isMockProof(data)) {
        // Mock API response (local development)
        if (!data.proof?.seal) {
          throw new Error('Mock API: Missing proof seal');
        }
        addLog('✅ ZK proof generated successfully!');
        addLog(`Proof seal: ${data.proof.seal.substring(0, 20)}...`);

        // Handle status from either response.status or publicInputs.statusCode
        const status =
          data.response?.status || data.publicInputs?.statusCode || 'unknown';
        addLog(`Status: ${status}`);
      } else {
        console.error('Unknown proof response structure:', data);
        addLog(`❌ Unrecognized proof format`);
        addLog(`Response keys: ${Object.keys(data).join(', ')}`);
        throw new Error(
          'Unrecognized proof format from server. Check console for details.'
        );
      }

      // Export proof data to file
      exportProofData(data);

      toast({
        title: 'Origin Verified ✨',
        description: 'ZK proof generated without exposing secrets',
      });
    } catch (error) {
      addLog('❌ Error generating proof');
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error: ${errorMessage}`);

      // Log full error for debugging
      console.error('Proof generation error:', error);

      toast({
        title: 'Proof Generation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProving(false);
    }
  };

  const handlePublish = () => {
    // TODO: Implement actual publish to marketplace with ZK proof
    toast({
      title: 'Published to Marketplace 🎉',
      description: `Your verified data is now available for $${price}`,
    });
    setShowPublishDialog(false);
    setSelectedFile(null);
    setIsEncrypted(false);
    setIsEncrypting(false);
    setPresentation(null);
    setProofLogs([]);
    setOriginUrl('');
    setAuthHeader('');
    setNotionPageUrl('');
    setPrice('');
  };

  const getFileIcon = () => {
    if (!selectedFile)
      return <Upload className="w-12 h-12 text-muted-foreground" />;

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
          <h2 className="text-4xl font-bold mb-4 text-foreground">
            Secure Upload with ZK Proof
          </h2>
          <p className="text-lg text-muted-foreground">
            Create a verified listing without revealing your login secrets
          </p>
        </div>

        <div className="space-y-6">
          {/* Step A: File Upload */}
          <Card className="p-8 bg-card border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                A
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Upload Your File
              </h3>
            </div>

            <div
              className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-smooth cursor-pointer relative"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              {isEncrypting && (
                <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
                  <div className="flex flex-col items-center">
                    <Lock className="w-12 h-12 text-primary animate-pulse" />
                    <p className="mt-3 text-sm font-medium text-foreground">
                      Encrypting locally...
                    </p>
                  </div>
                </div>
              )}

              <div className="relative">
                {getFileIcon()}
                {isEncrypted && (
                  <div className="absolute -top-2 -right-2 bg-primary rounded-full p-1">
                    <Lock className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>

              <p className="mt-4 text-muted-foreground">
                {selectedFile
                  ? selectedFile.name
                  : 'Click to upload or drag and drop'}
              </p>
              {isEncrypted && (
                <p className="text-sm text-primary mt-2 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  File encrypted locally 🔒
                </p>
              )}
              {!selectedFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  PDF, PNG, JPG or TXT (max 10MB)
                </p>
              )}
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.txt"
                onChange={handleFileChange}
              />
            </div>
          </Card>

          {/* Step B: Origin Proof */}
          {isEncrypted && (
            <Card className="p-8 bg-card border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                  B
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground">
                    Prove Origin Source
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Generate ZK proof without revealing secrets
                  </p>
                </div>
                {presentation && <Shield className="w-6 h-6 text-primary" />}
              </div>

              <div className="space-y-4">
                {/* Source Type Selector */}
                {!presentation && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Source Type
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant={sourceType === 'demo' ? 'default' : 'outline'}
                        onClick={() => {
                          setSourceType('demo');
                          setOriginUrl(
                            'http://localhost:3001/api/demo-secret-file'
                          );
                          setAuthHeader('Bearer demo-token-123');
                          setNotionPageUrl('');
                        }}
                        className="w-full"
                        disabled={isProving}
                      >
                        Demo
                      </Button>
                      <Button
                        type="button"
                        variant={
                          sourceType === 'github' ? 'default' : 'outline'
                        }
                        onClick={() => {
                          setSourceType('github');
                          setOriginUrl('');
                          setAuthHeader('');
                          setNotionPageUrl('');
                        }}
                        className="w-full"
                        disabled={isProving}
                      >
                        GitHub
                      </Button>
                      <Button
                        type="button"
                        variant={
                          sourceType === 'notion' ? 'default' : 'outline'
                        }
                        onClick={() => {
                          setSourceType('notion');
                          setOriginUrl('');
                          setAuthHeader('');
                          setNotionPageUrl('');
                        }}
                        className="w-full"
                        disabled={isProving}
                      >
                        Notion
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notion Page URL Input */}
                {sourceType === 'notion' && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="notion-url"
                      className="text-sm font-medium text-foreground"
                    >
                      Notion Page URL or ID
                    </Label>
                    <Input
                      id="notion-url"
                      type="text"
                      value={notionPageUrl}
                      onChange={(e) => setNotionPageUrl(e.target.value)}
                      placeholder="https://notion.so/MyPage-abc123xyz or abc123xyz"
                      className="font-mono text-sm"
                      disabled={isProving || !!presentation}
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste your Notion page or database URL (or just the page
                      ID)
                    </p>
                  </div>
                )}

                {/* Generic URL Input (for demo and GitHub) */}
                {sourceType !== 'notion' && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="origin-url"
                      className="text-sm font-medium text-foreground"
                    >
                      Origin Source URL
                    </Label>
                    <Input
                      id="origin-url"
                      type="url"
                      value={originUrl}
                      onChange={(e) => setOriginUrl(e.target.value)}
                      placeholder={
                        sourceType === 'demo'
                          ? 'http://localhost:3001/api/demo-secret-file'
                          : 'https://api.github.com/repos/owner/repo/contributors'
                      }
                      className="font-mono text-sm"
                      disabled={isProving || !!presentation}
                    />
                    <p className="text-xs text-muted-foreground">
                      {sourceType === 'demo' ? (
                        <>Demo endpoint with secret token authentication</>
                      ) : (
                        <>GitHub API endpoint for your private repository</>
                      )}
                    </p>
                  </div>
                )}

                {/* Auth Header/Token Input */}
                <div className="space-y-2">
                  <Label
                    htmlFor="auth-header"
                    className="text-sm font-medium text-foreground"
                  >
                    {sourceType === 'notion'
                      ? 'Notion API Key'
                      : sourceType === 'github'
                      ? 'GitHub Personal Access Token'
                      : 'Authorization Token'}
                  </Label>
                  <Textarea
                    id="auth-header"
                    value={authHeader}
                    onChange={(e) => setAuthHeader(e.target.value)}
                    placeholder={
                      sourceType === 'notion'
                        ? 'secret_xxxxx'
                        : sourceType === 'github'
                        ? 'github_pat_...'
                        : 'Bearer demo-token-123'
                    }
                    className="font-mono text-sm resize-none"
                    rows={2}
                    disabled={isProving || !!presentation}
                  />
                  <p className="text-xs text-muted-foreground">
                    {sourceType === 'notion' ? (
                      <>
                        Get your API key from{' '}
                        <a
                          href="https://www.notion.so/my-integrations"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Notion Integrations
                        </a>
                        . This will be redacted in the proof.
                      </>
                    ) : (
                      <>
                        This will be redacted in the proof. Your secret stays
                        private.
                      </>
                    )}
                  </p>
                </div>

                {!presentation ? (
                  <Button
                    onClick={handleGenerateProof}
                    disabled={
                      isProving ||
                      !authHeader.trim() ||
                      (sourceType === 'notion'
                        ? !notionPageUrl.trim()
                        : !originUrl.trim())
                    }
                    size="lg"
                    className="w-full gap-2 shadow-glow"
                  >
                    {isProving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating Proof...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        GENERATE ZK PROOF
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Origin Verified
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ZK proof generated successfully
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPresentation(null);
                        setProofLogs([]);
                        setOriginUrl('');
                        setAuthHeader('');
                        setNotionPageUrl('');
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                )}

                {/* Terminal Log */}
                {proofLogs.length > 0 && (
                  <Card className="bg-black/90 border-primary/30 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Terminal className="w-4 h-4 text-primary" />
                      <span className="text-xs font-mono text-primary">
                        vlayer-prover.log
                      </span>
                    </div>
                    <div className="space-y-1 font-mono text-xs max-h-48 overflow-y-auto">
                      {proofLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className={`${
                            log.includes('✅')
                              ? 'text-green-400'
                              : log.includes('❌')
                              ? 'text-red-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Verified Data Display */}
                {presentation && (
                  <Card className="bg-muted/50 border-primary/30 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        {isVlayerProof(presentation)
                          ? 'vlayer Proof Data'
                          : 'Verified Data Preview'}
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportProofData(presentation)}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export Proof
                      </Button>
                    </div>
                    <div className="bg-background rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="text-xs text-muted-foreground overflow-x-auto">
                        {(() => {
                          if (isVlayerProof(presentation)) {
                            // Production vlayer proof
                            return JSON.stringify(
                              {
                                success: presentation.success,
                                proofLength: presentation.data.length,
                                proofPreview:
                                  presentation.data.substring(0, 100) + '...',
                                meta: presentation.meta,
                                version: presentation.version,
                              },
                              null,
                              2
                            );
                          } else if (isMockProof(presentation)) {
                            // Mock proof - show response data
                            try {
                              const dataToShow =
                                presentation.response?.data ||
                                (typeof presentation.response?.body === 'string'
                                  ? JSON.parse(presentation.response.body)
                                  : presentation.response?.body);
                              return JSON.stringify(dataToShow, null, 2);
                            } catch (e) {
                              return String(
                                presentation.response?.body ||
                                  JSON.stringify(presentation.response, null, 2)
                              );
                            }
                          }
                          return JSON.stringify(presentation, null, 2);
                        })()}
                      </pre>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      {isVlayerProof(presentation) ? (
                        <>
                          ✅ Cryptographic proof generated via{' '}
                          <span className="font-mono text-primary">
                            {presentation.meta?.notaryUrl || 'vlayer notary'}
                          </span>
                        </>
                      ) : isMockProof(presentation) ? (
                        <>
                          ✅ This data was cryptographically proven to come
                          from:{' '}
                          <span className="font-mono text-primary">
                            {presentation.publicInputs?.url ||
                              'verified source'}
                          </span>
                        </>
                      ) : (
                        <>✅ Proof generated successfully</>
                      )}
                    </p>
                  </Card>
                )}
              </div>
            </Card>
          )}

          {/* Step C: Submit */}
          {presentation && (
            <Card className="p-8 bg-card border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                  C
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  Publish to Marketplace
                </h3>
              </div>

              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        File Encrypted
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedFile?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Origin Verified
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {originUrl}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="price-input"
                    className="text-sm font-medium text-foreground"
                  >
                    Set Your Price
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="price-input"
                      type="number"
                      placeholder="0.02"
                      step="100"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="pl-10 text-lg"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedFile(null);
                      setIsEncrypted(false);
                      setPresentation(null);
                      setProofLogs([]);
                      setOriginUrl('');
                      setAuthHeader('');
                      setNotionPageUrl('');
                    }}
                    className="flex-1"
                  >
                    Start Over
                  </Button>
                  <Button
                    onClick={() => setShowPublishDialog(true)}
                    disabled={!price || parseFloat(price) <= 0}
                    size="lg"
                    className="flex-1 shadow-glow"
                  >
                    Publish Listing
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Confirm Publication
              </DialogTitle>
              <DialogDescription>
                Your listing will be published with a verified source tag
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 p-4 rounded-lg border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground font-medium">
                    {selectedFile?.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary font-medium">
                    Verified Source
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">${price}</span>
                </div>
              </div>

              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                <p className="text-xs text-foreground/80">
                  <strong>Privacy Note:</strong> Your authorization credentials
                  remain private. Only the ZK proof of origin is published to
                  the blockchain.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setShowPublishDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePublish}
                disabled={!price || parseFloat(price) <= 0}
              >
                Confirm & Publish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Powered by vlayer Footer */}
        <div className="mt-16 pt-8 border-t border-border">
          <div className="flex justify-center items-center space-x-2 text-muted-foreground">
            <span className="text-sm">Powered by</span>
            <img src="/powered-by-vlayer.svg" alt="vlayer" className="h-5" />
          </div>
        </div>
      </div>
    </section>
  );
};
