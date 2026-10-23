"use client";

import * as React from "react";

/**
 * Los filtros de una pantalla, en la dirección — **FR-AD-SCOPE-5**.
 *
 * Cada lista guarda sus filtros en la barra de direcciones sin navegar
 * (`history.replaceState`): así sobreviven a recargar, a compartir el enlace
 * y, sobre todo, al cambio de sede de la cabecera, que recarga la pantalla.
 * Lo que vale el valor por defecto no se escribe, para que la dirección de una
 * pantalla sin filtros siga limpia.
 */
export function useFiltrosEnUrl(valores: Record<string, string>, porDefecto: Record<string, string>): void {
  const clave = JSON.stringify(valores);
  React.useEffect(() => {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(valores)) {
      if (v === "" || v === porDefecto[k]) url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    }
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
    // `valores` cambia de identidad en cada render; `clave` es su contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
}

/**
 * Los filtros que **no** viajan al cambiar de sede: una caja o un trabajador
 * son de la sede que se deja, y en la nueva solo darían una lista vacía. El
 * periodo, la pestaña y los filtros que valen para cualquier sede se quedan.
 */
export const FILTROS_DE_UNA_SEDE = ["caja", "trabajador"] as const;

/** La dirección actual sin los filtros que dependen de una sede. */
export function direccionParaOtraSede(pathname: string, search: string): string {
  const q = new URLSearchParams(search);
  for (const k of FILTROS_DE_UNA_SEDE) q.delete(k);
  const s = q.toString();
  return s ? `${pathname}?${s}` : pathname;
}
