import type { Metadata } from "next";

import { RemesasFlow } from "./remesas-flow";

export const metadata: Metadata = { title: "Remesas", robots: { index: false, follow: false } };

export default function RemesasPage() {
  return <RemesasFlow />;
}
