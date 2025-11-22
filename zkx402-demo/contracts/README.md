# CDP Wallet Verification Contracts

Smart contracts for verifying CDP wallets are associated with real humans using Self Protocol ZK proofs, bridged from Celo to Base via Hyperlane.

## Architecture

```
User (Self App)              Celo Sepolia                Base Sepolia
     ↓                            ↓                           ↓
Scan QR Code    →    ProofOfHumanBridge    →    VerificationRegistry
(ZK Proof)           (Receives Self proof)       (Stores verification)
                     (Sends via Hyperlane)
```

## Contracts

### ProofOfHumanBridge.sol (Celo Sepolia)
- Extends Self Protocol's `SelfVerificationRoot`
- Receives ZK proofs when users verify
- Stores: verified, timestamp, isFromRussia, nationality
- Sends verification to Base via Hyperlane

### VerificationRegistry.sol (Base Sepolia)
- Receives Hyperlane messages from Celo
- Stores verification status for CDP wallets
- Provides public view functions for checking verification

## Prerequisites

Before deploying, you need:

1. **Testnet funds:**
   - Celo Sepolia: https://faucet.celo.org/alfajores
   - Base Sepolia: https://www.coinbase.com/faucets/base-sepolia-faucet

2. **Private key** with funds on both chains

3. **API keys (optional, for verification):**
   - CeloScan: https://celoscan.io/apis
   - BaseScan: https://basescan.org/apis

4. **Self mobile app** installed for testing

## Quick Start

### Step 1: Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env
```

Required values:
```bash
PRIVATE_KEY=0xyour_private_key_here  # Same key for both chains
```

Optional (for contract verification on explorers):
```bash
CELOSCAN_API_KEY=your_key_here
BASESCAN_API_KEY=your_key_here
```

### Step 2: Deploy to Base Sepolia (FIRST!)

```bash
forge script script/DeployBase.s.sol:DeployBase \
  --rpc-url base-sepolia \
  --broadcast \
  --verify
```

**Save the deployed address!** You'll see:
```
VerificationRegistry deployed at: 0xABC123...
```

Copy this address and add to `.env`:
```bash
BASE_VERIFICATION_REGISTRY=0xABC123...
```

### Step 3: Deploy to Celo Sepolia (SECOND!)

```bash
forge script script/DeployCelo.s.sol:DeployCelo \
  --rpc-url celo-sepolia \
  --broadcast \
  --verify
```

**Save the deployed address!** You'll see:
```
ProofOfHumanBridge deployed at: 0xDEF456...
```

Copy this address and add to `.env`:
```bash
CELO_PROOF_OF_HUMAN_BRIDGE=0xDEF456...
```

### Step 4: Update Base Contract (if needed)

If you deployed Base with a placeholder (0xdead), update it:

```bash
cast send $BASE_VERIFICATION_REGISTRY \
  "updateSourceContract(address)" $CELO_PROOF_OF_HUMAN_BRIDGE \
  --rpc-url base-sepolia \
  --private-key $PRIVATE_KEY
```

## Verification Configuration

Current settings (configured in `script/DeployCelo.s.sol`):

```solidity
minimumAge: 18                    // Must be 18 or older
excludedCountries: [Russia]       // Russian nationals rejected
ofacEnabled: false                // OFAC check disabled
```

To change these, edit `script/DeployCelo.s.sol` before deploying.

## Testing Your Deployment

### On Celo (Check ProofOfHumanBridge)

```bash
# Check if contract was deployed correctly
cast call $CELO_PROOF_OF_HUMAN_BRIDGE "scope()(bytes32)" --rpc-url celo-sepolia

# Check destination (should be your Base registry)
cast call $CELO_PROOF_OF_HUMAN_BRIDGE "destinationRegistry()(address)" --rpc-url celo-sepolia

# Check domain (should be 84532 for Base Sepolia)
cast call $CELO_PROOF_OF_HUMAN_BRIDGE "destinationDomain()(uint32)" --rpc-url celo-sepolia
```

### On Base (Check VerificationRegistry)

```bash
# Check source domain (should be 44787 for Celo Sepolia)
cast call $BASE_VERIFICATION_REGISTRY "sourceDomain()(uint32)" --rpc-url base-sepolia

