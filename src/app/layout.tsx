import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import SetupBanner from "@/components/SetupBanner";
import Toaster from "@/components/Toast";

export const metadata: Metadata = {
  title: "Note Auto Creator",
  description: "note記事作成・販売支援アプリ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NoteAC",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#41c9b4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="mx-auto min-h-screen max-w-lg pb-20">{children}</div>
        <BottomNav />
        <Toaster />
        <SetupBanner />
      </body>
    </html>
  );
}
