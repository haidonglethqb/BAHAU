import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BAHAU — Quản trị Nhân sự Thông minh | Trường Đại học Kiến trúc Đà Nẵng",
  description:
    "Hệ thống Quản trị Nhân sự Thông minh cho Trường Đại học Kiến trúc Đà Nẵng (DAU) tích hợp AI Assistant và DevOps.",
};

import { AuthProvider } from "../context/AuthContext";
import { AppLayoutWrapper } from "../components/AppLayoutWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="scroll-smooth">
      <body className="min-h-screen bg-canvas text-ink antialiased font-sans">
        <AuthProvider>
          <AppLayoutWrapper>{children}</AppLayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}

