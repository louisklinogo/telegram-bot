"use client";

import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/lib/trpc/client";

type TagEditorProps = {
  documentId: string;
  initialTags: string[];
  onUpdate?: (tags: string[]) => void;
};

export function TagEditor({ documentId, initialTags = [], onUpdate }: TagEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTag, setNewTag] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const updateMutation = trpc.documents.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Tags updated",
        description: "Document tags have been updated successfully",
      });
      utils.documents.list.invalidate();
      onUpdate?.(tags);
      setIsOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddTag = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSave = () => {
    updateMutation.mutate({
      id: documentId,
      tags,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1 transition-opacity hover:opacity-70"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          type="button"
        >
          {initialTags && initialTags.length > 0 ? (
            <>
              {initialTags.slice(0, 3).map((tag) => (
                <Badge className="text-xs" key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
              {initialTags.length > 3 && (
                <Badge className="text-xs" variant="secondary">
                  +{initialTags.length - 3}
                </Badge>
              )}
            </>
          ) : (
            <Badge className="text-xs" variant="outline">
              + Add tags
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4">
          <div>
            <h4 className="mb-2 font-medium text-sm">Edit Tags</h4>
            <div className="mb-3 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge className="text-xs" key={tag} variant="secondary">
                  {tag}
                  <button
                    className="ml-1 hover:text-destructive"
                    onClick={() => handleRemoveTag(tag)}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {tags.length === 0 && (
                <span className="text-muted-foreground text-sm">No tags yet</span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              autoFocus
              className="h-8 text-sm"
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add new tag..."
              value={newTag}
            />
            <Button disabled={!newTag.trim()} onClick={handleAddTag} size="sm" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setTags(initialTags);
                setIsOpen(false);
              }}
              size="sm"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={updateMutation.isPending} onClick={handleSave} size="sm">
              {updateMutation.isPending ? (
                "Saving..."
              ) : (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
