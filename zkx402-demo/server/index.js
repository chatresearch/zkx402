import express from "express";
import cors from "cors";
// import { paymentMiddleware } from "x402-express";
import { paymentMiddleware } from "./middleware.js";
import { facilitator } from "@coinbase/x402";
import dotenv from "dotenv";
import { requestFaucet } from "./faucet.js";
import { getTokenBalances } from "./balances.js";
import { isWalletVerified, getVerificationDetails, requireVerification } from "./verification.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// parse JSON bodies
app.use(express.json());

// wallet address that will receive payments for the API
const RECEIVER_WALLET = process.env.RECEIVER_WALLET || "0xYourWalletAddress";

// enable CORS for local development
app.use(cors());

// apply x402 payment middleware
app.use(paymentMiddleware(
  RECEIVER_WALLET,
  {
    // configure the x402-enabled endpoint
    "GET /motivate": {
      // price in USDC (0.01 USDC)
      price: "$0.01",
      // using Base Sepolia testnet
      network: "base-sepolia",
      // metadata about the endpoint for better discovery
      config: {
        description: "get a motivational quote to inspire your day",
        outputSchema: {
          type: "object",
          properties: {
            quote: { type: "string", description: "an inspirational quote" },
            timestamp: { type: "string", description: "when the quote was generated" }
          }
        },
        // zkx402 additions
        extra: {
          variableAmountRequired: [{ 
            requestedProofs: "zkproofOf(human), zkproofOf(instituion=NYT)", amountRequired: "5000" 
          }],
          contentMetadata: [
            { proof: "zkproof(Edward Snowden)" },
            { proof: "zkproof(human)" }
          ]
        }
      }
    }
  },
  facilitator // use CDP's hosted facilitator (requires CDP_API_KEY and CDP_API_KEY_PRIVATE_KEY env vars)
));

// the x402-enabled endpoint - this is ALL the code you need!
app.get("/motivate", (req, res) => {
  res.json({
    quote: "Innovation happens when ideas collide, and blockchain is the perfect collision of technology and finance. --Vitalik Buterin",
    timestamp: new Date().toISOString(),
    paid: true,
  });
});

// Root endpoint - API info
app.get("/", (req, res) => {
  res.json({
    name: "x402 Demo API",
    description: "Simple API demonstrating x402 payments with CDP",
    endpoints: {
      "GET /health": "Health check",
      "GET /balance/:address": "Get USDC balance",
      "POST /faucet": "Request test USDC",
      "GET /motivate": "Get motivational quote (requires 0.01 USDC payment)",
      "GET /verify/:address": "Check if wallet is verified as human",
      "GET /verification/:address": "Get full verification details",
      "GET /humans-only": "Protected endpoint (requires human verification)"
    },
    payment: {
      price: "0.01 USDC",
      network: "base-sepolia"
    },
    verification: {
      description: "Self Protocol ZK proof of humanity",
      requirements: "Age 21+, no country restrictions"
    },
    github: "https://github.com/jnix2007/x402-demo"
  });
});

// health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "x402 demo server is running" });
});

// balance endpoint; uses CDP Token Balances API
app.get("/balance/:address", async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({ error: "address required" });
    }

    const apiKeyId = process.env.CDP_API_KEY_ID;
    const privateKey = process.env.CDP_API_KEY_SECRET;

    if (!apiKeyId || !privateKey) {
      return res.status(500).json({ error: "server not configured with CDP API credentials" });
    }

    const usdcBalance = await getTokenBalances(address, "base-sepolia", apiKeyId, privateKey);
    
    res.json({ 
      balance: usdcBalance,
      address: address,
      network: "base-sepolia",
      token: "USDC"
    });
  } catch (error) {
    console.error("Balance error:", error);
    res.status(500).json({ 
      error: error.message || "failed to fetch balance"
    });
  }
});

// Faucet endpoint; uses CDP Faucet API with server's CDP API key
app.post("/faucet", async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: "address required" });
    }

    const apiKeyId = process.env.CDP_API_KEY_ID;
    const privateKey = process.env.CDP_API_KEY_SECRET;

    if (!apiKeyId || !privateKey) {
      return res.status(500).json({ error: "server not configured with CDP API credentials" });
    }

    console.log(`requesting faucet for address: ${address}`);
    const txHash = await requestFaucet(address, apiKeyId, privateKey);
    
    console.log(`Faucet successful! Transaction: ${txHash}`);
    res.json({ 
      success: true, 
      transactionHash: txHash,
      message: "USDC will arrive shortly"
    });
  } catch (error) {
    console.error("Faucet error:", error);
    res.status(500).json({ 
      error: error.message || "Faucet request failed",
      details: "may be hitting rate limits; try again in a few min"
    });
  }
});

// === VERIFICATION ENDPOINTS ===

// Check if a wallet is verified as human
app.get("/verify/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const verified = await isWalletVerified(address);
    
    res.json({
      address,
      isVerified: verified,
      requirements: {
        age: "21+",
        excludedCountries: "none",
        method: "Self Protocol ZK proof"
      }
    });
  } catch (error) {
    console.error("Verification check error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get full verification details
app.get("/verification/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const details = await getVerificationDetails(address);
    
    res.json(details);
  } catch (error) {
    console.error("Verification details error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Example: Protected endpoint that requires human verification
app.get("/humans-only", requireVerification, (req, res) => {
  res.json({
    message: "Welcome, verified human!",
    wallet: req.verifiedWallet,
    quote: "Only verified humans can see this secret message",
    timestamp: new Date().toISOString()
  });
});

// Example: Combine payment + verification requirements
app.get("/premium-humans", requireVerification, (req, res) => {
  // This endpoint requires BOTH:
  // 1. Human verification (via requireVerification middleware)
  // 2. x402 payment (via paymentMiddleware)
  res.json({
    message: "Premium content for verified humans who paid!",
    wallet: req.verifiedWallet,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`x402 demo server running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`   • GET  /health              - health check (public)`);
  console.log(`   • GET  /balance/:address    - USDC balance via CDP Token Balances API (public)`);
  console.log(`   • POST /faucet              - request test USDC via CDP Faucet API (public)`);
  console.log(`   • GET  /motivate            - motivational quote (requires 0.01 USDC payment)`);
  console.log(`   • GET  /verify/:address     - check if wallet is verified as human (public)`);
  console.log(`   • GET  /verification/:address - get full verification details (public)`);
  console.log(`   • GET  /humans-only         - protected endpoint (requires human verification)`);
  console.log(`   • GET  /premium-humans      - requires payment + verification`);
  console.log(`\nCDP products in use:`);
  console.log(`   • CDP x402 Facilitator - payment verification & settlement`);
  console.log(`   • CDP Faucet API       - test USDC distribution`);
  console.log(`   • CDP Token Balances   - real-time balance checking`);
  console.log(`\nSelf Protocol:`);
  console.log(`   • ZK Proof of Humanity - age 21+, all countries allowed`);
  console.log(`\nreceiving payments at: ${RECEIVER_WALLET}`);
  console.log(`Price: 0.01 USDC on Base Sepolia`);
});

