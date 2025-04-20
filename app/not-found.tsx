"use client";

import { useRouter } from "next/navigation";
import { NotFound as NotFoundComponent, Illustration } from "@/components/ui/not-found";

export default function NotFound() {
  const router = useRouter();
  
  return (
    <div className="relative flex flex-col w-full justify-center min-h-svh bg-background p-6 md:p-10">
      <div className="relative max-w-5xl mx-auto w-full">
        <Illustration className="absolute inset-0 w-full h-[50vh] opacity-[0.09] dark:opacity-[0.09] text-foreground" />
        <NotFoundComponent 
          title="Sayfa Bulunamadı" 
          description="Aradığınız sayfa bulunmuyor veya taşınmış olabilir."
        />
      </div>
    </div>
  );
}
