"use client";

import { useState, useEffect, useRef } from "react";
import { Trash2, Bold, Italic, List, ListOrdered, Palette, Underline as UnderlineIcon, Link as LinkIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Block } from "@/components/editor/WritingEditor";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Renk seçenekleri
const colorOptions = [
  { name: 'Varsayılan', value: 'currentColor' },
  { name: 'Kırmızı', value: '#ef4444' },
  { name: 'Mavi', value: '#3b82f6' },
  { name: 'Yeşil', value: '#22c55e' },
  { name: 'Mor', value: '#a855f7' },
  { name: 'Sarı', value: '#eab308' },
];

// Düzenleyici Araç Çubuğu
const MenuBar = ({ editor }: { editor: Editor | null }) => {
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [linkOpen, setLinkOpen] = useState<boolean>(false);
  const linkInputRef = useRef<HTMLInputElement>(null);

  if (!editor) {
    return null;
  }

  const handleSetLink = () => {
    if (linkUrl) {
      // Eğer http:// veya https:// ile başlamıyorsa, https:// ekle
      const url = linkUrl.startsWith('http://') || linkUrl.startsWith('https://') 
        ? linkUrl 
        : `https://${linkUrl}`;
        
      // Link eklemek için setLink kullanılmalı, setMark değil
      editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
      setLinkUrl('');
      setLinkOpen(false);
    }
  };

  const handleRemoveLink = () => {
    // Link kaldırmak için unsetLink kullanılmalı
    editor.chain().focus().unsetLink().run();
    setLinkUrl('');
    setLinkOpen(false);
  };

  // Link popover açıldığında aktif linkin URL'sini al
  useEffect(() => {
    if (linkOpen && editor.isActive('link')) {
      const href = editor.getAttributes('link').href;
      setLinkUrl(href || '');
      // Input'a fokuslan
      setTimeout(() => {
        linkInputRef.current?.focus();
        linkInputRef.current?.select();
      }, 100);
    } else if (linkOpen) {
      setLinkUrl('');
      setTimeout(() => {
        linkInputRef.current?.focus();
      }, 100);
    }
  }, [linkOpen, editor]);

  return (
    <div className="flex items-center space-x-1 bg-background border rounded-md p-1 mb-2">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={editor.isActive('bold') ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Kalın</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={editor.isActive('italic') ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>İtalik</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={editor.isActive('underline') ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Altı Çizili</p>
          </TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={editor.isActive('bulletList') ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Madde İşaretli Liste</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={editor.isActive('orderedList') ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Numaralandırılmış Liste</p>
          </TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-border mx-1" />

        <Tooltip>
          <Popover open={linkOpen} onOpenChange={setLinkOpen}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant={editor.isActive('link') ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Bağlantı</p>
            </TooltipContent>
            <PopoverContent className="w-300 p-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="link-url">Bağlantı URL&apos;i</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="link-url"
                      ref={linkInputRef}
                      value={linkUrl} 
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://ornek.com"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSetLink();
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRemoveLink}
                    disabled={!editor.isActive('link')}
                  >
                    Bağlantıyı Kaldır
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSetLink}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Bağlantıyı Ekle
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </Tooltip>

        <div className="h-4 w-px bg-border mx-1" />

        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Metin Rengi</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent className="w-48 p-2">
            <div className="grid grid-cols-3 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  onClick={() => editor.chain().focus().setColor(color.value).run()}
                  className={cn(
                    "h-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors",
                    editor.isActive({ textStyle: { color: color.value } }) && 'ring-2 ring-primary'
                  )}
                  title={color.name}
                >
                  <div 
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: color.value === 'currentColor' ? 'currentColor' : color.value }}
                  />
                </button>
              ))}
            </div>
          </PopoverContent>
      </Popover>
    </TooltipProvider>
  </div>
);
};

interface TextBlockProps {
  block: {
    id: string;
    content?: string;
  };
  updateContent: (id: string, content: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  updateConfig?: (config: any) => void;
}

export function TextBlock({ 
  block, 
  updateContent, 
  isSelected, 
  onSelect,
  updateConfig
}: TextBlockProps) {
  const [initialized, setInitialized] = useState(false);
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Underline,
      Link.configure({
        openOnClick: false, // Bağlantıya tıklandığında açılmasını engeller
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80',
          rel: 'noopener noreferrer',
          target: '_blank'
        }
      }),
    ],
    content: block.content || '',
    onUpdate: ({ editor }) => {
      if (initialized) {
        updateContent(block.id, editor.getHTML());
      }
    },
    onFocus: () => {
      onSelect();
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[100px] prose dark:prose-invert prose-sm sm:prose-base max-w-none focus:outline-none p-0',
      },
      handleKeyDown: (view, event) => {
        // Tab tuşu için özel işleme
        if (event.key === 'Tab') {
          // Varsayılan davranışı engelle (form alanları arası geçiş)
          event.preventDefault();
          
          // Editöre 4 boşluk ekle
          view.dispatch(view.state.tr.insertText('    '));
          
          // Olayın daha fazla işlenmesini durdur
          return true;
        }
        return false;
      },
    },
  });

  // İlk yüklemeden sonra initialized durumunu true yap
  useEffect(() => {
    if (editor) {
      setInitialized(true);
    }
  }, [editor]);

  // Seçildiğinde odaklanma
  useEffect(() => {
    if (isSelected && editor && !editor.isFocused) {
      editor.commands.focus('end');
    }
  }, [isSelected, editor]);

  // İçerik değiştiğinde editörü güncelle (dışardan gelen değişiklikler için)
  useEffect(() => {
    if (editor && initialized && block.content !== editor.getHTML()) {
      editor.commands.setContent(block.content || '');
    }
  }, [block.content, editor, initialized]);

  // Editör boş iken placeholder göster
  useEffect(() => {
    if (editor && initialized) {
      if (!block.content || block.content === '<p></p>') {
        editor.view.dom.setAttribute('data-placeholder', 'Bir şeyler yaz...');
      } else {
        editor.view.dom.removeAttribute('data-placeholder');
      }
    }
  }, [block.content, editor, initialized]);

  return (
    <div className="relative group" onClick={onSelect}>
      {isSelected && editor && <MenuBar editor={editor} />}
      
      <div 
        className={cn(
          "rounded-md transition-colors",
          isSelected ? "bg-muted/30" : ""
        )}
      >
        <EditorContent 
          editor={editor} 
          className="prose-p:my-1.5 prose-ul:my-1 prose-ol:my-1 p-2" 
        />
      </div>
      
      <style jsx global>{`
        .ProseMirror {
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before,
        .ProseMirror[data-placeholder]::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5rem;
        }
        .ProseMirror ul li {
          list-style-type: disc;
        }
        .ProseMirror ol li {
          list-style-type: decimal;
        }
      `}</style>
    </div>
  );
}
