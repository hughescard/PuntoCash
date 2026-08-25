import type { Metadata } from "next";

import { DesignSystemShowcase } from "./showcase";

export const metadata: Metadata = {
  title: "Sistema de diseño",
  description: "Validación interna de tokens y componentes del sistema PuntoCash.",
  robots: { index: false, follow: false },
};

/**
 * Internal development route. Renders every design token and primitive so the
 * system can be validated against the brand manual at 1440x900. Not part of any
 * product — see `src/app/ARCHITECTURE.md`.
 */
export default function DesignSystemPage() {
  return <DesignSystemShowcase />;
}
