'use client';

import { Marketplace } from '@/components/Marketplace';
import { Header } from '@/components/Header';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCurrentUser, useIsSignedIn } from '@coinbase/cdp-hooks';

export default function ConsumerPage() {
  const { isSignedIn } = useIsSignedIn();
  const { currentUser } = useCurrentUser();
  const searchParams = useSearchParams();
  const openModalId = searchParams.get('openModal');
  const [isVerified, setIsVerified] = useState(false);

  const address = currentUser?.evmAccounts?.[0];

  // Check verification status from localStorage
  useEffect(() => {
    if (address) {
      const verified = localStorage.getItem(`verified_${address}`) === 'true';
      setIsVerified(verified);
    }
  }, [address]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Marketplace 
        isWalletConnected={isSignedIn} 
        initialOpenModalId={openModalId}
        isUserVerified={isVerified}
      />
    </div>
  );
}
