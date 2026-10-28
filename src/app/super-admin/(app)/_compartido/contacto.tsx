import * as React from "react";
import { Mail, Phone } from "lucide-react";

import type { Operator } from "@/features/network/operators";

/**
 * El contacto de un operador, tal como lo dio de alta PuntoCash.
 *
 * Aparece donde esta consola muestra algo que no puede cambiar: lo resuelve el
 * mercante, y esto es a quién pedírselo (FR-SA-STATE-4). Teléfono y correo
 * son enlaces para que desde un teléfono baste con tocarlos.
 */
export function ContactoDeOperador({ operador }: { operador: Operator }): React.JSX.Element {
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-text-secondary">
      <span className="text-text-primary">{operador.contactName}</span>
      <a
        href={`tel:${operador.phone.replace(/\s+/g, "")}`}
        className="pc-numeric inline-flex items-center gap-1.5 underline-offset-4 hover:text-text-primary hover:underline"
      >
        <Phone className="size-3.5" aria-hidden="true" />
        {operador.phone}
      </a>
      <a
        href={`mailto:${operador.email}`}
        className="inline-flex min-w-0 items-center gap-1.5 break-all underline-offset-4 hover:text-text-primary hover:underline"
      >
        <Mail className="size-3.5 shrink-0" aria-hidden="true" />
        {operador.email}
      </a>
    </span>
  );
}
