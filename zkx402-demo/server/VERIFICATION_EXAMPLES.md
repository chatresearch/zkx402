# Self Protocol Verification in Express.js

This guide shows how to use Self Protocol's ZK proof verification in your Express.js API.

## What Gets Verified

The Self Protocol ZK proof verifies:
- ✅ **Human**: Real person with valid passport/ID
- ✅ **Age 21+**: User meets minimum age requirement
- ✅ **Not excluded**: All countries allowed (no exclusions)

**Important**: The on-chain contract only stores **pass/fail** status. Individual attributes (exact age, nationality) are NOT stored on-chain for privacy. The ZK proof verifies requirements without revealing personal data.

## Quick Start

### 1. Check if a wallet is verified

```javascript
import { isWalletVerified } from "./verification.js";

const verified = await isWalletVerified("0x1234...");
console.log(verified); // true or false
```

### 2. Get verification details

```javascript
import { getVerificationDetails } from "./verification.js";

const details = await getVerificationDetails("0x1234...");
console.log(details);
// {
//   isVerified: true,
//   userIdentifier: "0xabcd...",
//   userAddress: "0x1234...",
//   userData: "0x...",
//   verifiedAt: "2024-11-22T10:30:00.000Z",
//   receivedAt: "2024-11-22T10:35:00.000Z"
// }
```

### 3. Protect routes with verification middleware

```javascript
import { requireVerification } from "./verification.js";

// Endpoint requires verified human
app.get("/secret", requireVerification, (req, res) => {
  res.json({
    message: "Only verified humans can see this!",
    wallet: req.verifiedWallet // Attached by middleware
  });
});
```

## API Endpoints

### GET /verify/:address
Check if a wallet is verified as human.

**Example:**
```bash
curl http://localhost:3001/verify/0xE37bdCA8f1206B861E3b2ECF29b3e07839d1ad2c
```

**Response:**
```json
{
  "address": "0xE37bdCA8f1206B861E3b2ECF29b3e07839d1ad2c",
  "isVerified": true,
  "requirements": {
    "age": "21+",
    "excludedCountries": "none",
    "method": "Self Protocol ZK proof"
  }
}
```

### GET /verification/:address
Get full verification details including timestamps.

**Example:**
```bash
curl http://localhost:3001/verification/0xE37bdCA8f1206B861E3b2ECF29b3e07839d1ad2c
```

**Response:**
```json
{
  "isVerified": true,
  "userIdentifier": "0x1234...",
  "userAddress": "0xE37bdCA8f1206B861E3b2ECF29b3e07839d1ad2c",
  "userData": "0x...",
  "verifiedAt": "2024-11-22T10:30:00.000Z",
  "receivedAt": "2024-11-22T10:35:00.000Z"
}
```

### GET /humans-only
Protected endpoint that requires human verification.

**Example:**
```bash
# Include wallet in query param
curl "http://localhost:3001/humans-only?wallet=0xE37bdCA8f1206B861E3b2ECF29b3e07839d1ad2c"

# Or in header
curl -H "X-Wallet-Address: 0xE37bdCA8f1206B861E3b2ECF29b3e07839d1ad2c" \
  http://localhost:3001/humans-only

# Or in POST body
curl -X POST http://localhost:3001/humans-only \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0xE37bdCA8f1206B861E3b2ECF29b3e07839d1ad2c"}'
```

**Success Response (200):**
```json
{
  "message": "Welcome, verified human!",
  "wallet": "0xE37bdCA8f1206B861E3b2ECF29b3e07839d1ad2c",
  "quote": "Only verified humans can see this secret message",
  "timestamp": "2024-11-22T10:40:00.000Z"
}
```

**Error Response (403):**
```json
{
  "error": "Verification required",
  "message": "This wallet must be verified as human via Self Protocol",
  "verifyUrl": "http://localhost:3000/verify"
}
```

## Advanced Usage

### Combining Payment + Verification

Require BOTH x402 payment AND human verification:

