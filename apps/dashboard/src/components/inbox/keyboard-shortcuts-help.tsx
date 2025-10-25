"use client";

import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function KeyboardShortcutsHelp() {
  const shortcuts = [
    {
      category: "Navigation",
      items: [
        { keys: ["↑"], description: "Previous conversation" },
        { keys: ["↓"], description: "Next conversation" },
        { keys: ["Esc"], description: "Deselect conversation" },
      ],
    },
    {
      category: "View",
      items: [
        { keys: ["Ctrl", "B"], description: "Toggle customer sidebar" },
        { keys: ["Cmd", "B"], description: "Toggle customer sidebar (Mac)" },
      ],
    },
    {
      category: "Messaging",
      items: [
        { keys: ["Enter"], description: "Send message" },
        { keys: ["Shift", "Enter"], description: "New line" },
      ],
    },
    {
      category: "Coming Soon",
      items: [
        { keys: ["O"], description: "Mark as open" },
        { keys: ["P"], description: "Mark as pending" },
        { keys: ["R"], description: "Mark as resolved" },
        { keys: ["/"], description: "Open quick replies" },
        { keys: ["Cmd", "K"], description: "Quick search" },
      ],
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost">
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>Use these shortcuts to navigate faster</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="mb-3 font-semibold text-sm">{section.category}</h3>
              <div className="space-y-2">
                {section.items.map((item, index) => (
                  <div
                    className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50"
                    key={index}
                  >
                    <span className="text-muted-foreground text-sm">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, keyIndex) => (
                        <span className="flex items-center gap-1" key={keyIndex}>
                          <kbd className="rounded border border-border bg-muted px-2 py-1 font-semibold text-xs">
                            {key}
                          </kbd>
                          {keyIndex < item.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
