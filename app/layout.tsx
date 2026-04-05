import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Admin Panel — mufasil.io CRM",
  description: "Manage plan upgrade requests, approve payments, and control user access.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] antialiased font-[family-name:var(--font-geist-sans)]">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(16px)',
              color: '#1d1d1f',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              border: '1px solid rgba(229,229,231,0.6)',
              fontWeight: 500,
            },
          }}
        />
      </body>
    </html>
  );
}
