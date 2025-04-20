import { Articles } from "@/components/HomePage/articles";
import { Ataturk } from "@/components/HomePage/Ataturk";
import { Hero } from "@/components/HomePage/hero";
import { content } from "@/components/HomePage/scroll-demo";
import { StickyScroll } from "@/components/HomePage/sticky-scroll-reveal";
import React from "react";

export default function Home() {
  return (
    <>
      <Hero
        title="Türkiye'nin Kıvılcımları"
        subtitle="Türkiye’nin geleceği gençlerle iş dünyasının profesyonellerini bir araya getirerek Yapay Zekâ ve gelecek odaklı bir ekosistem inşa ediyoruz."
        titleClassName="text-5xl md:text-6xl font-extrabold"
        subtitleClassName="text-lg md:text-xl max-w-[600px]"
        actionsClassName="mt-8"
      />
      <Ataturk />
      <Articles />

      <StickyScroll content={content} />
    </>
  );
}
