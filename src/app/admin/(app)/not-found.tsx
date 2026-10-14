import * as React from "react";
import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui";

/**
 * Lo que ve quien pide un recurso que no existe **o que pertenece a otro
 * operador** — **FR-AD-NAV-2** y **FR-AD-NAV-3**.
 *
 * El mensaje es deliberadamente genérico y **el mismo para los dos casos**. Si
 * una sede ajena respondiera algo distinto de una inexistente, bastaría con
 * probar identificadores para averiguar qué sedes administra otra empresa: el
 * mensaje sería, él solo, una fuga de alcance.
 *
 * Vive dentro del grupo `(app)` para que se represente con el shell puesto:
 * quien se equivoca de enlace no ha salido del producto, y la barra lateral
 * sigue siendo la vía de vuelta.
 */
export default function AdminNotFound(): React.JSX.Element {
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
        <Link href="/admin/inicio">Volver a Inicio</Link>
      </Button>
    </div>
  );
}
