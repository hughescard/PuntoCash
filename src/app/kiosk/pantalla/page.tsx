import type { Metadata } from "next";

import { SignageCarousel } from "./signage-carousel";

export const metadata: Metadata = {
  title: "PuntoCash",
  description: "Tasas del día, información de sucursal y avisos.",
  robots: { index: false, follow: false },
};

export default function KioskPantallaPage() {
  return <SignageCarousel />;
}
