"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { TasaPublica } from "@/features/network/rates";
import type { TarifaPublica } from "@/features/network/tarifas";

/**
 * Los tableros de tasas que la pantalla puede necesitar, uno por sede.
 *
 * La pantalla elige su sede **en el propio equipo** (`signage-branch.ts`, que
 * solo guarda su identificador), así que el servidor no sabe cuál es al
 * renderizar: entrega el tablero público y la ficha de todas —son unas pocas
 * filas cada una— y la pantalla toma lo suyo. Lo que
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
 * Una sede tal como la pantalla puede necesitarla: lo que el selector
 * enseña y lo que la diapositiva de la sucursal dice de ella. Viene del
 * servidor y se refresca con los tableros, por la misma razón: el nombre lo
 * cambia PuntoCash y la dirección, el teléfono y el horario el administrador
 * de la sede, y el televisor no se recarga.
 */
export interface SedePublica {
  id: string;
  name: string;
  address: string;
  locality: string;
  phone: string;
  horario: readonly string[];
  /**
   * Si la sede está atendiendo: suspendida, sin mercante o con el mercante
   * suspendido no atiende, y la pantalla no anuncia tasas ni promociones que
   * nadie podría aplicar.
   */
  atiende: boolean;
}

const Sedes = React.createContext<readonly SedePublica[]>([]);

/** Una promoción tal como se anuncia: título y texto (**FR-AD-PROM-6**). */
export interface PromocionPublica {
  id: string;
  titulo: string;
  texto: string;
  /** Dirección de su imagen, o `null` si no tiene (**FR-AD-PROM-12**). */
  imagen: string | null;
}

const Promociones = React.createContext<Readonly<Record<string, readonly PromocionPublica[]>>>({});

const Tarifas = React.createContext<Readonly<Record<string, readonly TarifaPublica[]>>>({});

export function TablerosProvider({
  tableros,
  sedes,
  promociones,
  tarifas,
  children,
}: {
  tableros: Readonly<Record<string, readonly TasaPublica[]>>;
  /** Las sedes que una pantalla puede mostrar: todas menos las cerradas. */
  sedes: readonly SedePublica[];
  /** Las vigentes de cada sede, ya filtradas por el servidor. */
  promociones: Readonly<Record<string, readonly PromocionPublica[]>>;
  /** Las tarifas de giro que anuncia cada sede (`tarifasPublicas`); vacío si no envía giros. */
  tarifas: Readonly<Record<string, readonly TarifaPublica[]>>;
  children: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();

  React.useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESCO_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <Tableros.Provider value={tableros}>
      <Sedes.Provider value={sedes}>
        <Promociones.Provider value={promociones}>
          <Tarifas.Provider value={tarifas}>{children}</Tarifas.Provider>
        </Promociones.Provider>
      </Sedes.Provider>
    </Tableros.Provider>
  );
}

/** El tablero de una sede; vacío si no publica ninguna tasa. */
export function useTablero(branchId: string): readonly TasaPublica[] {
  return React.useContext(Tableros)[branchId] ?? [];
}

/** Las sedes que una pantalla puede mostrar, del servidor. */
export function useSedes(): readonly SedePublica[] {
  return React.useContext(Sedes);
}

/** Las promociones vigentes de una sede; vacío si no anuncia ninguna. */
export function usePromociones(branchId: string): readonly PromocionPublica[] {
  return React.useContext(Promociones)[branchId] ?? [];
}

/** Las tarifas de giro de una sede; vacío si no envía giros o no tiene ninguna. */
export function useTarifas(branchId: string): readonly TarifaPublica[] {
  return React.useContext(Tarifas)[branchId] ?? [];
}
