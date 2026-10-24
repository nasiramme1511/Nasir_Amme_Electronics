'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyStockKeeperRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/stock-keeper/dashboard');
  }, [router]);
  return null;
}
