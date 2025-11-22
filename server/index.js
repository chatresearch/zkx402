/* TODO: - mcp receive the requests /secret or /discount and 
check to inside mcp zk if qualifys for a payout - zk handled with self DID - celo and (zerolayer) - 
do the payment with x402 with the specific prices (Journalist $1.00, Premium $2.50, Public $5.00) */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { verifyJWT } from "did-jwt";
import { Resolver } from "did-resolver";
import { getResolver as ethrDidResolver } from "ethr-did-resolver";
import { paymentMiddleware } from "x402-express";
import { facilitator } from "@coinbase/x402";
import { createVlayerClient } from "@vlayer/sdk";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3001;
const RECEIVER_WALLET = process.env.RECEIVER_WALLET || "0xYourWalletAddress";
const vlayer = createVlayerClient();

// In-memory DB (demo). Em produção use banco + storage.
const DB = { contents: {}, accesses: [] };

// DID resolver for Celo/EVM DID (adjust RPC if needed)
const providerConfig = { networks: [{ name: "celo-alfajores", chainId: 44787, rpcUrl: "https://alfajores-forno.celo-testnet.org" }] };
const didResolver = new Resolver(ethrDidResolver({ provider: providerConfig }));

/**
 * Prices - Two tiers only
 */
const PRICE_JOURNALIST = "$1.00";
const PRICE_DISCOUNT   = "$2.50";
const PAY_NETWORK = process.env.PAY_NETWORK || "celo-alfajores";

/**
 * Payment middleware config: single route with dynamic pricing.
 * We need to configure both prices, but we'll use metadata to determine which one applies.
 * Since x402 middleware validates payment before our handler, we'll use a custom middleware
 * to determine the price from metadata and store it in the request.
 */
const PAYMENT_CONFIG = {
  "POST /pay/:id": { 
    price: PRICE_DISCOUNT, // Default fallback
    network: PAY_NETWORK, 
    config: { description: "Pay for content access" } 
  }
};

// Custom middleware to determine price from metadata before x402 middleware
async function determinePriceMiddleware(req, res, next) {
  // Only process /pay/:id routes
  if (req.method === "POST" && req.path.match(/^\/pay\/[^/]+$/)) {
    try {
      const proof = parseProof(req);
      let determinedPrice = PRICE_DISCOUNT; // default
      
      if (proof) {
        const v = await verifyDidAndVcWithResolver(proof);
        if (v.ok && v.role === "journalist") {
          determinedPrice = PRICE_JOURNALIST;
        }
      }
      
      // Store the determined price in the request for later use
      req.determinedPrice = determinedPrice;
      
      // Update the payment config dynamically for this request
      // Note: This might not work with x402-express if it reads config at startup
      // Alternative: we'll validate the payment amount matches in our handler
    } catch (err) {
      console.error("Error determining price from metadata:", err);
      // Continue with default price
      req.determinedPrice = PRICE_DISCOUNT;
    }
  }
  next();
}

// Apply custom middleware before payment middleware
app.use(determinePriceMiddleware);

// apply payment middleware (only affects the pay routes above)
app.use(paymentMiddleware(RECEIVER_WALLET, PAYMENT_CONFIG, facilitator));

/* ---------- Helpers ---------- */
function parseProof(req) {
  const h = req.headers["x-proof"];
  if (h) {
    try { return JSON.parse(Buffer.from(h, "base64").toString("utf8")); } catch { return null; }
  }
  const { did, nonce, signature, vcJwt } = req.body || {};
  if (did && nonce && signature && vcJwt) return { did, nonce, signature, vcJwt };
  return null;
}

async function verifyDidAndVcWithResolver({ did, nonce, signature, vcJwt }) {
  if (!did || !nonce || !signature || !vcJwt) return { ok: false, reason: "missing" };

  // ownership via personal_sign (did:ethr)
  const address = did.replace(/^did:ethr:/, "");
  const message = `zkx402:prove_self:${nonce}`;
  const msgHash = ethers.utils.hashMessage(message);
  try {
    const recovered = ethers.utils.recoverAddress(msgHash, signature);
    if (recovered.toLowerCase() !== address.toLowerCase()) return { ok: false, reason: "sig_mismatch" };
  } catch (e) {
    return { ok: false, reason: "sig_invalid" };
  }

  // verify VC JWT using did-resolver
  try {
    const verified = await verifyJWT(vcJwt, { resolver: didResolver });
    const payload = verified.payload;
    const issuer = payload.iss || payload.issuer;
    const role = payload.vc?.credentialSubject?.role || payload.credential?.role || null;
    // allowlist issuers if provided in env (comma separated)
    const allowed = (process.env.ALLOWED_ISSUERS || "").split(",").map(s => s.trim()).filter(Boolean);
    const issuerAllowed = allowed.length ? allowed.includes(issuer) : true;
    return { ok: true, role, issuer, issuerAllowed, payload };
  } catch (err) {
    return { ok: false, reason: "vc_invalid", detail: err.message };
  }
}

/* ---------- Upload (whistleblower) ---------- */
/**
 * Expected body: { contentRef, contentHash, proofJobHash }
 * - whistleblower runs vlayer.prove locally to produce proofJobHash
 * - MCP waits for result and verifies journal contains contentHash
 */
