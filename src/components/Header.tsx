"use client";

import Link from "next/link";

export default function Header({ title, backHref }: { title: string; backHref?: string }) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur">
      {backHref && (
        <Link href={backHref} className="-ml-1 p-1 text-xl leading-none text-gray-500">
          ←
        </Link>
      )}
      <h1 className="truncate text-base font-bold">{title}</h1>
    </header>
  );
}
