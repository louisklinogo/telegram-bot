"use client";

import { X } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
};

export function TagInput({
  value = [],
  onChange,
  placeholder = "Add tags...",
  suggestions = [],
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = suggestions.filter(
    (suggestion) =>
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) && !value.includes(suggestion)
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputValue("");
      setShowSuggestions(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap gap-2">
        {value.map((tag) => (
          <Badge className="gap-1 pr-1" key={tag} variant="secondary">
            <span>{tag}</span>
            <button
              className="rounded-full p-0.5 hover:bg-muted"
              onClick={() => removeTag(tag)}
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Input
        autoComplete="off"
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        onChange={(e) => {
          setInputValue(e.target.value);
          setShowSuggestions(e.target.value.length > 0);
        }}
        onFocus={() => setShowSuggestions(inputValue.length > 0)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        value={inputValue}
      />

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {filteredSuggestions.map((suggestion) => (
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
              key={suggestion}
              onClick={() => addTag(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <p className="mt-1 text-muted-foreground text-xs">Press Enter to add, Backspace to remove</p>
    </div>
  );
}
