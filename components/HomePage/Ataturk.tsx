"use client";
import React from "react";
import { LinkPreview } from "@/components/HomePage/link-preview";

export function Ataturk() {
  return (
    <div className="flex flex-col min-h-[30vh] md:min-h-[50vh] items-center justify-center px-4 pb-5 mb-10">
      <p className="text-neutral-500 dark:text-neutral-400 text-xl md:text-3xl max-w-3xl text-center mb-10">
      "Sizleri bir kıvılcım olarak yolluyorum, alevler olarak geri dönmelisiniz."
      </p>

      <p className="text-neutral-500 dark:text-neutral-400 text-xl md:text-3xl max-w-3xl text-center">
        <LinkPreview
          imageSrc="https://res.cloudinary.com/dkqu2s9gz/image/upload/v1742195966/tlrjk6xedb86bwlwm94d.jpg"
          isStatic
          className="font-bold"
        >
          Mustafa Kemal Atatürk
        </LinkPreview>{" "}
      </p>
    </div>
  );
}
