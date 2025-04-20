"use client";
import { ReactionButtons } from "./ReactionButtons";

type LikeButtonProps = {
  targetId: string;
  targetType: "article" | "comment";
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost";
  showCount?: boolean;
  className?: string;
  'data-like-target'?: string; // Programatik erişim için veri özniteliği
  'data-dislike-target'?: string; // Beğenmeme butonu için veri özniteliği
};

export function LikeButton({
  targetId,
  targetType,
  size = "default",
  variant = "ghost",
  showCount = true,
  className,
  'data-like-target': likeDomId,
  'data-dislike-target': dislikeDomId,
  ...props
}: LikeButtonProps) {
  return <ReactionButtons 
    targetId={targetId}
    targetType={targetType}
    size={size}
    variant={variant}
    showCount={showCount}
    className={className}
    data-like-target={likeDomId || targetId}
    data-dislike-target={dislikeDomId || targetId}
    {...props}
  />;
}
