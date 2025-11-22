#!/bin/bash

# Blockscout API verification
curl -X POST "https://base-sepolia.blockscout.com/api/v2/smart-contracts/0xe1cb350fBB5F4b3e9e489eF1D6C11cc086dc1982/verification/via/flattened-code" \
  -H "Content-Type: application/json" \
  -d '{
    "compiler_version": "v0.8.28+commit.7893614a",
    "optimization": true,
    "optimization_runs": 200,
    "contract_name": "ProofOfHumanReceiver",
    "evm_version": "paris",
    "source_code": "'"$(cat ProofOfHumanReceiver.flattened.sol | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')"'",
    "constructor_args": "0x0000000000000000000000006966b0e55883d49bfb24539356a2f8a673e020390000000000000000000000000000000000000000000000000000000000aa044c",
    "autodetect_constructor_args": true,
    "license_type": "mit"
  }'
