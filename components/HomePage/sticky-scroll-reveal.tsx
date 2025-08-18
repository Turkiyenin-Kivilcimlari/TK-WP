"use client";
import React, { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

export const StickyScroll = ({
  content,
  contentClassName,
}: {
  content: {
    title: string;
    description: string;
    content?: React.ReactNode | any;
  }[];
  contentClassName?: string;
}) => {
  const [activeCard, setActiveCard] = React.useState(0);
  const ref = useRef<any>(null);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { theme, resolvedTheme } = useTheme();
  
  // Viewport kontrolü için yeni bir fonksiyon ekleyelim
  const checkVisibility = () => {
    if (!ref.current) return;
    
    const container = ref.current;
    const containerRect = container.getBoundingClientRect();
    
    // Görünürlük yüzdesini hesaplamak için eşik değeri
    const visibilityThreshold = 0.4; // %40 görünürlük eşiği
    
    let maxVisibilityRatio = 0;
    let maxVisibilityIndex = activeCard;
    
    // Her element için görünürlük oranını hesapla
    contentRefs.current.forEach((contentRef, index) => {
      if (!contentRef) return;
      
      const elementRect = contentRef.getBoundingClientRect();
      
      // Elementin görünür alanını hesaplayalım
      // Container koordinatları baz alınmalı, window değil
      const visibleTop = Math.max(0, elementRect.top - containerRect.top);
      const visibleBottom = Math.min(containerRect.height, elementRect.bottom - containerRect.top);
      
      // Görünür yükseklik (piksel cinsinden)
      let visibleHeight = Math.max(0, visibleBottom - visibleTop);
      
      // Element yüksekliğine göre görünürlük oranı
      const visibilityRatio = visibleHeight / elementRect.height;
      
      // En yüksek görünürlük oranına sahip elementi bulalım
      if (visibilityRatio > maxVisibilityRatio) {
        maxVisibilityRatio = visibilityRatio;
        maxVisibilityIndex = index;
      }
    });
    
    // Her zaman en çok görünen elementi seçelim (daha güvenilir)
    if (maxVisibilityRatio > 0 && maxVisibilityIndex !== activeCard) {
      setActiveCard(maxVisibilityIndex);
    }
  };
  
  // Scroll olayını dinleyelim - dependency array'e activeCard ekleyelim
  useEffect(() => {
    const containerRef = ref.current;
    if (!containerRef) return;
    
    const handleScroll = () => {
      // Performans için debounce/throttle eklenebilir
      requestAnimationFrame(checkVisibility);
    };
    
    containerRef.addEventListener('scroll', handleScroll);
    
    // İlk kontrol
    setTimeout(checkVisibility, 100); // Component renderlanması için kısa gecikme
    
    return () => {
      containerRef.removeEventListener('scroll', handleScroll);
    };
  }, [activeCard]); // activeCard değişince event listener'ı yeniden bağlamamız gerekiyor
  
  // Referanslar değiştiğinde de kontrol edelim
  useEffect(() => {
    setTimeout(checkVisibility, 100); // Component renderlanması için kısa gecikme
  }, [contentRefs.current.length]);

  // Scroll progress için başka bir approach kullanalım
  const { scrollYProgress } = useScroll({
    container: ref,
    offset: ["start start", "end start"],
  });

  // scrollYProgress değişimini ayrı bir handler'da kullanalım
  useMotionValueEvent(scrollYProgress, "change", () => {
    requestAnimationFrame(checkVisibility);
  });

  // Tema rengini belirle
  const isDark = resolvedTheme === 'dark' || theme === 'dark';
  
  // Tema ana rengi - Sabit arka plan rengi olarak kullanılacak
  const themeBaseColor = isDark ? "bg-black" : "bg-white"; // Koyu: slate-900, Açık: white
  
  // Gradient renkler - tema rengine uyumlu
  const darkGradients = [
    "linear-gradient(to bottom right, #1e3a8a, #3b82f6)",  // blue-900 to blue-500
    "linear-gradient(to bottom right, #0f766e, #14b8a6)",  // teal-800 to teal-500
    "linear-gradient(to bottom right, #6d28d9, #a855f7)",  // violet-700 to purple-500
    "linear-gradient(to bottom right, #9d174d, #ec4899)",  // pink-900 to pink-500
    "linear-gradient(to bottom right, #7e22ce, #a855f7)",  // purple-700 to purple-500
  ];

  const lightGradients = [
    "linear-gradient(to bottom right, #eff6ff, #93c5fd)",  // blue-50 to blue-300
    "linear-gradient(to bottom right, #f0fdfa, #99f6e4)",  // teal-50 to teal-300
    "linear-gradient(to bottom right, #f5f3ff, #c4b5fd)",  // violet-50 to violet-300
    "linear-gradient(to bottom right, #fdf2f8, #f9a8d4)",  // pink-50 to pink-300
    "linear-gradient(to bottom right, #faf5ff, #d8b4fe)",  // purple-50 to purple-300
  ];

  const linearGradients = isDark ? darkGradients : lightGradients;

  const [backgroundGradient, setBackgroundGradient] = useState(
    linearGradients[0],
  );

  const [previousCard, setPreviousCard] = useState(activeCard);

  useEffect(() => {
    setPreviousCard(activeCard);
    setBackgroundGradient(linearGradients[activeCard % linearGradients.length]);
  }, [activeCard, linearGradients]);

  // Tema değiştiğinde gradient'i güncelle
  useEffect(() => {
    setBackgroundGradient(linearGradients[activeCard % linearGradients.length]);
  }, [theme, resolvedTheme, linearGradients, activeCard]);

  return (
    <motion.div
      animate={{
        backgroundColor: themeBaseColor, // Her zaman tema rengi olacak
      }}
      className="relative flex h-[36rem] justify-center space-x-10 overflow-y-auto no-scrollbar rounded-md p-10"
      ref={ref}
    >
      <div className="div relative flex items-start px-4">
        <div className="max-w-2xl">
          {content.map((item, index) => (
            <div 
              key={item.title + index} 
              className="my-20"
              ref={el => { contentRefs.current[index] = el; }}
            >
              <motion.h2
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: activeCard === index ? 1 : 0.3,
                }}
                className={`text-2xl font-bold `}
              >
                {item.title}
              </motion.h2>
              <motion.p
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: activeCard === index ? 1 : 0.3,
                }}
                className={`text-kg mt-10 max-w-sm ${isDark ? 'text-white' : 'text-dark'}`}
              >
                {item.description}
              </motion.p>
            </div>
          ))}
          <div className="h-40" />
        </div>
      </div>
      
      {/* Fotoğraf içeriği için animasyonlu container */}
      <div className="sticky top-10 hidden h-60 w-80 overflow-hidden rounded-md lg:block">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCard}
            initial={{ 
              opacity: 0,
              y: previousCard < activeCard ? 20 : -20 
            }}
            animate={{ 
              opacity: 1,
              y: 0 
            }}
            exit={{ 
              opacity: 0,
              y: previousCard < activeCard ? -20 : 20,
              transition: { duration: 0.2 } 
            }}
            transition={{ 
              duration: 0.3,
              ease: "easeInOut" 
            }}
            style={{ background: backgroundGradient }}
            className={cn(
              "h-full w-full overflow-hidden rounded-md",
              contentClassName,
            )}
          >
            {content[activeCard].content ?? null}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
