import type { Metadata } from "next";
import "../index.css";
import Background from "../components/Background";
import { Toaster } from "react-hot-toast";
import { FavoritesProvider } from "../context/FavoritesContext";
import { ThemeProvider } from "../context/ThemeContext";
import ThemeScript from "../components/ThemeScript";

// Extend MetaHTMLAttributes to include 'value'
declare module 'react' {
  interface MetaHTMLAttributes<T> extends HTMLAttributes<T> {
    value?: string;
  }
}

export const metadata: Metadata = {
  // Ensures relative OG/Twitter image URLs become absolute in link previews
  metadataBase: new URL('http://localhost:3000'),
  title: "Domain Name Generator | Creative Website Names with AI",
  description: "Use our AI-powered domain name generator to find the perfect name for your website. Get instant, creative suggestions and check live availability",
  icons: {
    // Serve SVG first so modern browsers use it; keep ICO as fallback
    icon: [
      { url: '/favicon.svg?v=4', type: 'image/svg+xml' },
      { url: '/favicon.ico?v=4', type: 'image/x-icon' }
    ],
    shortcut: '/favicon.ico?v=4',
    apple: '/favicon.ico?v=4', // Safari specific
  },
  openGraph: {
    title: "Domain Name Generator | Creative Website Names with AI",
    description: "Use our AI-powered domain name generator to find the perfect name for your website. Get instant, creative suggestions and check live availability",
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: "Domain Name Generator | Creative Website Names with AI",
    description: "Use our AI-powered domain name generator to find the perfect name for your website. Get instant, creative suggestions and check live availability",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="light" style={{ height: '100%', width: '100%' }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name='impact-site-verification' value='36b7d88e-03fd-487f-ad63-aafa86a5ac08' />
        {/* Preload Space Grotesk font to prevent FOUC */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" as="style" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" />
        <noscript>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" />
        </noscript>
        {/* Safari specific apple-touch-icon */}
        <link rel="apple-touch-icon" href="/favicon.ico?v=4" />
        {/* Standard favicon declarations */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=4" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=4" />
        <link rel="shortcut icon" href="/favicon.ico?v=4" />
        {/* Explicit pinned tab icon for Safari */}
        <link rel="mask-icon" href="/favicon.svg?v=4" color="#1e293b" />
      </head>
      <body
        className="antialiased min-h-screen bg-background text-foreground font-sans overscroll-none relative transition-colors duration-300"
        style={{ 
          height: '100%', 
          width: '100%',
          margin: 0,
          padding: 0,
          overflowX: 'hidden'
        }}
      >
        <Background />
        
        <ThemeScript />
        <div 
          className="relative z-10 min-h-screen flex flex-col"
          style={{
            minHeight: '100vh',
            minHeight: '-webkit-fill-available', // iOS Safari fix
          }}
        >
          <ThemeProvider>
            <FavoritesProvider>
              <main className="flex-grow">
                {children}
              </main>
            </FavoritesProvider>
          </ThemeProvider>
          <Toaster 
            position="bottom-right" 
            toastOptions={{
              className: 'bg-card text-card-foreground backdrop-blur-lg border border-border',
              style: {
                backdropFilter: 'blur(10px)',
              },
            }}
          />
        </div>
      </body>
    </html>
  );
}