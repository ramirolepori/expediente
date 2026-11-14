import type { Metadata, Viewport } from "next";
import { Inter, Special_Elite, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const maquina = Special_Elite({ variable: "--font-maquina", weight: "400", subsets: ["latin"] });
const titular = Playfair_Display({ variable: "--font-titular", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Expediente",
  description: "Casos de investigación para resolver en grupo",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#121212",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} ${maquina.variable} ${titular.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
