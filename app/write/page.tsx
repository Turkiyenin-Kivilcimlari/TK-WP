"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { WritingEditor } from "@/components/editor/WritingEditor";

export default function WritePage() {
  const { data: session, status } = useSession();
  
  // Oturum yükleniyor
  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  // Oturum yoksa giriş sayfasına yönlendir
  if (status === "unauthenticated") {
    redirect("/signin?callbackUrl=/write");
    return null;
  }
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Yeni Yazı Oluştur</h1>
      <WritingEditor />
    </div>
  );
}
