import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Shared/Navbar";
import "./globals.css";
import "react-day-picker/style.css";
import { Toaster } from 'sonner';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chadwick Quotes",
  description: "Modern quoting system for Chadwick Switchboards",
};

import { NextAuthProvider } from "@/components/Shared/NextAuthProvider";
import { headers } from "next/headers";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") || "";
  const isLoginPage = pathname === "/login";
  const isSharedPage = pathname.startsWith("/shared-quote");
  const hideNavbar = isLoginPage || isSharedPage;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50`}
      >
        <NextAuthProvider>
          {!hideNavbar && <Navbar />}
          {children}
          <Toaster position="top-right" richColors />
        </NextAuthProvider>
      </body>
    </html>
  );
}
