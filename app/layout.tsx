import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Builder - Create Professional Resumes",
  description:
    "Build and customize professional resumes with ease. Create, edit, and download your perfect resume.",
  icons: {
    icon: [
      { url: "/refresh.svg", type: "image/svg+xml" },
      { url: "/refresh-24.png", sizes: "24x24", type: "image/png" },
      { url: "/refresh-64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: [{ url: "/refresh-64.png", sizes: "64x64", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
