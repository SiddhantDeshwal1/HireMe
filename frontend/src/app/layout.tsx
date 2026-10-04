import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PreferencesProvider } from '@/context/PreferencesContext';
import { SmoothScroll } from '@/components/providers/SmoothScroll';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { LoginModal } from '@/components/auth/LoginModal';

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'HireMe | Multi-Board Tech Job Aggregator',
  description:
    'Curated tech job aggregator powered by automated company career scrapers, persistent SQLite storage, and candidate matching.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-violet-500/20 selection:text-violet-700">
        <SmoothScroll>
          <PreferencesProvider>
            <TooltipProvider>
              <div className="relative flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1 flex flex-col">{children}</main>
                <Footer />
              </div>
              <LoginModal />
              <Toaster richColors position="bottom-right" />
            </TooltipProvider>
          </PreferencesProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
