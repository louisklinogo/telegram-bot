"use client";

import type { Editor } from "@tiptap/react";
import { useRef, useState } from "react";
import {
  MdOutlineAddLink,
  MdOutlineCheck,
  MdOutlineDelete,
  MdOutlineLinkOff,
} from "react-icons/md";
import { Button } from "../../../button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../popover";
import { formatUrlWithProtocol } from "../../utils";
import { BubbleMenuButton } from "./bubble-menu-button";

interface LinkItemProps {
  editor: Editor;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function LinkItem({ editor, open, setOpen }: LinkItemProps) {
  const [value, setValue] = useState("");
  const isActive = editor.isActive("link");
  const inputRef = useRef<HTMLInputElement>(null);
  const linkValue = editor.getAttributes("link").href;

  const handleSubmit = () => {
    const url = formatUrlWithProtocol(value);

    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();

      setOpen(false);
    }
  };

  return (
    <Popover modal={false} onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <div>
          <BubbleMenuButton action={() => setOpen(true)} isActive={isActive}>
            {linkValue ? (
              <MdOutlineLinkOff className="size-4" />
            ) : (
              <MdOutlineAddLink className="size-4" />
            )}
          </BubbleMenuButton>
        </div>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-0" sideOffset={10}>
        <div className="flex p-1">
          <input
            className="h-7 flex-1 bg-background p-0.5 text-xs outline-none placeholder:text-muted-foreground"
            defaultValue={linkValue || ""}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmit();
              }
            }}
            placeholder="Paste a link"
            ref={inputRef}
            type="text"
          />

          {linkValue ? (
            <Button
              className="flex size-7 items-center p-1 text-red-600 transition-all hover:border-none hover:bg-red-100 dark:hover:bg-red-800"
              onClick={() => {
                editor.chain().focus().unsetLink().run();
                if (inputRef.current) {
                  inputRef.current.value = "";
                }
                setOpen(false);
              }}
              size="icon"
              type="button"
              variant="outline"
            >
              <MdOutlineDelete className="size-4" />
            </Button>
          ) : (
            <Button className="size-7" onClick={handleSubmit} size="icon" type="button">
              <MdOutlineCheck className="size-4" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
