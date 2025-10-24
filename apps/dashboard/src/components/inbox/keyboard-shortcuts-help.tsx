"use client";

import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
        <Button variant="ghost" size="icon">
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate faster
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold mb-3">{section.category}</h3>
              <div className="space-y-2">
                {section.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                  >
                    <span className="text-sm text-muted-foreground">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded">
                            {key}
                          </kbd>
                          {keyIndex < item.keys.length - 1 && (
                            <span className="text-xs text-muted-foreground">+</span>
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