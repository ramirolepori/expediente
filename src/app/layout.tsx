import type { Metadata, Viewport } from "next";
import { Cinzel, IBM_Plex_Mono, IM_Fell_English, Inter, Oswald, Playfair_Display, Special_Elite } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const maquina = Special_Elite({ variable: "--font-maquina", weight: "400", subsets: ["latin"] });
const titular = Playfair_Display({ variable: "--font-titular", subsets: ["latin"] });
// fuentes de las otras ambientaciones
const oficina = IBM_Plex_Mono({ variable: "--font-oficina", weight: ["400", "600"], subsets: ["latin"] });
const condensada = Oswald({ variable: "--font-condensada", subsets: ["latin"] });
const antigua = IM_Fell_English({ variable: "--font-antigua", weight: "400", style: ["normal", "italic"], subsets: ["latin"] });
const romana = Cinzel({ variable: "--font-romana", subsets: ["latin"] });

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
    <html lang="es" className={`${inter.variable} ${maquina.variable} ${titular.variable} ${oficina.variable} ${condensada.variable} ${antigua.variable} ${romana.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
