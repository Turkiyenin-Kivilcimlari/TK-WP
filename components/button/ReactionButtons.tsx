"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';

export enum ReactionType {
  LIKE = 'like',
  DISLIKE = 'dislike'
}

interface ReactionButtonsProps {
  targetId: string;
  targetType: 'article' | 'comment';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  showCount?: boolean;
  className?: string;
}

export function ReactionButtons({
  targetId,
  targetType,
  size = "sm",
  variant = "ghost",
  showCount = true,
  className
}: ReactionButtonsProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Reaksiyon durumunu ve sayısını yükle
  const fetchReactionStatus = async () => {
    try {
      const endpoint = targetType === "article"
        ? `/api/articles/${targetId}/reaction`
        : `/api/comments/${targetId}/reaction`;
        
      const response = await api.get(endpoint);
      
      if (response.data.success) {
        setUserReaction(response.data.userReaction);
        setLikeCount(response.data.likeCount);
        setDislikeCount(response.data.dislikeCount);
      }
    } catch (error) {
    }
  };

  // Komponent yüklendiğinde reaksiyon durumunu al
  useEffect(() => {
    if (targetId) {
      fetchReactionStatus();
    }
  }, [targetId, targetType]);

  // Reaksiyon işlemi
  const handleReaction = async (reactionType: ReactionType) => {
    if (!session) {
      toast("Önce giriş yapmalısınız", {
        action: {
          label: "Giriş Yap",
          onClick: () => router.push(`/signin?callbackUrl=${encodeURIComponent(window.location.href)}`)
        },
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const endpoint = targetType === "article"
        ? `/api/articles/${targetId}/reaction`
        : `/api/comments/${targetId}/reaction`;
        
      const response = await api.post(endpoint, {
        reactionType
      });
      
      if (response.data.success) {
        // API'den gelen reaction değerine göre state'i güncelle
        setUserReaction(response.data.reaction);
        // Reaksiyon durumunu güncelleyerek sayıları yeniden yükle
        fetchReactionStatus();
      }
    } catch (error: any) {
      toast.error("Reaksiyon işlemi başarısız", {
        description: "Bir hata oluştu."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn(
      "flex gap-2",
      className
    )}>
      <Button
        onClick={() => handleReaction(ReactionType.LIKE)}
        variant={variant}
        size={size}
        disabled={isLoading}
        className={cn(
          "flex items-center justify-center gap-1 w-full",
          userReaction === ReactionType.LIKE && "text-green-500 bg-green-50 hover:bg-green-100 hover:text-green-600",
          "h-8 md:h-auto p-2 md:p-3" // Mobil için daha küçük boyut
        )}
        title="Beğen"
      >
        <ThumbsUp 
          className={cn(
            "h-4 w-4 md:h-5 md:w-5", // Mobil için daha küçük ikon
            userReaction === ReactionType.LIKE && "fill-green-500"
          )} 
        />
        {showCount && <span className="ml-1 text-xs md:text-sm">{likeCount}</span>}
      </Button>
      
      <Button
        onClick={() => handleReaction(ReactionType.DISLIKE)}
        variant={variant}
        size={size}
        disabled={isLoading}
        className={cn(
          "flex items-center justify-center gap-1 w-full",
          userReaction === ReactionType.DISLIKE && "text-red-500 bg-red-50 hover:bg-red-200 hover:text-red-600",
          "h-8 md:h-auto p-2 md:p-3" // Mobil için daha küçük boyut
        )}
        title="Beğenme"
      >
        <ThumbsDown 
          className={cn(
            "h-4 w-4 md:h-5 md:w-5", // Mobil için daha küçük ikon
            userReaction === ReactionType.DISLIKE && "fill-red-500"
          )} 
        />
        {showCount && <span className="ml-1 text-xs md:text-sm">{dislikeCount}</span>}
      </Button>
    </div>
  );
}
