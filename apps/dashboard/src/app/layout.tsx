import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SupabaseProvider } from '@/components/providers/supabase-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Arcim Sync Dashboard',
  description: 'Manage your Swedish accounting integrations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
