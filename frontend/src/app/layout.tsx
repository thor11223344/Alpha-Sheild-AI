import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AlphaSheild AI",
  description: "Integrated Market Intelligence & Risk Analysis Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="h-screen flex overflow-hidden bg-gray-50 text-gray-900">
          <div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-80">
            <Sidebar />
          </div>
          <main className="md:pl-72 pb-10 flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
