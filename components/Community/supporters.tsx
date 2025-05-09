"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

interface Supporter {
  _id: string;
  name: string;
  title: string;
  photo?: string;
}

export function Supporters() {
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchSupporters = async () => {
      try {
        setLoading(true);
        const response = await api.get("/api/public/supporters");
        
        if (response.data.success) {
          setSupporters(response.data.supporters || []);
        } else {
          setError("Destekçi verileri alınamadı");
        }
      } catch (error) {
        console.error("Destekçi verileri yüklenirken hata:", error);
        setError("Destekçi verileri yüklenemedi. Lütfen daha sonra tekrar deneyin.");
      } finally {
        setLoading(false);
      }
    };

    fetchSupporters();
  }, []);

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };
  
  const item = {
    hidden: { 
      opacity: 0, 
      scale: 0.8, 
      rotateY: 45,
      z: -100
    },
    show: { 
      opacity: 1, 
      scale: 1, 
      rotateY: 0,
      z: 0,
      transition: { 
        type: "spring", 
        bounce: 0.4, 
        duration: 0.8 
      } 
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {[1, 2, 3].map((i) => (
          <Card key={i} className={`overflow-hidden `}>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Skeleton className="h-32 w-32 rounded-full mb-4 bg-primary/20" />
              <Skeleton className="h-6 w-3/4 mb-2 bg-primary/20" />
              <Skeleton className="h-4 w-1/2 bg-primary/20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (supporters.length === 0) {
    return (
      <div className="text-center my-12 text-muted-foreground">
        <p>Henüz destekçi bulunmuyor.</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto perspective-1000"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {supporters.map((supporter) => (
        <motion.div 
          key={supporter._id} 
          variants={item}
          whileHover={{ 
            scale: 1.05, 
            boxShadow: theme === 'dark' 
              ? "0 10px 25px rgba(255,255,255,0.1)" 
              : "0 10px 25px rgba(0,0,0,0.1)", 
            transition: { duration: 0.2 } 
          }}
          className="transform-gpu"
        >
          <Card className={`overflow-hidden ${theme === 'dark' ? 'bg-black/60 text-white border-gray-800' : 'bg-white text-black border-gray-200'}`}>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              >
                {supporter.photo ? (
                  <div className="relative h-32 w-32 rounded-full overflow-hidden mb-4">
                    <Image
                      src={supporter.photo}
                      alt={supporter.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <Avatar className={`h-32 w-32 mb-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
                    <AvatarFallback>{getInitials(supporter.name)}</AvatarFallback>
                  </Avatar>
                )}
              </motion.div>
              <motion.h3 
                className="text-xl font-semibold mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {supporter.name}
              </motion.h3>
              <motion.p 
                className={`${theme === 'dark' ? 'text-gray-400' : 'text-muted-foreground'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {supporter.title}
              </motion.p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
