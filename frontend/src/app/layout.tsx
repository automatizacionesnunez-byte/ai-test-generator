import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Test Generator",
  description: "Sube tu temario y genera exámenes con IA al instante",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased bg-brand-dark text-white min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
