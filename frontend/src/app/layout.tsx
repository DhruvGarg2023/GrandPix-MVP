import type { Metadata } from 'next';
import './globals.css';
import HeaderClient from '@/components/layout/HeaderClient';

export const metadata: Metadata = {
  title: 'F1 Crowd Intelligence Platform | GrandPix MVP',
  description: 'Real-time venue digital twin, dynamic crowd flow optimizer, and AI-powered operations control center for Formula 1 Grand Prix events.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070102] text-white antialiased min-h-screen flex flex-col relative selection:bg-red-600 selection:text-white">
        {/* Subtle Top Crimson Glow Overlay */}
        <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-red-600/20 via-red-950/10 to-transparent blur-3xl opacity-60 z-0"></div>

        {/* Global F1 Command Center Top Navigation Header */}
        <HeaderClient />

        {/* Main Content Workspace */}
        <main className="relative z-10 flex-1 flex flex-col p-4 lg:p-6 max-w-[1920px] w-full mx-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-red-950/80 bg-[#070102] px-6 py-3.5 text-center text-xs text-red-300/50 font-mono">
          F1 Crowd Flow Optimiser & Digital Twin • Powered by Node.js, Python ML (RandomForest) & Hugging Face AI
        </footer>
      </body>
    </html>
  );
}
