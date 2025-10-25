import { type Editor, BubbleMenu as TiptapBubbleMenu } from "@tiptap/react";
import { useState } from "react";
import {
  MdOutlineFormatBold,
  MdOutlineFormatItalic,
  MdOutlineFormatStrikethrough,
} from "react-icons/md";
import type { Props as TippyOptions } from "tippy.js";
import { BubbleMenuItem } from "./bubble-item";
import { LinkItem } from "./link-item";

export function BubbleMenu({
  editor,
  tippyOptions,
}: {
  editor: Editor;
  tippyOptions?: TippyOptions;
}) {
  const [openLink, setOpenLink] = useState(false);

  if (!editor) {
    return null;
  }

  return (
    <div>
      <TiptapBubbleMenu editor={editor} tippyOptions={tippyOptions}>
        <div className="flex w-fit max-w-[90vw] overflow-hidden rounded-full border border-border bg-background font-regular text-mono">
          <>
            <BubbleMenuItem
              action={() => editor.chain().focus().toggleBold().run()}
              editor={editor}
              isActive={editor.isActive("bold")}
            >
              <MdOutlineFormatBold className="size-4" />
              <span className="sr-only">Bold</span>
            </BubbleMenuItem>

            <BubbleMenuItem
              action={() => editor.chain().focus().toggleItalic().run()}
              editor={editor}
              isActive={editor.isActive("italic")}
            >
              <MdOutlineFormatItalic className="size-4" />
              <span className="sr-only">Italic</span>
            </BubbleMenuItem>

            <BubbleMenuItem
              action={() => editor.chain().focus().toggleStrike().run()}
              editor={editor}
              isActive={editor.isActive("strike")}
            >
              <MdOutlineFormatStrikethrough className="size-4" />
              <span className="sr-only">Strike</span>
            </BubbleMenuItem>

            <LinkItem editor={editor} open={openLink} setOpen={setOpenLink} />
          </>
        </div>
      </TiptapBubbleMenu>
    </div>
  );
}
