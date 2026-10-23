"use client";

import * as React from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui";

/**
 * Cuando una pantalla falla de forma inesperada — **FR-AD-STATE-4**.
 *
 * Nunca la página de error del marco, en inglés y sin la marca, ni un detalle
 * técnico: un mensaje en el lenguaje del producto, la posibilidad de volver a
 * intentarlo y la salida a Inicio. El shell sigue puesto, así que la barra
 * lateral también es una salida.
 */
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }): React.JSX.Element {
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
          <Link href="/admin/inicio">Volver a Inicio</Link>
        </Button>
      </div>
    </div>
  );
}
