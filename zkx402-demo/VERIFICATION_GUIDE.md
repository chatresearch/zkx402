# CDP Wallet + Self ZK Proof Verification

Complete implementation guide for verifying CDP wallets with Self Protocol, bridged cross-chain via Hyperlane.

## 📁 What Was Built

### Smart Contracts (`/contracts`)
1. **ProofOfHumanBridge.sol** (Celo Sepolia)
   - Receives Self Protocol ZK proofs
   - Stores: verified, timestamp, isFromRussia, nationality
   - Bridges to Base via Hyperlane

2. **VerificationRegistry.sol** (Base Sepolia)
   - Receives Hyperlane messages from Celo
   - Stores verification status for CDP wallets
   - Provides public view functions

### Frontend (`/client/app`)
1. **/verify/page.tsx** - Verification page with Self QR code
2. **page.tsx** - Main page with verification status banner

### Deployment Scripts (`/contracts/script`)
1. **DeployBase.s.sol** - Deploy to Base Sepolia
2. **DeployCelo.s.sol** - Deploy to Celo Sepolia

## 🚀 How to Deploy & Test

### Step 1: Deploy Contracts

```bash
cd contracts

# 1. Setup environment
cp .env.example .env
# Edit .env with your PRIVATE_KEY

# 2. Deploy to Base FIRST
forge script script/DeployBase.s.sol:DeployBase \
  --rpc-url base-sepolia \
  --broadcast

# Save the Base address, add to .env:
# BASE_VERIFICATION_REGISTRY=0xYourAddress

# 3. Deploy to Celo SECOND
forge script script/DeployCelo.s.sol:DeployCelo \
  --rpc-url celo-sepolia \
  --broadcast

# Save the Celo address, add to .env:
# CELO_PROOF_OF_HUMAN_BRIDGE=0xYourAddress
```

### Step 2: Update Base Contract

If Base was deployed with placeholder, update it:
```bash
cast send $BASE_VERIFICATION_REGISTRY \
  "updateSourceContract(address)" $CELO_PROOF_OF_HUMAN_BRIDGE \
  --rpc-url base-sepolia \
  --private-key $PRIVATE_KEY
```

### Step 3: Configure Frontend

```bash
cd ../client

# Copy and edit environment
cp .env.local.example .env.local
```

Update `.env.local`:
```
NEXT_PUBLIC_CDP_PROJECT_ID=<your-cdp-project-id>
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CELO_BRIDGE_ADDRESS=<your-celo-contract>
NEXT_PUBLIC_BASE_REGISTRY_ADDRESS=<your-base-contract>
```

### Step 4: Start the App

```bash
# Terminal 1: Start server
cd server
npm run dev:server

# Terminal 2: Start client
cd client
npm run dev:client
```

### Step 5: Test Verification

1. **Open app**: http://localhost:3000
2. **Sign in**: Use CDP Embedded Wallet
3. **Verify**: Click "Verify Now" → Scan QR with Self app
4. **Wait**: 2-5 minutes for Hyperlane to bridge
5. **Check**: Page shows "✓ verified human"

## 📱 Self App Configuration

### Create Mock Passport

In Self mobile app:
1. Open app → Create Mock Passport
2. Set nationality (test with different countries)
3. Set age (must be 18+)
4. Save mock passport

### Test Scenarios

**Scenario 1: Valid User (Canadian, age 25)**
```
Nationality: Canada
Age: 25
Expected: ✅ Verification passes
```

**Scenario 2: Blocked User (Russian, age 30)**
```
Nationality: Russia
Age: 30
Expected: ❌ Verification fails (Russia excluded)
```

**Scenario 3: Too Young (UK, age 17)**
```
Nationality: United Kingdom
Age: 17
Expected: ❌ Verification fails (under 18)
```

## 🔍 Verification Configuration

Current settings (in `DeployCelo.s.sol`):
```solidity
minimumAge: 18                // Must be 18+
excludedCountries: [Russia]   // Russian nationals blocked
ofacEnabled: false            // OFAC disabled
```

## 📊 What Gets Stored

### On Celo (ProofOfHumanBridge)
```javascript
{
  verified: true,
  timestamp: 1700000000,
  hyperlaneMessageId: "0x123...",
  isFromRussia: false,
  nationality: "CAN"
}
```

### On Base (VerificationRegistry)
```javascript
{
  verified: true,
  timestamp: 1700000000,
  isFromRussia: false,
  nationality: "CAN"
}
```

## 🎯 Frontend Features

### Main Page (`/`)
- **Verification Banner**: Shows verified status or "Verify Now" button
- **Nationality Display**: Shows user's country
- **Refresh Button**: Manually check verification status
- Integrates with existing x402 demo

### Verify Page (`/verify`)
- **QR Code Generation**: Creates Self QR with CDP wallet address
- **Auto-Polling**: Checks Base contract every 10 seconds
- **Status Updates**: Shows pending → verified states
- **Requirements Display**: Shows age and country rules

