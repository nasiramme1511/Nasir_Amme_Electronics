import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'Nasir Amme Electronics — Retail Inventory & POS Management',
  description:
    'Comprehensive electronics inventory management and retail point of sale dashboard for Nasir Amme Electronics in Dire Dawa, Ethiopia (near B-Capital Hotel).',
  keywords: [
    'Electronics Inventory',
    'POS System',
    'Dire Dawa',
    'Ethiopia',
    'Retail Dashboard',
    'ETB Currency',
    'Nasir Amme Electronics',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppProvider>
            <AppLayout>{children}</AppLayout>
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
