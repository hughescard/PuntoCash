"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

import { TableRow } from "@/components/ui";

/**
 * Una fila que se abre entera con un clic — la usa `ResponsiveTable` cuando
 * la fila es una cosa que se abre (una jornada) y no tiene un nombre propio
 * que hacer enlace.
 *
 * El clic en la fila es una comodidad del ratón: quien navega con el teclado
 * entra por el enlace real de la última celda, que es también lo que permite
 * abrir en otra pestaña. Un clic sobre un enlace o un botón de dentro (el
 * trabajador lleva a su ficha) hace lo suyo y no abre la fila.
 */
export function ClickableRow({ href, children }: { href: string; children: React.ReactNode }): React.JSX.Element {
  const router = useRouter();

  const abrir = (e: React.MouseEvent<HTMLTableRowElement>) => {
    if ((e.target as HTMLElement).closest("a, button, input, select, label")) return;
    /* Quien seleccionó texto para copiarlo no quería abrir nada. */
    if (window.getSelection()?.toString()) return;
    if (e.metaKey || e.ctrlKey || e.button === 1) {
      window.open(href, "_blank", "noopener");
      return;
    }
    router.push(href as Route);
  };

  return (
    <TableRow interactive onClick={abrir} onAuxClick={(e) => e.button === 1 && abrir(e)}>
      {children}
    </TableRow>
  );
}
