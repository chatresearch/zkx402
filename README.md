# Zkx402 (server and client)
**EthGlobal zkx402 project**

Whistleblower uploads the private data -> proves the data is real via zkproof of the contents -> journalist verifies their identity with newspaper org -> gets discounted price for access to the private data -> pay for the private data with embedded wallet -> AI agent accesses the same data via MCP -> proof that the content was delivered and the payment was made by the AI agent via x402.

---

## MCP Server features
- **ZK verification (ZeroLayer/vlayer)** for whistleblower content  
- **Self.xyz DID + VC** for identity and role detection  
- **Tiered pricing** (journalist, premium, public)  
- **x402 payments** with automatic content delivery  
- **Simple audit logging**  

---

## How MCP Server works
1. Whistleblower uploads content reference + content hash + ZK proof job hash (`POST /upload`)  
2. MCP waits for vlayer proof completion and verifies the content hash matches the journal  
3. User requests access (`GET /access/:id`) with DID + VC (via `x-proof` header or body)  
4. MCP verifies DID ownership and VC, then returns 402 with role-based pricing (journalist: $1.00, discount: $2.50)  
5. User pays using x402 (`POST /pay/:id`) with the same DID + VC metadata  
6. MCP validates payment via x402 middleware and returns the verified content reference  

---

## Environment Variables

RECEIVER_WALLET=0x...
ALLOWED_ISSUERS=did:self:celo:issuer
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
PAY_NETWORK=celo-alfajores

---

## License
This project is licensed under the terms of the [MIT License](LICENSE).