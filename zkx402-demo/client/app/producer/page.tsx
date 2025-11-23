'use client';

import { Header } from '@/components/Header';
import { ProducerUpload } from '@/components/ProducerUpload';

export default function ProducerPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ProducerUpload />
    </div>
  );
}
