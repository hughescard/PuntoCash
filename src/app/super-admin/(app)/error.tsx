"use client";

import * as React from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui";

/** Un fallo inesperado de una pantalla (FR-SA-STATE-1): mensaje del producto, reintentar y volver a Inicio. */
export default function SuperAdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }): React.JSX.Element {
  return (
    <div role="alert" className="flex min-h-[26rem] flex-col items-center justify-center text-center">
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-card border border-border bg-surface text-error shadow-card"
      >
        <TriangleAlert className="size-6" />
      </span>
      <h1 className="mt-6 text-screen-title text-text-primary">No se pudo cargar esta pantalla</h1>
      <p className="mt-3 max-w-[32rem] text-body text-text-secondary">
        Algo falló al preparar lo que pediste. Vuelve a intentarlo; si sigue sin cargar, vuelve a Inicio y continúa
        desde ahí.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>Volver a intentarlo</Button>
        <Button variant="secondary" asChild>
          <Link href="/super-admin/inicio">Volver a Inicio</Link>
        </Button>
      </div>
    </div>
  );
}
