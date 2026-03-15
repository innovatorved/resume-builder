import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Builder — Craft Your Story",
  description:
    "Build polished, professional resumes with an intuitive editor. Create, refine, and download your resume as a beautifully typeset PDF.",
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
