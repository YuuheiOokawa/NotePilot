"use client";

import { useState } from "react";

export default function CopyButton({
  text,
  label,
  onCopied,
  className,
}: {
  text: string;
  label: string;
  onCopied?: () => void;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    onCopied?.();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className={
        className ??
        "rounded-lg border border-note px-3 py-1.5 text-xs font-bold text-note-dark active:bg-note/10"
      }
    >
      {copied ? "✓ コピーしました" : label}
    </button>
  );
}
