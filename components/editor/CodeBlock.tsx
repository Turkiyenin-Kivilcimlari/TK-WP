"use client";

import { useState, useRef, useEffect } from "react";
import { X, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Block } from "@/components/editor/WritingEditor";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import vscDarkPlus from 'react-syntax-highlighter/dist/cjs/styles/prism/vsc-dark-plus';
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  block: Block;
  updateContent: (id: string, content: string) => void;
  updateConfig: (id: string, config: Partial<Block>) => void;
  isSelected: boolean;
  onSelect: () => void;
}

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#", },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "dart", label: "Dart" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "scss", label: "SCSS" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "xml", label: "XML" },
  { value: "markdown", label: "Markdown" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash/Shell" },
  { value: "powershell", label: "PowerShell" },
  { value: "r", label: "R" },
  { value: "matlab", label: "MATLAB" },
  { value: "perl", label: "Perl" },
  { value: "haskell", label: "Haskell" },
  { value: "scala", label: "Scala" },
  { value: "objectivec", label: "Objective-C" },
  { value: "lua", label: "Lua" },
  { value: "fsharp", label: "F#" },
  { value: "clojure", label: "Clojure" },
  { value: "groovy", label: "Groovy" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "graphql", label: "GraphQL" },
  { value: "regex", label: "Regular Expressions" },
  { value: "toml", label: "TOML" },
  { value: "latex", label: "LaTeX" },
  { value: "elixir", label: "Elixir" },
  { value: "solidity", label: "Solidity" },
];

export function CodeBlock({
  block,
  updateContent,
  updateConfig,
  isSelected,
  onSelect,
}: CodeBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [language, setLanguage] = useState(block.language || "javascript");
  const [isEditing, setIsEditing] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  
  const filteredLanguages = LANGUAGES.filter(lang => 
    lang.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateContent(block.id, e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const beforeText = textarea.value.substring(0, start);
      const afterText = textarea.value.substring(end);
      
      const newText = beforeText + "    " + afterText;
      
      updateContent(block.id, newText);
      
      setTimeout(() => {
        textarea.selectionStart = start + 4;
        textarea.selectionEnd = start + 4;
      }, 0);
    }
  };
  
  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    updateConfig(block.id, { language: value });
    setOpen(false);
  };
  
  useEffect(() => {
    if (isSelected && textareaRef.current) {
      textareaRef.current.focus();
      setIsEditing(true);
    }
  }, [isSelected]);

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  const selectedLanguage = LANGUAGES.find(lang => lang.value === language);

  return (
    <div className="relative" onClick={onSelect}>
      <div className="flex justify-between items-center mb-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="w-[180px] justify-between">
              {selectedLanguage ? selectedLanguage.label : "Dil seçin"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <div className="p-2">
              <div className="flex items-center border rounded-md px-2">
                <Search className="h-4 w-4 text-muted-foreground mr-2" />
                <Input
                  placeholder="Dil ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9"
                />
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {filteredLanguages.length > 0 ? (
                filteredLanguages.map((lang) => (
                  <div
                    key={lang.value}
                    className={cn(
                      "flex items-center px-2 py-1.5 mx-1 text-sm rounded-md cursor-pointer hover:bg-muted",
                      language === lang.value && "bg-muted/50"
                    )}
                    onClick={() => handleLanguageChange(lang.value)}
                  >
                    {language === lang.value && (
                      <Check className="h-4 w-4 mr-2 text-primary" />
                    )}
                    <span className={cn("ml-2", language !== lang.value && "ml-6")}>
                      {lang.label}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-2 text-sm text-muted-foreground">
                  Sonuç bulunamadı
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
        
        <div className="flex gap-2">
          {block.content && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                toggleEditMode();
              }}
              className="h-8 opacity-80"
            >
              {isEditing ? "Önizle" : "Düzenle"}
            </Button>
          )}
        </div>
      </div>
      
      {isEditing ? (
        <div className="bg-slate-950 rounded-md p-2 text-slate-50 font-mono text-sm">
          <Textarea
            ref={textareaRef}
            value={block.content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder="Kodu buraya yazın..."
            className="min-h-[120px] resize-y border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-inherit placeholder:text-slate-500"
          />
        </div>
      ) : (
        <div className="rounded-md overflow-hidden">
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            showLineNumbers
            customStyle={{
              margin: 0,
              padding: '1rem',
              fontSize: '0.875rem',
              borderRadius: '0.375rem',
            }}
          >
            {block.content || "// Kod ekleyin"}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}
