"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { TasaPublica } from "@/features/network/rates";

/**
 * Los tableros de tasas que la pantalla puede necesitar, uno por sede.
 *
 * La pantalla elige su sede **en el propio equipo** (`signage-branch.ts`), así
 * que el servidor no sabe cuál es al renderizar: entrega el tablero público de
 * todas —son unas pocas filas cada una— y la pantalla toma el suyo. Lo que
 * entrega es exactamente `tableroPublico` del dominio, el mismo origen que lee
 * el kiosco (**A12**).
 *
 * **Se refresca solo.** Un televisor de sala no se recarga nunca; sin esto, una
 * tasa cambiada en `/admin/tasas` no llegaría hasta el día siguiente.
 * `router.refresh()` vuelve a pedir estos datos al servidor sin perder el
 * estado del carrusel. En producción lo natural es que el servidor avise del
 * cambio; aquí basta con preguntar cada medio minuto.
 */

const REFRESCO_MS = 30_000;

const Tableros = React.createContext<Readonly<Record<string, readonly TasaPublica[]>>>({});

/**
 * Lo que la sucursal dice de sí misma en la pantalla: dirección, teléfono y
 * horario ya en líneas. Viaja con los tableros y se refresca con ellos, por
 * la misma razón: lo cambia el administrador de la sede (FR-AD-SEDE-14) y el
 * televisor no se recarga.
 */
export interface FichaPublica {
  address: string;
  locality: string;
  phone: string;
  horario: readonly string[];
}

const Fichas = React.createContext<Readonly<Record<string, FichaPublica>>>({});

/** Una promoción tal como se anuncia: título y texto (**FR-AD-PROM-6**). */
export interface PromocionPublica {
  id: string;
  titulo: string;
  texto: string;
  /** Dirección de su imagen, o `null` si no tiene (**FR-AD-PROM-12**). */
  imagen: string | null;
}

const Promociones = React.createContext<Readonly<Record<string, readonly PromocionPublica[]>>>({});

export function TablerosProvider({
  tableros,
  fichas,
  promociones,
  children,
}: {
  tableros: Readonly<Record<string, readonly TasaPublica[]>>;
  fichas: Readonly<Record<string, FichaPublica>>;
  /** Las vigentes de cada sede, ya filtradas por el servidor. */
  promociones: Readonly<Record<string, readonly PromocionPublica[]>>;
  children: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();

  React.useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESCO_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <Tableros.Provider value={tableros}>
      <Fichas.Provider value={fichas}>
        <Promociones.Provider value={promociones}>{children}</Promociones.Provider>
      </Fichas.Provider>
    </Tableros.Provider>
  );
}

/** El tablero de una sede; vacío si no publica ninguna tasa. */
export function useTablero(branchId: string): readonly TasaPublica[] {
  return React.useContext(Tableros)[branchId] ?? [];
}

/** La ficha vigente de una sede, o `null` si el servidor no la conoce. */
export function useFicha(branchId: string): FichaPublica | null {
  return React.useContext(Fichas)[branchId] ?? null;
}

/** Las promociones vigentes de una sede; vacío si no anuncia ninguna. */
export function usePromociones(branchId: string): readonly PromocionPublica[] {
  return React.useContext(Promociones)[branchId] ?? [];
}
