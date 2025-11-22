# Self + Hyperlane Deployment Guide

## Prerequisites
```bash
cd /Users/ballew/Documents/repos/ethglobal-playground/x402-demo/contracts
source .env
```

## Step 1: Deploy Base Receiver

```bash
forge script script/DeployReceiver.s.sol:DeployReceiver \
  --rpc-url base-sepolia \
  --broadcast \
  --verify
```

**Copy the deployed address and update .env:**
```bash
BASE_PROOF_OF_HUMAN_RECEIVER=0xYourDeployedAddress
```

## Step 2: Deploy Celo Sender

```bash
forge script script/DeploySender.s.sol:DeploySender \
  --rpc-url celo-sepolia \
  --broadcast \
  --verify
```

**Copy the deployed address:**
```bash
CELO_PROOF_OF_HUMAN_SENDER=0xYourDeployedAddress
```

## Step 3: Add Sender as Trusted

On Base, add the Celo sender as trusted:

```bash
cast send $BASE_PROOF_OF_HUMAN_RECEIVER \
  "addTrustedSender(address)" $CELO_PROOF_OF_HUMAN_SENDER \
  --rpc-url base-sepolia \
  --private-key $PRIVATE_KEY
```

## Step 4: Update Frontend

Update `x402-demo/client/.env.local`:
```
NEXT_PUBLIC_CELO_BRIDGE_ADDRESS=<CELO_PROOF_OF_HUMAN_SENDER>
NEXT_PUBLIC_BASE_REGISTRY_ADDRESS=<BASE_PROOF_OF_HUMAN_RECEIVER>
```

## Usage Flow

### 1. Self Verification (Frontend)
- User scans QR code
- Verification completes on Celo
- User sees "Verification Complete!"

### 2. Manual Bridge (Call from Frontend or CLI)

**From CLI:**
```bash
cast send $CELO_PROOF_OF_HUMAN_SENDER \
  "sendVerificationCrossChain(address)" $BASE_PROOF_OF_HUMAN_RECEIVER \
  --value 0.001ether \
  --rpc-url celo-sepolia \
  --private-key $PRIVATE_KEY
```

**From Frontend (need to add button):**
```typescript
const tx = await senderContract.sendVerificationCrossChain(
  receiverAddress,
  { value: ethers.parseEther("0.001") }
);
```

### 3. Wait for Hyperlane
- Takes 2-5 minutes for validators to sign and relayers to deliver
- Check Base: `cast call $BASE_PROOF_OF_HUMAN_RECEIVER "isVerified(address)" $USER_ADDRESS --rpc-url base-sepolia`

## Troubleshooting

### Check Verification on Celo
```bash
cast call $CELO_PROOF_OF_HUMAN_SENDER "verificationSuccessful()" --rpc-url celo-sepolia
cast call $CELO_PROOF_OF_HUMAN_SENDER "lastUserAddress()" --rpc-url celo-sepolia
```

### Check Verification on Base
```bash
cast call $BASE_PROOF_OF_HUMAN_RECEIVER "isVerified(address)" $USER_ADDRESS --rpc-url base-sepolia
```

### Check Hyperlane Message
After calling `sendVerificationCrossChain()`, copy the transaction hash and check:
- https://sepolia.celoscan.io/tx/YOUR_TX_HASH (look for logs)
- https://explorer.hyperlane.xyz/ (track message delivery)

