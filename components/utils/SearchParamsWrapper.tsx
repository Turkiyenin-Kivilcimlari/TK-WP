"use client";

import { usePathname } from "next/navigation";
import { FC, ReactNode, useEffect, useState } from "react";
import { SearchParamsProvider } from "./SearchParamsProvider";

interface SearchParamsWrapperProps {
  children: ReactNode;
}

/**
 * Bu bileşen useSearchParams kullanan sayfalarda ortaya çıkabilecek hataları çözmek için
 * Suspense ile sarmalamayı sağlar. 
 * 
 * Bu sayede her sayfada ayrıca değişiklik yapmaya gerek kalmaz.
 */
export const SearchParamsWrapper: FC<SearchParamsWrapperProps> = ({ children }) => {
  const pathname = usePathname();
  const [key, setKey] = useState<string>(pathname);
  
  useEffect(() => {
    // Sayfa değiştiğinde bileşeni yeniden oluşturmak için key değerini güncelle
    setKey(pathname);
  }, [pathname]);

  return (
    <SearchParamsProvider key={key}>
      {children}
    </SearchParamsProvider>
  );
};
