'use client';

import { Marketplace } from '@/components/Marketplace';
import { Header } from '@/components/Header';
import { useAccount } from 'wagmi';

export default function ConsumerPage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Marketplace isWalletConnected={isConnected} />
    </div>
  );
}
