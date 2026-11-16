"use client";

import * as React from "react";

import type { VistaDeCaja } from "./vista";

/**
 * La foto de la caja que armó el servidor, al alcance de cualquier pantalla de
 * `/worker` (`vista.ts`). La pone el layout de `(app)`; tras cada escritura,
 * la acción de servidor revalida y el layout la vuelve a entregar.
 */
const CajaContext = React.createContext<VistaDeCaja | null>(null);

export function CajaProvider({ vista, children }: { vista: VistaDeCaja; children: React.ReactNode }): React.JSX.Element {
  return <CajaContext.Provider value={vista}>{children}</CajaContext.Provider>;
}

export function useVistaDeCaja(): VistaDeCaja {
  const vista = React.useContext(CajaContext);
  if (!vista) throw new Error("useVistaDeCaja fuera de una sesión de Worker");
  return vista;
}
