import type { Metadata } from "next";

import { FondosFlow } from "./fondos-flow";

export const metadata: Metadata = {
  title: "Reposición o retiro",
  description: "Registra el efectivo que trae o se lleva el supervisor.",
  robots: { index: false, follow: false },
};

export default function FondosPage() {
  return <FondosFlow />;
}
