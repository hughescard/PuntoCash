import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

/**
 * Montserrat is the official PuntoCash typeface (manual §4).
 * Exactly four weights are loaded: Regular 400, Medium 500, SemiBold 600, Bold 700.
 * "Evitar el uso de más de cuatro pesos en una misma aplicación."
 */
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PuntoCash",
    template: "%s · PuntoCash",
  },
  description: "PuntoCash — Casa de cambio. Plataforma de servicios financieros.",
};

export const viewport: Viewport = {
  themeColor: "#0B132B",
  // Desktop-first financial application (manual §10): 1440x900 reference,
  // 1280px minimum target. No mobile scaling behaviour is assumed.
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={montserrat.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
