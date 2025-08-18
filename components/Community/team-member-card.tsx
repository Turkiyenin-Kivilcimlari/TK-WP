"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CanvasRevealEffect } from "./canvas-reveal-effect";
import Image from "next/image";
import Link from "next/link";

interface TeamMemberCardProps {
  name: string;
  title: string;
  photo?: string;
  avatar?: string;
  slug?: string;
  university?: string;
  universityLogo?: string;
}

export const TeamMemberCard = ({
  name,
  title,
  photo,
  avatar,
  slug,
  university,
  universityLogo,
}: TeamMemberCardProps) => {
  const [hovered, setHovered] = useState(false);
  
  // Kullanıcı baş harflerini al
  const getUserInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length-1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="border border-black/[0.1] group/canvas-card flex items-center justify-center dark:border-white/[0.1] max-w-sm w-full mx-auto p-4 relative h-[20rem] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <Icon className="absolute h-4 w-4 -top-2 -left-2 dark:text-white text-black" />
      <Icon className="absolute h-4 w-4 -bottom-2 -left-2 dark:text-white text-black" />
      <Icon className="absolute h-4 w-4 -top-2 -right-2 dark:text-white text-black" />
      <Icon className="absolute h-4 w-4 -bottom-2 -right-2 dark:text-white text-black" />

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full absolute inset-0"
          >
            <CanvasRevealEffect
              animationSpeed={3}
              containerClassName="bg-primary/80"
              colors={[[236, 72, 153], [232, 121, 249]]}
              dotSize={2}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center justify-center relative z-20">
        {/* Normal durumda üniversite logosu, hover durumunda profil fotoğrafı */}
        <AnimatePresence mode="wait">
          {!hovered ? (
            // Normal durumda üniversite logosu
            <motion.div 
              key="university-logo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="mb-4"
            >
              {universityLogo ? (
                <div className="relative h-24 w-24 p-2 flex items-center justify-center">
                  <Image
                    src={universityLogo}
                    alt={university || "Üniversite"}
                    width={96}
                    height={96}
                    className="object-contain max-h-24"
                  />
                </div>
              ) : (
                <div className="h-24 w-24 rounded-full flex items-center justify-center bg-primary/5 text-primary/50 text-xs font-medium">
                  Üniversite logosu yok
                </div>
              )}
            </motion.div>
          ) : (
            // Hover durumunda profil fotoğrafı
            <motion.div 
              key="profile-photo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="mb-4"
            >
              {photo ? (
                <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-primary/20">
                  <Image
                    src={photo}
                    alt={name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : avatar ? (
                <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-primary/20">
                  <Image
                    src={avatar}
                    alt={name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="h-24 w-24 rounded-full flex items-center justify-center text-xl font-semibold bg-primary/10 text-white border-2 border-primary/20">
                  {getUserInitials(name)}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bilgiler - her zaman gösterilir */}
        <div className="text-center">
          {slug ? (
            <Link href={`/u/${slug}`} className="group">
              <h3 className={`text-lg font-semibold transition-all duration-300 ${hovered ? 'text-white' : 'text-foreground'} hover:underline`}>
                {name}
              </h3>
            </Link>
          ) : (
            <h3 className={`text-lg font-semibold transition-all duration-300 ${hovered ? 'text-white' : 'text-foreground'}`}>
              {name}
            </h3>
          )}
          <p className={`text-sm transition-all duration-300 ${hovered ? 'text-white/90' : 'text-muted-foreground'}`}>
            {title}
          </p>
          {university && (
            <p className={`text-xs mt-1 transition-all duration-300 ${hovered ? 'text-white/80' : 'text-muted-foreground'}`}>
              {university}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const Icon = ({ className, ...rest }: any) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      className={className}
      {...rest}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
    </svg>
  );
};
