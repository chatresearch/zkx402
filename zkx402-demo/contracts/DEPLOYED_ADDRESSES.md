# Deployed Contract Addresses

## Production Deployment

### Celo Sepolia (Alfajores)
- **Contract:** `0x38d415034f8479545d9b4f227c9f9140aca1b765` ✅ **WORKING**
- **Type:** ProofOfHumanSender
- **Scope:** `0x03348d9f455c9cb696d345fdeb04ee2ad9f0ff70a8ea081bce1510ce80745aa2`
- **verificationSuccessful:** true (has received verifications)
- **Explorer:** https://celo-sepolia.blockscout.com/address/0x38d415034f8479545d9b4f227c9f9140aca1b765

#### Old/Non-Working Contract (DO NOT USE)
- **Contract:** `0xF78eE84655aaFc3370Ca710E9D3649B78f77Ffa0` ❌ **DOES NOT WORK**
- **Issue:** Never received any verification transactions - Self Protocol rejects QR codes
- **Scope:** `0x099596497b83484607afcb20c6df724a60a404490f47527daa7145a1ad9b3226`

### Base Sepolia
- **Contract:** `0xe1cb350fbb5f4b3e9e489ef1d6c11cc086dc1982`
- **Type:** ProofOfHumanReceiver
- **SOURCE_DOMAIN:** `11142220` (Celo Sepolia)
- **Verification Count:** 3 (as of last check)
- **Trusted Sender Enforcement:** Disabled (permissionless)
- **Explorer:** https://sepolia.basescan.org/address/0xe1cb350fbb5f4b3e9e489ef1d6c11cc086dc1982

## Network Details

### Celo Sepolia
- **Chain ID:** 44787
- **Hyperlane Domain:** 11142220
- **Hyperlane Mailbox:** `0xD0680F80F4f947968206806C2598Cbc5b6FE5b03`
- **Self Hub:** `0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74`
- **RPC:** https://forno.celo-sepolia.celo-testnet.org

### Base Sepolia
- **Chain ID:** 84532
- **Hyperlane Domain:** 84532
- **Hyperlane Mailbox:** `0x6966b0E55883d49BFB24539356a2f8A673E02039`
- **RPC:** https://sepolia.base.org

## Environment Variables

For your `.env` file:

```bash
# Celo Sender Contract - CORRECT ADDRESS
CELO_PROOF_OF_HUMAN_BRIDGE=0x38d415034f8479545d9b4f227c9f9140aca1b765

# Base Receiver Contract
BASE_VERIFICATION_REGISTRY=0xe1cb350fbb5f4b3e9e489ef1d6c11cc086dc1982
BASE_PROOF_OF_HUMAN_RECEIVER=0xe1cb350fbb5f4b3e9e489ef1d6c11cc086dc1982

# Hyperlane
CELO_CHAIN_DOMAIN=11142220
BASE_CHAIN_DOMAIN=84532
```

For your frontend `.env.local`:

```bash
# CORRECT ADDRESS - Use this one!
NEXT_PUBLIC_CELO_BRIDGE_ADDRESS=0x38d415034f8479545d9b4f227c9f9140aca1b765
NEXT_PUBLIC_BASE_REGISTRY_ADDRESS=0xe1cb350fbb5f4b3e9e489ef1d6c11cc086dc1982
```

## Verification Commands

### Check Celo Contract
```bash
# Check scope
cast call 0x38d415034f8479545d9b4f227c9f9140aca1b765 \
  "scope()(bytes32)" \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org

# Check if verification succeeded
cast call 0x38d415034f8479545d9b4f227c9f9140aca1b765 \
  "verificationSuccessful()(bool)" \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org
```

### Check Base Contract
```bash
# Check verification count
cast call 0xe1cb350fbb5f4b3e9e489ef1d6c11cc086dc1982 \
  "verificationCount()(uint256)" \
  --rpc-url https://sepolia.base.org

# Check if user is verified
cast call 0xe1cb350fbb5f4b3e9e489ef1d6c11cc086dc1982 \
  "isVerified(address)(bool)" \
  YOUR_WALLET_ADDRESS \
  --rpc-url https://sepolia.base.org

# Check source domain
cast call 0xe1cb350fbb5f4b3e9e489ef1d6c11cc086dc1982 \
  "SOURCE_DOMAIN()(uint32)" \
  --rpc-url https://sepolia.base.org
```

## Status

✅ Both contracts are deployed and operational
✅ Base contract has received 3 verifications successfully
✅ Cross-chain messaging is working (Celo → Base via Hyperlane)