# Check source contract (should be your Celo bridge)
cast call $BASE_VERIFICATION_REGISTRY "sourceContract()(address)" --rpc-url base-sepolia

# Check if a user is verified (example)
cast call $BASE_VERIFICATION_REGISTRY \
  "isVerified(address)(bool)" \
  0xYourWalletAddress \
  --rpc-url base-sepolia
```

## Contract Addresses

**Hyperlane (Already Deployed):**
- Celo Sepolia Mailbox: `0xEf9F292fcEBC3848bF4bB92a96a04F9ECBb78E59`
- Base Sepolia Mailbox: `0xfFAEF09B3cd11D9b20d1a19bECca54EEC2884766`

**Self Protocol (Already Deployed):**
- Celo Sepolia Hub: `0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74`

**Your Contracts (You Deploy):**
- ProofOfHumanBridge (Celo): `<YOUR_DEPLOYED_ADDRESS>`
- VerificationRegistry (Base): `<YOUR_DEPLOYED_ADDRESS>`

## Common Issues

### Issue: "Chain not supported"

**Solution:** Update Foundry to 0.3.0+
```bash
foundryup --install 0.3.0
```

### Issue: "Deploy Base first"

The Celo contract needs to know the Base contract address. Always deploy Base first!

### Issue: Contract verification fails

Add API keys to `.env` or verify manually:

**Celo:**
```bash
forge verify-contract $CELO_PROOF_OF_HUMAN_BRIDGE \
  src/ProofOfHumanBridge.sol:ProofOfHumanBridge \
  --chain celo-sepolia \
  --constructor-args $(cast abi-encode "constructor(address,string,(uint256,string[],bool),address,uint32,address)" \
    0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74 \
    "cdp-agent-verification" \
    "(18,[\"RUS\"],false)" \
    0xEf9F292fcEBC3848bF4bB92a96a04F9ECBb78E59 \
    84532 \
    $BASE_VERIFICATION_REGISTRY)
```

**Base:**
```bash
forge verify-contract $BASE_VERIFICATION_REGISTRY \
  src/VerificationRegistry.sol:VerificationRegistry \
  --chain base-sepolia \
  --constructor-args $(cast abi-encode "constructor(address,uint32,address)" \
    0xfFAEF09B3cd11D9b20d1a19bECca54EEC2884766 \
    44787 \
    $CELO_PROOF_OF_HUMAN_BRIDGE)
```

### Issue: "Wrong source chain" or "Wrong source contract"

The Base contract rejects messages from unknown sources. Make sure:
1. You deployed Celo with the correct Base address
2. Or you updated Base's `sourceContract` after deploying Celo

## Contract ABIs

After deployment, ABIs are in:
```
out/ProofOfHumanBridge.sol/ProofOfHumanBridge.json
out/VerificationRegistry.sol/VerificationRegistry.json
```

Copy these to your frontend:
```bash
# From contracts/ directory
cp out/VerificationRegistry.sol/VerificationRegistry.json ../client/app/abis/
```

## Next Steps

After deploying contracts:

1. **Update frontend environment:**
   ```bash
   # In client/.env.local
   NEXT_PUBLIC_CELO_BRIDGE_ADDRESS=0xYourCeloAddress
   NEXT_PUBLIC_BASE_REGISTRY_ADDRESS=0xYourBaseAddress
   ```

2. **Test with Self app:**
   - Create mock passport in Self app
   - Scan QR code from your frontend
   - Wait 2-5 minutes for Hyperlane
   - Check Base contract for verification

3. **View on explorers:**
   - Celo: https://celo-sepolia.blockscout.com/address/YOUR_ADDRESS
   - Base: https://sepolia.basescan.org/address/YOUR_ADDRESS

## Resources

- [Self Protocol Docs](https://docs.self.xyz/)
- [Hyperlane Docs](https://docs.hyperlane.xyz/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Workshop Repo](https://github.com/self-xyz/workshop)

## Support

- Telegram: https://t.me/selfprotocolbuilder
- Discord: [Your Discord]
- Issues: [Your GitHub Issues]
