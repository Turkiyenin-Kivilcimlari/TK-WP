"use client";
import React, { useState } from "react";
import { StickyScroll } from "@/components/HomePage/sticky-scroll-reveal";
import Image from "next/image";

// Spinner komponenti
const LoadingSpinner = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-md">
    <div className="w-10 h-10 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin"></div>
  </div>
);

// Loading icon ile beraber çalışan image komponenti
const ImageWithLoading = ({ src, alt }: { src: string; alt: string }) => {
  const [isLoading, setIsLoading] = useState(true);
  
  return (
    <>
      {isLoading && <LoadingSpinner />}
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onLoadingComplete={() => setIsLoading(false)}
        priority
      />
    </>
  );
};

export const content = [
  {
    title: "Misyonumuz",
    description:
      "Atatürk'ün 1930'lu yıllarda başlattığı, 'Türkiye'nin Kıvılcımları' olmalarını beklediği genç yeteneklerin bugünkü akranlarının, ülkemizin ihtiyaç duyacağı ve dünyada öncü olmamızı sağlayacak çalışmalarının önünü açmaya destek olmaktır.",
    content: (
      <div className="h-full w-full flex items-center justify-center relative">
        <ImageWithLoading 
          src="https://res.cloudinary.com/dkqu2s9gz/image/upload/v1746458787/misyonumuz_wuj8lu.png"
          alt="Misyonumuz"
        />
      </div>
    ),
  },
  {
    title: "Vizyonumuz",
    description:
      "Gençler ve Profesyoneller ile birlikte oluşturduğumuz ekosistem ağı içinde kişilerin tanışmalarını, haberleşmelerini ve dünya ile rekabet edecek işler üretmelerini hedeflemekteyiz.",
    content: (
      <div className="h-full w-full flex items-center justify-center relative">
        <ImageWithLoading 
          src="https://res.cloudinary.com/dkqu2s9gz/image/upload/v1746458981/tygrghsv4whfl21kiwtg.png"
          alt="Vizyonumuz"
        />
      </div>
    ),
  },
  {
    title: "Proje Desteği",
    description:
      "Yaratıcı projelerinizi hayata geçirmek için destek oluyoruz. Fikirlerinizi değerlendirmek için buradayız.",
    content: (
      <div className="h-full w-full flex items-center justify-center relative">
        <ImageWithLoading 
          src="https://res.cloudinary.com/dkqu2s9gz/image/upload/v1746458969/fxtmlbkuxktzijlaovwz.png"
          alt="Proje Desteği"
        />
      </div>
    ),
  },
  {
    title: "Eğitim – Gelişim Programları",
    description:
      "Genç yetenekler için eğitim programları planlıyoruz. Bu programlarla, bilgi ve becerilerinizi geliştirerek kariyerinize yön verebilirsiniz.",
    content: (
      <div className="h-full w-full flex items-center justify-center relative">
        <ImageWithLoading 
          src="https://res.cloudinary.com/dkqu2s9gz/image/upload/v1746458979/faxgq7svnbz1wtce2e0a.png"
          alt="Eğitim – Gelişim Programları"
        />
      </div>
    ),
  },
  {
    title: "Networking Etkinlikleri",
    description:
      "Topluluğumuzdaki profesyoneller ile iletişimde olmak, hayata geçirmek istediğin projelerde destek almak, şimdi ve ileride beraber iş ortağı olabileceğin kişiler ile bir araya gelebileceğin etkinlikler!",
    content: (
      <div className="h-full w-full flex items-center justify-center relative">
        <ImageWithLoading 
          src="https://res.cloudinary.com/dkqu2s9gz/image/upload/v1746458979/egrttifkxnksxmqjxjdu.png"
          alt="Networking Etkinlikleri"
        />
      </div>
    ),
  }
];



export function StickyScrollRevealDemo() {
  return (
    <div className="p-10">
      <StickyScroll content={content} />
    </div>
  );
}