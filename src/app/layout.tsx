import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import QueryProvider from "@/components/providers/QueryProvider";

export const metadata: Metadata = {
  title: "Ragtag Archive Browser - 影片存檔瀏覽器",
  description: "現代化的影片存檔瀏覽器，瀏覽和觀看存檔影片",
  keywords: ["archive", "video", "browser", "vtuber", "hololive"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className="gradient-bg min-h-screen custom-scrollbar">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <Header />
              <main className="pt-16">{children}</main>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
