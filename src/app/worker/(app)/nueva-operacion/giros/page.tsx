import type { Metadata } from "next";

import { GirosOperationSelector } from "./giros-selector";

/**
 * "Giros" now offers two independent operations, so the
 * service slug is an operation selector rather than a flow: Enviar giro
 * (`/giros/enviar`) and Cobrar giro (`/giros/cobrar`) are siblings of equal
 * level, and neither is auto-launched from here.
 *
 * Not a `redirect()` either: Next's dev-mode render-timing instrumentation
 * throws ("... cannot have a negative time stamp") when a page component
 * redirects during a client-side transition into it — reproducible by
 * clicking the service card.
 */
export const metadata: Metadata = {
  title: "Giros",
  description: "Envía un giro a otra provincia o entrégalo al beneficiario con su código.",
  robots: { index: false, follow: false },
};

export default function GirosPage() {
  return <GirosOperationSelector />;
}
