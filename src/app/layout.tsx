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
  /* Heredado por todas las pantallas. Cada una lo declaraba por su cuenta —
     cincuenta y tres veces—, lo que hacía depender de que quien añada una
     pantalla se acuerde. Una pantalla operativa de un producto financiero
     indexada es un fallo caro para dejarlo a la memoria. */
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0B132B",
  /* Worker y Kiosco son de escritorio: 1440x900 de referencia, 1280px de
     mínimo (manual §10). La consola de administración NO lo es — se usa a
     diario desde un teléfono (Admin FRD FR-AD-SHELL-6), así que la escala del
     navegador tiene que ser la real y el zoom del usuario no se limita. */
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
