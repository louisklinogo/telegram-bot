"use client";

import { Label } from "@Faworra/ui/label";
import { Folder, FolderPlus, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
            <Button className="w-full justify-between" variant="outline">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <span className="truncate">{currentPath}</span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80">
            <div className="space-y-3">
              <div>
                <p className="mb-2 font-medium text-sm">Quick Folders</p>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_FOLDERS.map((folder) => (
                    <Button
                      className="justify-start"
                      key={folder}
                      onClick={() => setPresetFolder(folder)}
                      size="sm"
                      variant="outline"
                    >
                      <Folder className="mr-2 h-3 w-3" />
                      {folder}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="mb-2 font-medium text-sm">Create Subfolder</p>
                {showInput ? (
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      onChange={(e) => setNewFolder(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addFolder(newFolder);
                        }
                      }}
                      placeholder="Folder name..."
                      value={newFolder}
                    />
                    <Button disabled={!newFolder} onClick={() => addFolder(newFolder)} size="sm">
                      Add
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => setShowInput(true)}
                    size="sm"
                    variant="outline"
                  >
                    <FolderPlus className="mr-2 h-4 w-4" />
                    New Folder
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {value.length > 0 && (
          <Button onClick={() => onChange([])} size="sm" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Breadcrumb path */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((folder, index) => (
            <Badge className="gap-1" key={index} variant="secondary">
              {folder}
              <button
                className="hover:text-destructive"
                onClick={() => removeFolder(index)}
                type="button"
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
