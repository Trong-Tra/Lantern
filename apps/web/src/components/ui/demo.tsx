"use client";

import { useState } from "react";
import { MenuToggle } from "@/components/ui/menu-toggle";
import { HyperText } from "@/components/ui/hyper-text";
import { TextMorph } from "@/components/ui/text-morph";

export function TextMorphButton() {
  const [text, setText] = useState("Continue");
  return (
    <button type="button" className="h-10 w-[120px] rounded-full bg-black text-white dark:bg-white dark:text-black"
      onClick={() => setText((current) => current === "Continue" ? "Confirm" : "Continue")}>
      <TextMorph as="span">{text}</TextMorph>
    </button>
  );
}

export function TextMorphInput() {
  const [text, setText] = useState("Craft");
  return (
    <div className="flex flex-col gap-4">
      <TextMorph className="text-5xl">{text}</TextMorph>
      <input aria-label="Text to morph" className="rounded-lg border p-2" value={text}
        onChange={(event) => setText(event.target.value)} placeholder="Type your text here" />
    </div>
  );
}

export function HyperTextDemo() {
  return <HyperText className="text-4xl font-bold text-black dark:text-white" text="Hyper Text" />;
}

export default function DemoOne() {
  const [open, setOpen] = useState(false);
  return <div className="flex min-h-screen w-full items-center justify-center"><MenuToggle strokeWidth={3} open={open} onOpenChange={setOpen} className="site-menu-button" /></div>;
}
