import './globals.css';
import { AuthProvider } from '../lib/auth-context';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PIX AI MMS - Enterprise 5–20 TB Media Management System',
  description:
    'High-performance AI Media Management System powered by NestJS, Next.js, PostgreSQL pgvector, BullMQ, AWS Rekognition, Bedrock & S3.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[#F8FAFC] text-slate-900 min-h-screen antialiased" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
