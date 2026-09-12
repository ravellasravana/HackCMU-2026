import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dining Car — eat-by alarms from your grocery receipt",
  description:
    "Forward your grocery receipt. Dining Car puts eat-by alarms on your calendar and tells you what to cook tonight so nothing rots.",
};

export const viewport: Viewport = {
  themeColor: "#231d15",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      style={{ "--font-sans": "var(--font-geist-sans)" } as React.CSSProperties}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
