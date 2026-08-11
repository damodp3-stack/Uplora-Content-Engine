import React from 'react';
import '@/styles/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Uplora Content Engine — Free Open-Source AI Content Platform',
  description: 'Multi-provider AI generation, SEO optimizer, visual calendar, and multi-channel publisher.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b0f19] text-gray-100 font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
