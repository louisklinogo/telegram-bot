"use client";

import { useState } from "react";
import { Folder, FolderPlus, X } from "lucide-react";
import { Label } from "@cimantikos/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

// Common folder presets
const PRESET_FOLDERS = [
  "Receipts",
  "Invoices", 
  "Contracts",
  "Legal",
  "Tax Documents",
  "Bank Statements",
  "Measurements",
  "Photos",
  "Other",
];

type FolderSelectorProps = {
  value: string[]; // e.g., ["Receipts", "2024", "January"]
  onChange: (value: string[]) => void;
};

export function FolderSelector({ value, onChange }: FolderSelectorProps) {
  const [newFolder, setNewFolder] = useState("");
  const [showInput, setShowInput] = useState(false);

  const currentPath = value.length > 0 ? value.join(" / ") : "Root";

  const addFolder = (folder: string) => {
    if (folder && !value.includes(folder)) {
      onChange([...value, folder]);
      setNewFolder("");
      setShowInput(false);
    }
  };

  const removeFolder = (index: number) => {
    const newPath = [...value];
    newPath.splice(index, 1);
    onChange(newPath);
  };

  const setPresetFolder = (folder: string) => {
    onChange([folder]);
  };

  return (
    <div className="space-y-3">
      <Label>Folder (Optional)</Label>
      
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <span className="truncate">{currentPath}</span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">Quick Folders</p>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_FOLDERS.map((folder) => (
                    <Button
                      key={folder}
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => setPresetFolder(folder)}
                    >
                      <Folder className="h-3 w-3 mr-2" />
                      {folder}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Create Subfolder</p>
                {!showInput ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowInput(true)}
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Folder
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Folder name..."
                      value={newFolder}
                      onChange={(e) => setNewFolder(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addFolder(newFolder);
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={() => addFolder(newFolder)}
                      disabled={!newFolder}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {value.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange([])}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Breadcrumb path */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((folder, index) => (
            <Badge key={index} variant="secondary" className="gap-1">
              {folder}
              <button
                type="button"
                onClick={() => removeFolder(index)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
