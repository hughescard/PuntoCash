import type { Metadata } from "next";

import { SignageScreen } from "./signage-screen";

export const metadata: Metadata = {
  title: "PuntoCash",
  description: "Tasas del día, información de sucursal y avisos.",
  robots: { index: false, follow: false },
};

export default function KioskPantallaPage() {
  return <SignageScreen />;
}
