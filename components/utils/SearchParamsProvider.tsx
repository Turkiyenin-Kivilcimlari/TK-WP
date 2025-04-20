"use client";

import { Suspense, ReactNode } from 'react';

interface SearchParamsProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function SearchParamsProvider({ 
  children, 
  fallback = <div className="min-h-[20px]"></div> 
}: SearchParamsProviderProps) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}