```javascript
import { requireVerification } from "./verification.js";
import { paymentMiddleware } from "x402-express";

// Apply both middlewares
app.use(paymentMiddleware(RECEIVER_WALLET, {
  "GET /premium": {
    price: "$0.10",
    network: "base-sepolia"
  }
}));

app.get("/premium", requireVerification, (req, res) => {
  // User must:
  // 1. Pay 0.10 USDC (x402)
  // 2. Be verified as human (Self Protocol)
  res.json({
    message: "Premium content for verified humans who paid!",
    wallet: req.verifiedWallet
  });
});
```

### Custom Verification Logic

```javascript
app.get("/custom", async (req, res) => {
  const { wallet } = req.query;
  
  // Check verification
  const verified = await isWalletVerified(wallet);
  
  if (!verified) {
    return res.status(403).json({
      error: "Not verified",
      hint: "Visit /verify to complete human verification"
    });
  }
  
  // Get details
  const details = await getVerificationDetails(wallet);
  
  // Custom logic based on verification timestamp
  const hoursSinceVerification = 
    (Date.now() - new Date(details.verifiedAt).getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceVerification > 24) {
    return res.status(403).json({
      error: "Verification expired",
      message: "Please verify again (24 hour limit)"
    });
  }
  
  res.json({ message: "Access granted!" });
});
```

## Understanding the Data

### What's Stored On-Chain (Base Sepolia)

The `ProofOfHumanReceiver` contract stores:
- `isVerified`: Boolean (true/false)
- `userIdentifier`: Unique identifier from Self
- `userAddress`: The wallet address
- `userData`: Additional data passed during verification
- `verifiedAt`: When the proof was created on Celo
- `receivedAt`: When the message arrived on Base via Hyperlane

### What's NOT Stored On-Chain

For privacy, these are NOT stored:
- ❌ Exact age
- ❌ Nationality/country
- ❌ Passport number
- ❌ Any personal identifiable information

The ZK proof verifies these requirements **without revealing the actual values**.

## FAQ

### Q: Can I check if someone is from a specific country?
**A:** No. The contract only stores pass/fail. To check nationality, you'd need to modify the contract to store it (not recommended for privacy).

### Q: Can I get the user's exact age?
**A:** No. The contract only verifies they meet the minimum age (21+), but doesn't store the exact age.

### Q: How do I check if someone is Russian?
**A:** You can't directly from the blockchain. The ZK proof verifies requirements silently. If you need nationality data, you'd need to:
1. Store it in the contract (requires contract changes)
2. Or use the Self SDK on the frontend to get attributes client-side
3. Or have users self-report and verify it matches their proof

For this demo, the contract verifies age 21+ with NO country exclusions.

### Q: Does this work on mainnet?
**A:** Currently configured for Base Sepolia testnet. For mainnet:
1. Deploy contracts to Base mainnet
2. Change RPC URL to mainnet
3. Use real Self passports (not mock)
4. Update contract addresses in `.env`

## Environment Setup

Add to `server/.env`:

```bash
# Base Sepolia contract address
BASE_PROOF_OF_HUMAN_RECEIVER=0xe1cb350fBB5F4b3e9e489eF1D6C11cc086dc1982

# Optional: Your frontend URL for verification redirects
CLIENT_URL=http://localhost:3000
```

## Testing

```bash
# 1. Start your server
cd server
npm run dev

# 2. Check a verified wallet
curl http://localhost:3001/verify/0xE37bdCA8f1206B861E3b2ECF29b3e07839d1ad2c

# 3. Try the protected endpoint
curl "http://localhost:3001/humans-only?wallet=0xE37bdCA8f1206B861E3b2ECF29b3e07839d1ad2c"

# 4. Try with unverified wallet (should fail)
curl "http://localhost:3001/humans-only?wallet=0x0000000000000000000000000000000000000000"
```

## Contract Address

- **Base Sepolia**: `0xe1cb350fBB5F4b3e9e489eF1D6C11cc086dc1982`
- **Celo Sepolia**: `0x63aBd8C7ad05e6849Bf486c1E16157a7CF4f76A9`

View on BaseScan: https://sepolia.basescan.org/address/0xe1cb350fBB5F4b3e9e489eF1D6C11cc086dc1982

## Resources

- Self Protocol Docs: https://docs.self.xyz
- Hyperlane Docs: https://docs.hyperlane.xyz
- CDP x402: https://docs.cdp.coinbase.com

