'use client';

import { Hero } from '@/components/Hero';
import { Header } from '@/components/Header';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
    </div>
  );
}
