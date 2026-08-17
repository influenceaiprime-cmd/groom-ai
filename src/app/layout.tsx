import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'GlamAI - Your Live AI Makeup Coach',
  description: 'Scan your face, get your 12-season color ID, match your perfect foundation shade, and try lipstick live in the AR mirror.',
  icons: [
    { rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml' },
    { rel: 'icon', url: '/favicon.png' },
  ],
  openGraph: {
    title: 'GlamAI - Your Live AI Makeup Coach',
    description: 'Scan, match, glow - science-grade beauty in your pocket.',
    type: 'website',
    images: [{ url: 'https://images.unsplash.com/photo-1512496015851-a90fb3838798?auto=format&fit=crop&w=1200&q=80', width: 1200, height: 630, alt: 'GlamAI luxury AI makeup studio' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GlamAI - Your Live AI Makeup Coach',
    description: 'Scan, match, glow - science-grade beauty in your pocket.',
    images: ['https://images.unsplash.com/photo-1512496015851-a90fb3838798?auto=format&fit=crop&w=1200&q=80'],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script defer src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.min.js"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
