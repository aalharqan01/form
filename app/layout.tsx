import type { Metadata, Viewport } from 'next';
import { Outfit, Geist_Mono } from 'next/font/google';
import './globals.css';

// Outfit: geometric, rounded, close to the wordmark's letterforms.
const sans = Outfit({
  variable: '--font-sans-family',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f6f7f4',
};

export const metadata: Metadata = {
  title: 'Form — Training & Weight',
  description: 'Your personal workout log and weight trend tracker.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192' },
    ],
    apple: '/icon-192.png',
  },
  appleWebApp: { capable: true, title: 'Form', statusBarStyle: 'default' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('form-theme')||'system';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t}catch(e){}",
          }}
        />
      </head>
      <body className={`${sans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
