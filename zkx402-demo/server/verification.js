import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// Base Sepolia RPC
const BASE_RPC_URL = "https://sepolia.base.org";

// Your deployed ProofOfHumanReceiver contract address
const BASE_REGISTRY_ADDRESS = process.env.BASE_PROOF_OF_HUMAN_RECEIVER || "0xe1cb350fBB5F4b3e9e489eF1D6C11cc086dc1982";

// Contract ABI - only the functions we need
const REGISTRY_ABI = [
  "function isVerified(address) view returns (bool)",
  "function getVerification(address) view returns (tuple(bytes32 userIdentifier, address userAddress, bytes userData, uint256 verifiedAt, uint256 receivedAt, bool isVerified))",
];

/**
 * Check if a wallet address has been verified as human via Self Protocol
 * 
 * @param {string} walletAddress - The Ethereum address to check
 * @returns {Promise<boolean>} - True if verified, false otherwise
 */
export async function isWalletVerified(walletAddress) {
  try {
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const contract = new ethers.Contract(
      BASE_REGISTRY_ADDRESS,
      REGISTRY_ABI,
      provider
    );

    const verified = await contract.isVerified(walletAddress);
    return verified;
  } catch (error) {
    console.error("Error checking verification:", error);
    return false;
  }
}

/**
 * Get full verification details for a wallet
 * 
 * @param {string} walletAddress - The Ethereum address to check
 * @returns {Promise<Object>} - Verification data including timestamp and user data
 */
export async function getVerificationDetails(walletAddress) {
  try {
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const contract = new ethers.Contract(
      BASE_REGISTRY_ADDRESS,
      REGISTRY_ABI,
      provider
    );

    const data = await contract.getVerification(walletAddress);
    
    return {
      isVerified: data.isVerified,
      userIdentifier: data.userIdentifier,
      userAddress: data.userAddress,
      userData: data.userData,
      verifiedAt: new Date(Number(data.verifiedAt) * 1000).toISOString(),
      receivedAt: new Date(Number(data.receivedAt) * 1000).toISOString(),
    };
  } catch (error) {
    console.error("Error getting verification details:", error);
    return {
      isVerified: false,
      error: error.message,
    };
  }
}

/**
 * Middleware to require wallet verification for protected routes
 * 
 * Usage:
 *   app.get("/protected", requireVerification, (req, res) => { ... });
 * 
 * The wallet address should be in req.body.walletAddress or req.query.wallet
 */
export async function requireVerification(req, res, next) {
  const walletAddress = req.body.walletAddress || req.query.wallet || req.headers["x-wallet-address"];
  
  if (!walletAddress) {
    return res.status(400).json({
      error: "Wallet address required",
      message: "Provide wallet address in body, query param, or X-Wallet-Address header"
    });
  }

  const verified = await isWalletVerified(walletAddress);
  
  if (!verified) {
    return res.status(403).json({
      error: "Verification required",
      message: "This wallet must be verified as human via Self Protocol",
      verifyUrl: `${process.env.CLIENT_URL || "http://localhost:3000"}/verify`
    });
  }

  // Attach wallet to request for use in handler
  req.verifiedWallet = walletAddress;
  next();
}

