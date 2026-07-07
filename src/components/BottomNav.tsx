"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/articles", label: "記事", icon: "📝" },
  { href: "/articles/new", label: "作成", icon: "✨" },
  { href: "/review", label: "承認", icon: "✅" },
  { href: "/settings", label: "設定", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/articles") return pathname === "/articles" || (pathname.startsWith("/articles/") && pathname !== "/articles/new");
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-lg">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
              isActive(tab.href) ? "font-bold text-note-dark" : "text-gray-400"
            }`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