## 🔗 Contract Queries

### Check Verification (JavaScript)
```javascript
import { ethers } from "ethers";

const provider = new ethers.BrowserProvider(window.ethereum);
const registry = new ethers.Contract(
  BASE_REGISTRY_ADDRESS,
  [
    "function isVerified(address) view returns (bool)",
    "function getNationality(address) view returns (string)",
    "function isFromRussia(address) view returns (bool)",
    "function getVerificationDetails(address) view returns (bool, uint256, bytes32, bool, string)"
  ],
  provider
);

// Check if verified
const isVerified = await registry.isVerified(userAddress);

// Get nationality
const nationality = await registry.getNationality(userAddress);

// Get all details
const details = await registry.getVerificationDetails(userAddress);
```

### Check Verification (Command Line)
```bash
# Check if address is verified
cast call $BASE_VERIFICATION_REGISTRY \
  "isVerified(address)(bool)" \
  0xYourWalletAddress \
  --rpc-url base-sepolia

# Get nationality
cast call $BASE_VERIFICATION_REGISTRY \
  "getNationality(address)(string)" \
  0xYourWalletAddress \
  --rpc-url base-sepolia
```

## 🛠 Troubleshooting

### Issue: QR Code doesn't generate
- **Check**: Contract addresses in `.env.local`
- **Fix**: Make sure both contracts are deployed

### Issue: Verification not showing on Base
- **Check**: Wait 2-5 minutes for Hyperlane
- **Check**: Celo transaction succeeded
- **Fix**: Click "Refresh" button or check Hyperlane explorer

### Issue: "Wrong source contract" error
- **Check**: Base contract's `sourceContract` matches Celo address
- **Fix**: Run `updateSourceContract()` on Base

### Issue: Self app rejects verification
- **Check**: Mock passport nationality not in excluded list
- **Check**: Mock passport age is 18+
- **Fix**: Update mock passport in Self app

## 📚 Architecture Flow

```
1. USER                    2. CELO                    3. BASE
   ↓                          ↓                          ↓
[Self App]              [ProofOfHuman]          [VerificationRegistry]
Scan QR     →  ZK Proof  →  Store locally    →  Receives message
Mock passport              Send Hyperlane         Stores verified
Age: 25                    2-5 min delivery        Returns status
Nationality: CAN
                                    ↓
                          4. YOUR APP (Base)
                                    ↓
                          Check registry.isVerified()
                          Display: ✅ Verified Human
                          Show: Nationality: CAN
```

## 🎓 Key Concepts

### Zero-Knowledge Proofs
- Passport data stays on user's phone
- Only proves claims (age ≥18, nationality = X)
- No personal data revealed on-chain

### Hyperlane Bridge
- Trustless cross-chain messaging
- Validators sign messages
- Relayers deliver to destination
- Takes 2-5 minutes

### CDP Embedded Wallet
- Web2-friendly authentication
- No browser extension needed
- Email/SMS/OAuth sign-in
- Ethereum-compatible addresses

## 📦 Dependencies

### Contracts
- Foundry (Solidity toolkit)
- Hyperlane contracts
- Self Protocol contracts
- OpenZeppelin

### Frontend
- Next.js 14
- @coinbase/cdp-hooks (Embedded Wallet)
- @selfxyz/qrcode (QR code generation)
- ethers.js (Contract interaction)

## 🔐 Security Notes

- Private keys never leave contracts folder
- Mock passports for testnet only
- Real passports require mainnet
- Hyperlane uses validator security model
- Self uses zkSNARK proofs

## 📝 Next Steps

1. **Test thoroughly**: Try different nationalities and ages
2. **Add features**: Gate x402 endpoints with verification
3. **Improve UX**: Add loading states, better error messages
4. **Deploy mainnet**: Use real passports on Celo mainnet
5. **Monitor**: Watch Hyperlane bridge for messages

## 🆘 Support

- **Self Protocol**: https://t.me/selfprotocolbuilder
- **Hyperlane**: https://docs.hyperlane.xyz/
- **CDP**: https://docs.cdp.coinbase.com/

## ✅ Testing Checklist

- [ ] Contracts deployed to both chains
- [ ] Frontend environment variables set
- [ ] Self mock passport created
- [ ] QR code generates successfully
- [ ] Self app scans and verifies
- [ ] Hyperlane message delivers (2-5 min)
- [ ] Base shows verification status
- [ ] Nationality displays correctly
- [ ] Refresh button works
- [ ] Blocked countries rejected (Russia)
- [ ] Underage users rejected (<18)

---

**Built for ETHGlobal Hackathon** 🚀

Combining CDP AgentKit wallets + Self Protocol ZK proofs + Hyperlane cross-chain messaging for verified human agents.

