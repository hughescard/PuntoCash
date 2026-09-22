import type { Metadata } from "next";

import { RemesasAutoservicioFlow } from "./remesas-flow";

export const metadata: Metadata = {
  title: "Cobrar remesa",
  robots: { index: false, follow: false },
};

export default function RemesasAutoservicioPage() {
  return <RemesasAutoservicioFlow />;
}
