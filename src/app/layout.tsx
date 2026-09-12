import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/register-sw";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dining Car — Stop throwing money in the bin",
  description:
    "Forward your grocery receipt. AI reads it, USDA FoodKeeper sets eat-by clocks, and a value-maximising dinner plan ensures nothing rots.",
  keywords: ["food waste", "grocery receipt", "meal planning", "AI", "hackathon"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dining Car",
  },
};

export const viewport: Viewport = {
  themeColor: "#1c1c1f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      style={{ "--font-sans": "var(--font-geist-sans)" } as React.CSSProperties}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <div className="cmu-tartan-strip" aria-hidden />
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
