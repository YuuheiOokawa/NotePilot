"use client";

import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

// どこからでも呼べるトースト通知（alert/成功メッセージの置き換え）
export function toast(message: string, type: ToastType = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { message, type } }));
}

const STYLES: Record<ToastType, string> = {
  success: "bg-gray-900 text-white",
  error: "bg-red-600 text-white",
  info: "bg-note text-white",
};

const ICONS: Record<ToastType, string> = {
  success: "✅",
  error: "⚠️",
  info: "ℹ️",
};

let nextId = 1;

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail as { message: string; type: ToastType };
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };
    window.addEventListener("app-toast", handler);
    return () => window.removeEventListener("app-toast", handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto w-full max-w-md rounded-xl px-4 py-3 text-sm font-bold shadow-lg ${STYLES[t.type]}`}
          onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
        >
          {ICONS[t.type]} {t.message}
        </div>
      ))}
    </div>
  );
}
