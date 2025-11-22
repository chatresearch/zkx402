#!/bin/bash
set -e

echo "=== Self + Hyperlane Deployment ==="
echo ""

cd /Users/ballew/Documents/repos/ethglobal-playground/x402-demo/contracts
source .env

echo "Step 1: Deploying ProofOfHumanReceiver to Base Sepolia..."
forge script script/DeployReceiver.s.sol:DeployReceiver \
  --rpc-url base-sepolia \
  --broadcast

echo ""
echo "✅ Base deployment complete!"
echo ""
echo "IMPORTANT: Update your .env file with:"
echo "BASE_PROOF_OF_HUMAN_RECEIVER=<address_from_above>"
echo ""
echo "Then run the Celo deployment:"
echo "forge script script/DeploySender.s.sol:DeploySender --rpc-url celo-sepolia --broadcast"