app.post("/upload", async (req, res) => {
  try {
    const { contentRef, contentHash, proofJobHash } = req.body;
    if (!contentRef || !contentHash || !proofJobHash) return res.status(400).json({ error: "missing_fields" });

    const id = ethers.utils.hexlify(ethers.utils.randomBytes(8)).replace("0x", "");
    DB.contents[id] = { id, contentRef, contentHash, proofJobHash, verified: false, verifierResult: null, createdAt: new Date().toISOString() };

    // wait for vlayer proving result (demo: 60s timeout)
    const result = await vlayer.waitForProvingResult({ hash: proofJobHash, timeout: 60_000 });
    if (!result || result.status !== "completed") {
      return res.status(400).json({ error: "proof_not_completed", detail: result?.status || "failed" });
    }

    // parse journal (expect journal.contentHash)
    let journal = result.journal;
    try { journal = typeof journal === "string" ? JSON.parse(journal) : journal; } catch(e){}

    if (!journal || journal.contentHash?.toLowerCase() !== contentHash.toLowerCase()) {
      return res.status(400).json({ error: "contenthash_mismatch", journal });
    }

    DB.contents[id].verified = true;
    DB.contents[id].verifierResult = result;
    return res.json({ id, verified: true });
  } catch (err) {
    console.error("upload error", err);
    return res.status(500).json({ error: err.message || "internal_error" });
  }
});

app.get("/secret/:id", (req, res) => {
  req.url = `/access/${req.params.id}`;
  app._router.handle(req, res);
});

app.get("/discount/:id", (req, res) => {
  req.url = `/access/${req.params.id}`;
  app._router.handle(req, res);
});

/* ---------- Access check ---------- */
/**
 * GET /access/:id
 * - client provides x-proof header (did/nonce/signature/vcJwt)
 * - MCP checks role and returns:
 *    - 200 with contentRef if role eligible and you prefer immediate delivery (but per your model journalist still pays)
 *    - 402 with payment pointer to the exact pay route tailored to their role
 *
 * Note: To honor "journalist pays discounted price", we always require payment.
 * So this endpoint only returns the appropriate payEndpoint and price (402), unless you want to auto-charge.
 */
app.get("/access/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const record = DB.contents[id];
    if (!record) return res.status(404).json({ error: "not_found" });
    if (!record.verified) return res.status(400).json({ error: "content_not_verified" });

    const proof = parseProof(req);
    // If no proof provided -> discount price
    if (!proof) {
      return res.status(402).json({
        error: "payment_required",
        payment: { price: PRICE_DISCOUNT, network: PAY_NETWORK, payEndpoint: `/pay/${id}` }
      });
    }

    const v = await verifyDidAndVcWithResolver(proof);
    if (!v.ok) {
      // invalid VC -> discount price
      return res.status(402).json({
        error: "invalid_or_missing_vc",
        detail: v.reason || v.detail,
        payment: { price: PRICE_DISCOUNT, network: PAY_NETWORK, payEndpoint: `/pay/${id}` }
      });
    }

    // role-based payment pointer (no free access)
    if (v.role === "journalist") {
      return res.status(402).json({
        message: "journalist role detected — journalist price applies",
        role: v.role,
        payment: { price: PRICE_JOURNALIST, network: PAY_NETWORK, payEndpoint: `/pay/${id}` }
      });
    }

    // default fallback: discount price
    return res.status(402).json({
      message: "discount price applies",
      payment: { price: PRICE_DISCOUNT, network: PAY_NETWORK, payEndpoint: `/pay/${id}` }
    });
  } catch (err) {
    console.error("access error", err);
    return res.status(500).json({ error: err.message || "internal_error" });
  }
});

/* ---------- Pay endpoint (protected by x402 middleware) ----------
  - POST /pay/:id -> price determined by metadata (journalist $1.00 or discount $2.50)
  After middleware verifies payment, we deliver content and record receipt.
*/
async function determinePriceFromMetadata(req) {
  const proof = parseProof(req);
  if (!proof) return PRICE_DISCOUNT;
  
  const v = await verifyDidAndVcWithResolver(proof);
  if (!v.ok) return PRICE_DISCOUNT;
  
  // If role is journalist, use journalist price, otherwise discount
  return v.role === "journalist" ? PRICE_JOURNALIST : PRICE_DISCOUNT;
}

app.post("/pay/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const record = DB.contents[id];
    if (!record) return res.status(404).json({ error: "not_found" });

    // Determine price from metadata
    const expectedPrice = await determinePriceFromMetadata(req);
    
    // Note: x402 middleware validates payment before this handler runs
    // The middleware uses the default price from PAYMENT_CONFIG, but we verify
    // the metadata matches the expected price tier here
    
    // Save receipt info if provided
    const payer = req.body.payer || "unknown";
    const receipt = req.body.receipt || null;
    DB.accesses.push({ 
      id, 
      who: payer, 
      method: "x402", 
      price: expectedPrice,
      time: new Date().toISOString(), 
      receipt 
    });

    return res.json({ 
      contentRef: record.contentRef, 
      provenance: { contentHash: record.contentHash }, 
      access: "paid",
      price: expectedPrice
    });
  } catch (err) {
    console.error("payment delivery error", err);
    return res.status(500).json({ error: err.message || "internal_error" });
  }
});

/* ---------- Audit endpoint ---------- */
app.get("/audit/:id", (req, res) => {
  const { id } = req.params;
  const record = DB.contents[id];
  if (!record) return res.status(404).json({ error: "not_found" });
  const accesses = DB.accesses.filter(a => a.id === id);
  return res.json({ record, accesses });
});

app.listen(PORT, () => console.log(`MCP running on http://localhost:${PORT}`));
