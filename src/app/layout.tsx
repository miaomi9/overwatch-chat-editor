import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import App from "../app";
import { ToastProvider } from "@/contexts/ToastContext";
import { AppreciationProvider } from "@/components/AppreciationModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "守望先锋聊天编辑器",
  description: "一个方便创建守望先锋聊天的可视化编辑器",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          <AppreciationProvider>
            <App />
            {children}
          </AppreciationProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
