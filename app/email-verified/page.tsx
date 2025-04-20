"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check } from "lucide-react";

export default function EmailVerifiedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto w-full max-w-md space-y-8 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">E-posta Doğrulandı</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          E-posta adresiniz başarıyla doğrulandı. Artık platformumuzdaki tüm özellikleri kullanabilirsiniz.
        </p>
        <div className="flex gap-4 flex-col sm:flex-row">
          <Button asChild className="w-full">
            <Link href="/">Ana Sayfaya Git</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/signin">Giriş Yap</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
