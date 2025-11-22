# ZKX402 Data Marketplace - Landing Page

A decentralized data marketplace with zero-knowledge proof verification for data origin authenticity.

## Features

### 🔐 Secure Upload (Seller Flow)

Sellers can create verified listings with cryptographic proof of data origin:

**Step A: File Upload**
- Drag & drop files (PDF, images, text)
- Local encryption with visual feedback

**Step B: Origin Proof ($3k Prize Feature)**
- **Multiple Source Types Supported:**
  - 🎯 **Demo**: Mock API with secret token
  - 🐙 **GitHub**: Private repositories with PAT
  - 📝 **Notion**: Private pages/databases with API key
- Enter origin source (URL or Notion page ID)
- Add authentication (API keys, tokens, PATs)
- Generate ZK proof using vlayer technology
- Terminal-style logging shows proof generation progress
- **Key Feature**: Secrets are redacted - only the proof is published

**Step C: Publish Listing**
- Set price for your data
- Publish with "Verified Source" tag
- Data encrypted, proof on-chain, secrets remain private

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Install server dependencies (optional - for local testing)
cd server && npm install && cd ..
```

### API Configuration

The app uses the **production vlayer API** at `https://zkx402-server.vercel.app` by default.

To use a local API for development:
1. Create a `.env.local` file in the project root
2. Add: `VITE_API_URL=http://localhost:3001`
3. Start the local server: `npm run server`

### Running the Application

**Option 1: Run everything together (recommended)**

```bash
npm run dev:full
```

This starts both:
- Frontend on `http://localhost:8080`
- Backend API on `http://localhost:3001`

**Option 2: Run separately**

Terminal 1 - Backend:
```bash
npm run server
```

Terminal 2 - Frontend:
```bash
npm run dev
```

### Usage

#### Quick Demo

1. Navigate to `http://localhost:8080/producer`
2. Upload any file (PDF, image, or text - it will encrypt locally)
3. Click **"Load Demo Credentials"** - this will populate:
   - URL: `http://localhost:3001/api/demo-secret-file`
   - Auth: `Bearer demo-token-123`
4. Click **"GENERATE ZK PROOF"**
5. Watch the terminal logs as the proof generates
6. View the verified data that was fetched (alien budget file metadata!)
7. Set a price and publish to marketplace

#### How It Works

The demo shows the core value proposition:
- You prove access to a **protected API endpoint**
- The **auth token is REDACTED** in the ZK proof
- Buyers can verify the data origin **without seeing your secrets**
- Only the cryptographic proof goes on-chain

#### Custom URLs

You can also test with:
- **Public APIs**: `https://api.github.com/users/octocat` (no auth needed)
- **Private repos**: GitHub API with your PAT token
- **Any authenticated API** you have access to

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Backend**: Express.js (vlayer mock API)
- **Proof System**: vlayer-inspired ZK proofs (currently mocked for demo)

## API Endpoints

### POST /api/prove

Generates a zero-knowledge proof for data origin.

**Request:**
```json
{
  "url": "https://api.example.com/data",
  "headers": [
    "User-Agent: Mozilla/5.0...",
    "Authorization: Bearer secret-token"
  ]
}
```

**Response:**
```json
{
  "proof": {
    "seal": "0x...",
    "postStateDigest": "0x..."
  },
  "publicInputs": {
    "url": "https://api.example.com/data",
    "statusCode": 200,
    "timestamp": "2025-11-22T...",
    "hasAuthHeader": true
  },
  "response": {
    "status": 200,
    "data": { ... }
  }
}
```

## Project Structure

```
landing-page/
├── src/
│   ├── components/
│   │   ├── ProducerUpload.tsx   # Main seller upload flow
│   │   └── ui/                   # shadcn/ui components
│   ├── pages/
│   │   ├── Producer.tsx          # Seller page
│   │   └── Consumer.tsx          # Buyer page (coming soon)
│   └── App.tsx
├── server/
│   ├── index.js                  # vlayer mock API server
│   └── package.json
└── vite.config.ts                # Proxy config for /api routes
```

## Coming Soon

- [ ] Buyer verification flow
- [ ] Real vlayer integration
- [ ] Blockchain integration for proof storage
- [ ] Encrypted data storage (IPFS/Arweave)
- [ ] Payment processing

## Development Notes

The current implementation uses a **mock vlayer API** for demonstration purposes. The proof generation:
- Actually fetches data from the provided URL
- Generates cryptographic-looking proof hashes
- Demonstrates the UX without requiring full vlayer infrastructure

For production, replace the mock server with actual vlayer SDK integration.

## License

See LICENSE file in project root.

# Zkx402 Frontend