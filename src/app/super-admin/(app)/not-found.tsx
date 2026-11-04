import * as React from "react";
import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui";

/** Lo que ve quien pide algo que no existe (FR-SA-NAV-3): el mismo mensaje que en Admin de sede, dentro del shell. */
export default function SuperAdminNotFound(): React.JSX.Element {
  return (
    <div className="flex min-h-[26rem] flex-col items-center justify-center text-center">
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-card border border-border bg-surface text-primary shadow-card"
      >
        <SearchX className="size-6" />
      </span>

      <h1 className="mt-6 text-screen-title text-text-primary">No encontramos lo que buscabas</h1>

      <p className="mt-3 max-w-[32rem] text-body text-text-secondary">
        Es posible que el enlace haya cambiado o que ya no esté disponible. Vuelve a Inicio y
        continúa desde ahí.
      </p>

      <Button variant="secondary" className="mt-10" asChild>
        <Link href="/super-admin/inicio">Volver a Inicio</Link>
      </Button>
    </div>
  );
}
