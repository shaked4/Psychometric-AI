import type { Metadata } from "next";
import { Rubik, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkAuthProvider } from "@/components/auth/clerk-auth-provider";
import { CloudSyncBridge } from "@/components/auth/cloud-sync-bridge";
import { CLERK_ENABLED } from "@/lib/config";

const rubik = Rubik({
  variable: "--font-sans",
  subsets: ["hebrew", "latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Psychometric AI",
  description: "מאמן פסיכומטרי אישי מבוסס בינה מלאכותית",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${rubik.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkAuthProvider>
          {CLERK_ENABLED && <CloudSyncBridge />}
          {children}
        </ClerkAuthProvider>
      </body>
    </html>
  );
}
