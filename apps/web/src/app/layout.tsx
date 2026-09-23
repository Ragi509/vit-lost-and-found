import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "VIT Lost & Found — Campus Recovery Platform",
  description: "AI-assisted lost and found recovery platform for Vishwakarma Institute of Technology, Pune.",
  applicationName: "VIT Lost & Found",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased transition-colors duration-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
