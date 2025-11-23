# CDP Wallet Verification Contracts

Smart contracts for verifying CDP wallets are associated with real humans using Self Protocol ZK proofs, bridged from Celo to Base via Hyperlane.

## Architecture

```
User (Self App)              Celo Sepolia                  Base Sepolia
     ↓                            ↓                              ↓
Scan QR Code    →    ProofOfHumanSender    →    ProofOfHumanReceiver
(ZK Proof)           (Receives Self proof)       (Stores verification)
                     (Sends via Hyperlane)
```

## Contracts

### ProofOfHumanSender.sol (Celo Sepolia)
- Extends Self Protocol's `SelfVerificationRoot`
- Receives ZK proofs when users verify
- Stores verification locally: userIdentifier, userAddress, timestamp
- Auto-sends to Base via Hyperlane if contract has ETH balance
- Manual bridging: call `sendVerificationCrossChain()` with ETH

### ProofOfHumanReceiver.sol (Base Sepolia)
- Receives Hyperlane messages from Celo
- Stores verification status for CDP wallets
- Provides public view functions: `isVerified()`, `getVerification()`
- Supports trusted sender whitelist (optional)

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
forge script script/DeployReceiver.s.sol:DeployReceiver \
  --rpc-url base-sepolia \
  --broadcast \
  --verify
```

**Save the deployed address!** You'll see:
```
ProofOfHumanReceiver deployed at: 0xABC123...
```

Copy this address and add to `.env`:
```bash
BASE_PROOF_OF_HUMAN_RECEIVER=0xABC123...
```

### Step 3: Deploy to Celo Sepolia (SECOND!)

```bash
forge script script/DeploySender.s.sol:DeploySender \
  --rpc-url celo-sepolia \
  --broadcast \
  --verify
```

**Save the deployed address!** You'll see:
```
ProofOfHumanSender deployed at: 0xDEF456...
```

Copy this address and add to `.env`:
```bash
CELO_PROOF_OF_HUMAN_SENDER=0xDEF456...
```

### Step 4: Add Trusted Sender (Optional)

If you want to enable sender whitelist on Base:

```bash
cast send $BASE_PROOF_OF_HUMAN_RECEIVER \
  "addTrustedSender(address)" $CELO_PROOF_OF_HUMAN_SENDER \
  --rpc-url base-sepolia \
  --private-key $PRIVATE_KEY

# Enable enforcement
cast send $BASE_PROOF_OF_HUMAN_RECEIVER \
  "setTrustedSenderEnforcement(bool)" true \
  --rpc-url base-sepolia \
  --private-key $PRIVATE_KEY
```

## Verification Configuration

Current settings (configured in `script/DeploySender.s.sol`):

```solidity
minimumAge: 21                    // Must be 21 or older
excludedCountries: []             // No excluded countries (all allowed)
ofacEnabled: false                // OFAC check disabled
```

To change these, edit `script/DeploySender.s.sol` before deploying.

## Testing Your Deployment

### On Celo (Check ProofOfHumanSender)

```bash
# Check if contract was deployed correctly
cast call $CELO_PROOF_OF_HUMAN_SENDER "scope()(bytes32)" --rpc-url celo-sepolia

# Check destination (should be your Base receiver)
cast call $CELO_PROOF_OF_HUMAN_SENDER "defaultRecipient()(address)" --rpc-url celo-sepolia

# Check domain (should be 84532 for Base Sepolia)
cast call $CELO_PROOF_OF_HUMAN_SENDER "DESTINATION_DOMAIN()(uint32)" --rpc-url celo-sepolia

# Check last verification
cast call $CELO_PROOF_OF_HUMAN_SENDER "verificationSuccessful()(bool)" --rpc-url celo-sepolia
```

### On Base (Check ProofOfHumanReceiver)

```bash
# Check source domain (should be 11142220 for Celo Sepolia)
cast call $BASE_PROOF_OF_HUMAN_RECEIVER "SOURCE_DOMAIN()(uint32)" --rpc-url base-sepolia

# Check if trusted sender enforcement is enabled
cast call $BASE_PROOF_OF_HUMAN_RECEIVER "enforceTrustedSenders()(bool)" --rpc-url base-sepolia

# Check verification count
cast call $BASE_PROOF_OF_HUMAN_RECEIVER "verificationCount()(uint256)" --rpc-url base-sepolia

# Check if a user is verified (example)
cast call $BASE_PROOF_OF_HUMAN_RECEIVER \
  "isVerified(address)(bool)" \
  0xYourWalletAddress \
  --rpc-url base-sepolia
```

## Contract Addresses

**Hyperlane (Already Deployed):**
- Celo Sepolia Mailbox: `0xD0680F80F4f947968206806C2598Cbc5b6FE5b03`
- Base Sepolia Mailbox: `0x6966b0E55883d49BFB24539356a2f8A673E02039`

**Self Protocol (Already Deployed):**
- Celo Sepolia Hub: `0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74`

**Your Contracts (You Deploy):**
- ProofOfHumanSender (Celo): `<YOUR_DEPLOYED_ADDRESS>`
- ProofOfHumanReceiver (Base): `<YOUR_DEPLOYED_ADDRESS>`

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
forge verify-contract $CELO_PROOF_OF_HUMAN_SENDER \
  src/ProofOfHumanSender.sol:ProofOfHumanSender \
  --chain celo-sepolia \
  --constructor-args $(cast abi-encode "constructor(address,string,(uint256,string[],bool),address,uint32,address)" \
    0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74 \
    "zkx402" \
    "(21,[],false)" \
    0xD0680F80F4f947968206806C2598Cbc5b6FE5b03 \
    84532 \
    $BASE_PROOF_OF_HUMAN_RECEIVER)
```

**Base:**
```bash
forge verify-contract $BASE_PROOF_OF_HUMAN_RECEIVER \
  src/ProofOfHumanReceiver.sol:ProofOfHumanReceiver \
  --chain base-sepolia \
  --constructor-args $(cast abi-encode "constructor(address,uint32)" \
    0x6966b0E55883d49BFB24539356a2f8A673E02039 \
    11142220)
```

### Issue: "Wrong source chain" or "Untrusted sender"

The Base contract may reject messages from unknown sources. Make sure:
1. You deployed Base first, then Celo with the correct Base address
2. Or add Celo as trusted sender: `receiver.addTrustedSender(senderAddress)`
3. Enable enforcement: `receiver.setTrustedSenderEnforcement(true)`

## Contract ABIs

After deployment, ABIs are in:
```
out/ProofOfHumanSender.sol/ProofOfHumanSender.json
out/ProofOfHumanReceiver.sol/ProofOfHumanReceiver.json
```

Copy these to your frontend:
```bash
# From contracts/ directory
cp out/ProofOfHumanReceiver.sol/ProofOfHumanReceiver.json ../client/app/abis/
```

## Next Steps

After deploying contracts:

1. **Update frontend environment:**
   ```bash
   # In client/.env.local
   NEXT_PUBLIC_CELO_BRIDGE_ADDRESS=0xYourCeloSenderAddress
   NEXT_PUBLIC_BASE_REGISTRY_ADDRESS=0xYourBaseReceiverAddress
   ```

2. **Test with Self app:**
   - Create mock passport in Self app (age 21+)
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
