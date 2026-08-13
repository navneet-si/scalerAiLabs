import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { IconRail } from "@/components/shell/IconRail";
import { TopBar } from "@/components/shell/TopBar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Fireflies.ai Clone",
  description: "A clone of Fireflies.ai frontend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full flex overflow-hidden">
        <ToastProvider>
          {/* Left Rail */}
          <IconRail />

          {/* Main Area */}
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--color-background)]">
            <TopBar />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
