import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'Nasir Amme Electronics — Retail Inventory & POS Management',
  description:
    'Comprehensive electronics inventory management and retail point of sale dashboard for Nasir Amme Electronics in Dire Dawa, Ethiopia.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
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
    <html lang="en" suppressHydrationWarning className="dark" data-theme="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('nae_theme') || 'dark';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.setAttribute('data-theme', 'light');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            <AppProvider>
              <AppLayout>{children}</AppLayout>
            </AppProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
