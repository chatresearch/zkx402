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
 * Prices (Opção A)
 */
const PRICE_JOURNALIST = "$1.00";
const PRICE_PREMIUM   = "$2.50";
const PRICE_PUBLIC    = "$5.00";
const PAY_NETWORK = process.env.PAY_NETWORK || "celo-alfajores";

/**
 * Payment middleware config: one route per price tier.
 * x402-express expects a mapping of "<METHOD> <PATH>": { price, network }
 */
const PAYMENT_CONFIG = {
  "POST /pay/journalist/:id": { price: PRICE_JOURNALIST, network: PAY_NETWORK, config:{description:"Pay journalist price"} },
  "POST /pay/discount/:id":   { price: PRICE_PREMIUM,   network: PAY_NETWORK, config:{description:"Pay premium price"} },
  "POST /pay/full/:id":       { price: PRICE_PUBLIC,    network: PAY_NETWORK, config:{description:"Pay full public price"} }
};

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
    // If no proof provided -> public price
    if (!proof) {
      return res.status(402).json({
        error: "payment_required",
        payment: { price: PRICE_PUBLIC, network: PAY_NETWORK, payEndpoint: `/pay/full/${id}` }
      });
    }

    const v = await verifyDidAndVcWithResolver(proof);
    if (!v.ok) {
      // invalid VC -> public price
      return res.status(402).json({
        error: "invalid_or_missing_vc",
        detail: v.reason || v.detail,
        payment: { price: PRICE_PUBLIC, network: PAY_NETWORK, payEndpoint: `/pay/full/${id}` }
      });
    }

    // role-based payment pointer (no free access)
    if (v.role === "journalist") {
      return res.status(402).json({
        message: "journalist role detected — discounted price applies",
        role: v.role,
        payment: { price: PRICE_JOURNALIST, network: PAY_NETWORK, payEndpoint: `/pay/journalist/${id}` }
      });
    }

    if (v.role === "premium") {
      return res.status(402).json({
        message: "premium role detected — discounted price applies",
        role: v.role,
        payment: { price: PRICE_PREMIUM, network: PAY_NETWORK, payEndpoint: `/pay/discount/${id}` }
      });
    }

    // default fallback: public
    return res.status(402).json({
      message: "no discount applicable — public price",
      payment: { price: PRICE_PUBLIC, network: PAY_NETWORK, payEndpoint: `/pay/full/${id}` }
    });
  } catch (err) {
    console.error("access error", err);
    return res.status(500).json({ error: err.message || "internal_error" });
  }
});

/* ---------- Pay endpoints (protected by x402 middleware) ----------
  - POST /pay/journalist/:id  -> price $1.00
  - POST /pay/discount/:id    -> price $2.50
  - POST /pay/full/:id        -> price $5.00
  After middleware verifies payment, we deliver content and record receipt.
*/
function deliverAfterPayment(req, res, id) {
  const record = DB.contents[id];
  if (!record) return res.status(404).json({ error: "not_found" });

  // Assume middleware validated payment. Save receipt info if provided.
  const payer = req.body.payer || "unknown";
  const receipt = req.body.receipt || null;
  DB.accesses.push({ id, who: payer, method: "x402", time: new Date().toISOString(), receipt });

  return res.json({ contentRef: record.contentRef, provenance: { contentHash: record.contentHash }, access: "paid" });
}

app.post("/pay/journalist/:id", (req, res) => deliverAfterPayment(req, res, req.params.id));
app.post("/pay/discount/:id",   (req, res) => deliverAfterPayment(req, res, req.params.id));
app.post("/pay/full/:id",       (req, res) => deliverAfterPayment(req, res, req.params.id));

/* ---------- Audit endpoint ---------- */
app.get("/audit/:id", (req, res) => {
  const { id } = req.params;
  const record = DB.contents[id];
  if (!record) return res.status(404).json({ error: "not_found" });
  const accesses = DB.accesses.filter(a => a.id === id);
  return res.json({ record, accesses });
});

app.listen(PORT, () => console.log(`MCP running on http://localhost:${PORT}`));
