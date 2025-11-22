"use client";

import { useState, useEffect, useMemo } from "react";
import { useCurrentUser, useIsSignedIn } from "@coinbase/cdp-hooks";
import { SelfAppBuilder, SelfQRcodeWrapper, countries, type SelfApp } from "@selfxyz/qrcode";
import { ethers } from "ethers";
import Link from "next/link";

// Contract addresses (you'll update these after deployment)
const CELO_BRIDGE_ADDRESS = process.env.NEXT_PUBLIC_CELO_BRIDGE_ADDRESS || "0x0000000000000000000000000000000000000000";
const BASE_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_BASE_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000";

export default function VerifyPage() {
  const { currentUser } = useCurrentUser();
  const { isSignedIn } = useIsSignedIn();
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [error, setError] = useState<string>("");
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "pending" | "verified">("idle");
  const [isVerified, setIsVerified] = useState(false);

  const address = currentUser?.evmAccounts?.[0];
  const excludedCountries = useMemo(() => [], []); // No exclusions

  // Debug logging
  useEffect(() => {
    console.log("=== CDP Wallet State ===");
    console.log("isSignedIn:", isSignedIn);
    console.log("currentUser:", currentUser);
    console.log("evmAccounts:", currentUser?.evmAccounts);
    console.log("address:", address);
  }, [isSignedIn, currentUser, address]);

  // Check if already verified on Base
  useEffect(() => {
    if (address && BASE_REGISTRY_ADDRESS !== "0x0000000000000000000000000000000000000000") {
      checkVerificationStatus();
    }
  }, [address]);

  // Auto-generate QR code when wallet is connected
  useEffect(() => {
    if (address && !selfApp && !isVerified && CELO_BRIDGE_ADDRESS !== "0x0000000000000000000000000000000000000000") {
      generateQRCode();
    }
  }, [address, selfApp, isVerified]);

  const checkVerificationStatus = async () => {
    if (!address) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const registry = new ethers.Contract(
        BASE_REGISTRY_ADDRESS,
        ["function isVerified(address) view returns (bool)"],
        provider
      );

      const verified = await registry.isVerified(address);
      setIsVerified(verified);
      if (verified) {
        setVerificationStatus("verified");
      }
    } catch (err) {
      console.error("Error checking verification:", err);
    }
  };

  const generateQRCode = async () => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    if (CELO_BRIDGE_ADDRESS === "0x0000000000000000000000000000000000000000") {
      setError("Contract not deployed yet. Deploy contracts first!");
      return;
    }

    setError("");

    try {
      // Build Self QR code using workaround for cross-chain detection
      // Use ZeroAddress as userId (neutral, no chain association)
      // Pass real CDP wallet in userDefinedData
      const { ethers } = await import('ethers');
      
      const app = new SelfAppBuilder({
        version: 2,
        appName: "CDP Agent Verification",
        scope: "zkx402", // MUST match contract deployment scope
        endpoint: CELO_BRIDGE_ADDRESS.toLowerCase(), // MUST be lowercase!
        logoBase64: "https://i.postimg.cc/mrmVf9hm/self.png",
        userId: address.toLowerCase(), // Real CDP wallet address!
        endpointType: "staging_celo", // Testnet on Celo
        userIdType: "hex", // Ethereum address format
        userDefinedData: "CDP Agent Verification", // Just text

        disclosures: {
          // These must match your contract configuration
          minimumAge: 21, // 21+ required
          excludedCountries: excludedCountries, // No exclusions
          nationality: true, // Request nationality for display
        },
      }).build();

      console.log("=== QR Code Generated ===");
      console.log("Contract Address:", CELO_BRIDGE_ADDRESS);
      console.log("Scope:", "zkx402");
      console.log("User ID (CDP Wallet):", address);
      console.log("Endpoint Type:", "staging_celo");
      console.log("Self App Object:", app);
      
      setSelfApp(app);
      setShowQR(true);
      setVerificationStatus("pending");

      // Start polling for verification
      startPolling();
    } catch (err) {
      console.error("Error generating QR code:", err);
      setError("Failed to generate QR code. Check console for details.");
    }
  };

  const startPolling = () => {
    // Poll every 5 seconds for verification on Celo
    const interval = setInterval(async () => {
      if (!address) return;

      attemptCount++;
      console.log(`[Poll ${attemptCount}] Checking Celo contract...`);

      try {
        const { ethers } = await import("ethers");
        const provider = new ethers.JsonRpcProvider(
          "https://alfajores-forno.celo-testnet.org"
        );

        const abi = [
          "function verificationSuccessful() view returns (bool)",
          "function lastUserAddress() view returns (address)",
        ];

        const contract = new ethers.Contract(
          CELO_BRIDGE_ADDRESS,
          abi,
          provider
        );

        const isSuccessful = await contract.verificationSuccessful();
        const lastUser = await contract.lastUserAddress();

        console.log(`[Poll ${attemptCount}] Contract state:`, {
          verificationSuccessful: isSuccessful,
          lastUserAddress: lastUser,
          matchesOurWallet: lastUser.toLowerCase() === address.toLowerCase(),
        });

        if (
          isSuccessful &&
          lastUser.toLowerCase() === address.toLowerCase()
        ) {
          console.log("✅ Verification confirmed!");
          setIsVerified(true);
          setVerificationStatus("verified");
          clearInterval(interval);
        }
      } catch (err) {
        console.error(`[Poll ${attemptCount}] Polling error:`, err);
      }
    }, 5000); // Check every 5 seconds

    // Stop polling after 10 minutes
    setTimeout(() => clearInterval(interval), 600000);
  };

  if (!isSignedIn) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "monospace" }}>
        <h1>verify human</h1>
        <p>connect your wallet first</p>
        <Link href="/" style={{ color: "#0052ff" }}>
          ← back to home
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", maxWidth: "600px", margin: "0 auto", fontFamily: "monospace" }}>
      <h1>verify as human</h1>

      {/* Wallet Info */}
      <div style={{ background: "#e3f2fd", padding: "20px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #2196f3" }}>
        <p style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#1976d2", fontWeight: "bold" }}>your cdp wallet:</p>
        <p style={{ margin: 0, fontFamily: "monospace", fontSize: "13px", wordBreak: "break-all", color: "#0d47a1" }}>
          {address || "Loading..."}
        </p>
      </div>

      {/* Verification Status */}
      {isVerified && (
        <div style={{ background: "#e8f5e9", padding: "20px", borderRadius: "8px", marginBottom: "20px", border: "2px solid #4caf50" }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#2e7d32" }}>✓ verified human</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            your wallet is verified on base sepolia
          </p>
          <Link href="/" style={{ color: "#2e7d32", marginTop: "10px", display: "inline-block" }}>
            ← back to home
          </Link>
        </div>
      )}

      {!isVerified && (
        <>
          {/* Instructions */}
          <div style={{ marginBottom: "30px" }}>
            <h3>how it works:</h3>
            <ol style={{ lineHeight: "1.8" }}>
              <li>QR code generated automatically below</li>
              <li>open self app on your phone</li>
              <li>scan the qr code</li>
              <li>complete verification with mock passport (age 41+, any country)</li>
              <li>wait 2-5 minutes for hyperlane to bridge to base</li>
            </ol>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{ background: "#ffebee", padding: "15px", borderRadius: "8px", marginBottom: "20px", color: "#c62828" }}>
              {error}
            </div>
          )}

          {/* QR Code - Auto-generated */}
          {showQR && selfApp && (
            <div style={{ textAlign: "center", marginTop: "30px" }}>
              <h3>scan with self app</h3>
              <div style={{ background: "white", padding: "20px", borderRadius: "12px", display: "inline-block", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                <SelfQRcodeWrapper selfApp={selfApp} />
              </div>

              {/* Status Messages */}
              {verificationStatus === "pending" && (
                <div style={{ marginTop: "20px", background: "#fff3cd", padding: "15px", borderRadius: "8px", border: "1px solid #ff9800" }}>
                  <p style={{ margin: "0 0 10px 0", fontWeight: "bold", color: "#f57c00" }}>⏳ waiting for verification...</p>
                  <p style={{ margin: 0, fontSize: "14px", color: "#e65100" }}>
                    1. scan qr with self app<br />
                    2. complete verification<br />
                    3. wait for hyperlane (2-5 min)<br />
                    4. page will update automatically
                  </p>
                </div>
              )}

              <button
                onClick={generateQRCode}
                style={{
                  marginTop: "20px",
                  padding: "10px 20px",
                  background: "white",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontFamily: "monospace",
                }}
              >
                regenerate qr code
              </button>
            </div>
          )}
        </>
      )}

      {/* Info Box */}
      <div style={{ marginTop: "40px", padding: "20px", background: "#f5f5f5", borderRadius: "8px", fontSize: "14px" }}>
        <h4 style={{ margin: "0 0 10px 0" }}>requirements:</h4>
        <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: "1.8" }}>
          <li>age: 21+</li>
          <li>excluded countries: none (all allowed!)</li>
          <li>self app with mock passport</li>
        </ul>
      </div>

      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <Link href="/" style={{ color: "#0052ff" }}>
          ← back to home
        </Link>
      </div>
    </div>
  );
}

