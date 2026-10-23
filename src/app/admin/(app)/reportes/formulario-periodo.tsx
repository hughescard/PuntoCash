"use client";

import * as React from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * El periodo y el trabajador — **FR-AD-REP-2**.
 *
 * Se aplican **al cambiarlos**, como los filtros del resto de la consola: un
 * selector que dice «Todos» mientras la pantalla sigue filtrada por alguien
 * es un reporte que miente. Antes de hidratar es un formulario corriente con
 * su botón, que funciona igual; después, el botón sobra y no se pinta.
 */
export function FormularioPeriodo({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();
  const hydrated = useHydrated();
  const [pendiente, startTransition] = React.useTransition();

  const aplicar = (form: HTMLFormElement) => {
    const q = new URLSearchParams();
    for (const [k, v] of new FormData(form)) if (typeof v === "string" && v) q.set(k, v);
    startTransition(() => router.push(`/admin/reportes?${q.toString()}` as Route, { scroll: false }));
  };

  return (
    <form
      method="get"
      action="/admin/reportes"
      aria-busy={pendiente || undefined}
      className={className}
      onChange={(e) => {
        const campo = e.target as unknown as HTMLInputElement | HTMLSelectElement;
        /* Una fecha a medio escribir no se aplica: espera a que sea una fecha entera. */
        if (campo.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(campo.value)) return;
        aplicar(e.currentTarget);
      }}
      onSubmit={(e) => {
        e.preventDefault();
        aplicar(e.currentTarget);
      }}
    >
      {children}
      {hydrated ? null : (
        <Button type="submit" variant="secondary" className="col-span-2 lg:col-span-1">
          Ver el periodo
        </Button>
      )}
    </form>
  );
}
