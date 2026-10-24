'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyCashierRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/cashier/dashboard');
  }, [router]);
  return null;
}
