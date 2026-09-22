import type { Metadata } from "next";

import { GirosAutoservicioSelector } from "./giros-selector";

export const metadata: Metadata = {
  title: "Giros",
  robots: { index: false, follow: false },
};

export default function GirosAutoservicioPage() {
  return <GirosAutoservicioSelector />;
}
