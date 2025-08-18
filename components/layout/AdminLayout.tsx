import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      
      <div className="flex flex-1">
        <div className="w-full">
          <main className="py-6 px-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
