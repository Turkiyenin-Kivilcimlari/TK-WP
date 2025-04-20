import React from 'react';
import { Header } from '@/components/ui/header';
import { Footer } from '@/components/footer';
import { TwoFactorVerifyModal } from '@/components/layout/TwoFactorVerifyModal';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
      <TwoFactorVerifyModal />
      <Footer />
    </div>
  );
}
