#!/bin/bash

# Script to set environment variables in Vercel
# Run this from the project root directory

set -e

echo "Setting environment variables in Vercel..."
echo ""

# Backend Environment Variables
echo "📦 Setting Backend (Server) Environment Variables"
echo "=================================================="
cd zkx402-demo/server

echo "Setting CDP_API_KEY_ID..."
echo "4b7d76ac-d74f-4219-bfbd-f04ac9e34396" | vercel env add CDP_API_KEY_ID production

echo "Setting CDP_API_KEY_SECRET..."
echo "UuTgRD/xuZiqvrXbPP1NE6kIHt2iNYgP2D38RMqmKR5bXto4TPYN0rHP2vp4Dw9hNp+q42DZpSy7v4mksG6VYQ==" | vercel env add CDP_API_KEY_SECRET production

echo "Setting RECEIVER_WALLET..."
echo "0xEE45A0D3466A6a961D286cc61666B7067D7a7619" | vercel env add RECEIVER_WALLET production

echo "Setting ALLOWED_ORIGINS (you'll need to update this with your frontend URL)..."
echo "http://localhost:3000,http://localhost:3001" | vercel env add ALLOWED_ORIGINS production

echo ""
echo "✅ Backend environment variables set!"
echo ""

# Frontend Environment Variables
echo "📦 Setting Frontend (Client) Environment Variables"
echo "=================================================="
cd ../client

echo "Setting NEXT_PUBLIC_CDP_PROJECT_ID..."
echo "a8f36a41-9841-4f9d-956b-c0e1bdf65b51" | vercel env add NEXT_PUBLIC_CDP_PROJECT_ID production

echo "Setting NEXT_PUBLIC_API_URL (you'll need to update this with your backend URL)..."
echo "http://localhost:3001" | vercel env add NEXT_PUBLIC_API_URL production

# Optional variables - uncomment if you have these in your .env.local
# echo "Setting NEXT_PUBLIC_CELO_BRIDGE_ADDRESS..."
# echo "0x4200000000000000000000000000000000000028" | vercel env add NEXT_PUBLIC_CELO_BRIDGE_ADDRESS production

# echo "Setting NEXT_PUBLIC_BASE_REGISTRY_ADDRESS..."
# echo "0x4200000000000000000000000000000000000029" | vercel env add NEXT_PUBLIC_BASE_REGISTRY_ADDRESS production

echo ""
echo "✅ Frontend environment variables set!"
echo ""
echo "⚠️  IMPORTANT: After deployment, update these URLs:"
echo "   1. Backend ALLOWED_ORIGINS with your frontend URL"
echo "   2. Frontend NEXT_PUBLIC_API_URL with your backend URL"
echo ""
echo "Run: vercel env add VARIABLE_NAME production"
echo "to update any variable"

