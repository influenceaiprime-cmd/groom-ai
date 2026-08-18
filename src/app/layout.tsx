import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
export const metadata: Metadata = {
  title: 'GroomAI - See Any Beard on YOUR Face Before You Grow It',
  description: 'Try beard styles on your actual face in 10 seconds. Get exact barber specs. Your photo never leaves your device.',
  icons: [
    { rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml' },
    { rel: 'icon', url: '/favicon.png' },
  ],
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js" strategy="beforeInteractive" />
      </head>
      <body className="antialiased bg-[#0b0f14] text-gray-200">
        {children}
      </body>
    </html>
  );
}
