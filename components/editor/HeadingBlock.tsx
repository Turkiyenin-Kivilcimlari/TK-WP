"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Block } from "@/components/editor/WritingEditor";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeadingBlockProps {
  block: Block;
  updateContent: (id: string, content: string) => void;
  updateConfig: (id: string, config: Partial<Block>) => void;
  isSelected: boolean;
  onSelect: () => void;
}

export function HeadingBlock({ 
  block, 
  updateContent,
  updateConfig,
  isSelected, 
  onSelect,
}: HeadingBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Seçildiğinde focus
  useEffect(() => {
    if (isSelected && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isSelected]);
  
  // Heading seviyesini değiştir
  const changeHeadingLevel = (level: number) => {
    updateConfig(block.id, { level });
  };
  
  // Textarea'nın yüksekliğini içeriğe göre otomatik ayarla
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [block.content]);
  
  const getHeadingClass = () => {
    switch (block.level) {
      case 1: return "text-4xl font-bold";
      case 2: return "text-3xl font-semibold";
      case 3: return "text-2xl font-medium";
      case 4: return "text-xl font-medium";
      default: return "text-3xl font-semibold";
    }
  };
  
  const getHeadingText = () => {
    switch (block.level) {
      case 1: return "H1";
      case 2: return "H2";
      case 3: return "H3";
      case 4: return "H4";
      default: return "H2";
    }
  };
  
  return (
    <div className="relative group flex items-start gap-2" onClick={onSelect}>
      {isSelected && (
        <div className="flex-shrink-0 mt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 text-xs h-7">
                {getHeadingText()}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => changeHeadingLevel(1)}>H1</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeHeadingLevel(2)}>H2</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeHeadingLevel(3)}>H3</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeHeadingLevel(4)}>H4</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      
      <Textarea
        ref={textareaRef}
        value={block.content}
        onChange={(e) => {
          updateContent(block.id, e.target.value);
          adjustHeight();
        }}
        placeholder="Alt başlık ekle..."
        className={cn(
          "w-full resize-none overflow-hidden border-none p-2 focus-visible:ring-0",
          getHeadingClass(),
          isSelected ? "bg-muted/30" : ""
        )}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            textareaRef.current?.blur();
          }
        }}
      />
    </div>
  );
}
