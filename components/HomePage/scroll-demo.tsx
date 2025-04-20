"use client";
import React from "react";
import { StickyScroll } from "@/components/HomePage/sticky-scroll-reveal";

export const content = [
  {
    title: "Misyonumuz",
    description:
      "Atatürk’ün 1930’lu yıllarda başlattığı, “Türkiye’nin Kıvılcımları” olmalarını beklediği genç yeteneklerin bugünkü akranlarının, ülkemizin ihtiyaç duyacağı ve dünyada öncü olmamızı sağlayacak çalışmalarının önünü açmaya destek olmaktır.",
    content: (
      <div className="h-full w-full bg-[linear-gradient(to_bottom_right,var(--cyan-500),var(--emerald-500))] flex items-center justify-center text-white">
        Misyonumuz
      </div>
    ),
  },
  {
    title: "Vizyonumuz",
    description:
      "Gençler ve Profesyoneller ile birlikte oluşturduğumuz ekosistem ağı içinde kişilerin tanışmalarını, haberleşmelerini ve dünya ile rekabet edecek işler üretmelerini hedeflemekteyiz.",
    content: (
      <div className="h-full w-full  flex items-center justify-center text-white">
        Vizyonumuz
      </div>
    ),
  },
  {
    title: "Proje Desteği",
    description:
      "Yaratıcı projelerinizi hayata geçirmek için destek oluyoruz. Fikirlerinizi değerlendirmek için buradayız.",
    content: (
      <div className="h-full w-full bg-[linear-gradient(to_bottom_right,var(--orange-500),var(--yellow-500))] flex items-center justify-center text-white">
        Proje Desteği
      </div>
    ),
  },
  {
    title: "Eğitim – Gelişim Programları",
    description:
      "Genç yetenekler için eğitim programları planlıyoruz. Bu programlarla, bilgi ve becerilerinizi geliştirerek kariyerinize yön verebilirsiniz.",
    content: (
      <div className="h-full w-full bg-[linear-gradient(to_bottom_right,var(--cyan-500),var(--emerald-500))] flex items-center justify-center text-white">
        Eğitim – Gelişim Programları
      </div>
    ),
  },
  {
    title: "Networking Etkinlikleri",
    description:
      "Topluluğumuzdaki profesyoneller ile iletişimde olmak, hayata geçirmek istediğin projelerde destek almak, şimdi ve ileride beraber iş ortağı olabileceğin kişiler ile bir araya gelebileceğin etkinlikler!",
    content: (
      <div className="h-full w-full  flex items-center justify-center text-white">
        Networking Etkinlikleri
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
