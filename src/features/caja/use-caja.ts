"use client";

import * as React from "react";

import {
  CAJA_BALANCES,
  CAJA_MOVEMENTS,
  getJornadaActual,
  getVersionCaja,
  getVersionCajaServidor,
  hasOpenJornada,
  restaurarCaja,
  subscribeCaja,
  type CajaBalance,
  type CajaJornada,
  type CajaMovement,
} from "./caja-data";

/**
 * Un efecto de disposición corre después de hidratar pero **antes de que el
 * navegador pinte**, y un `setState` hecho desde dentro provoca un render
 * sincrónico en ese mismo hueco. Eso es lo que evita el parpadeo: con un
 * `useEffect` normal, el usuario vería primero un fotograma con la caja
 * cerrada y la caja repuesta justo después.
 *
 * React avisa, con razón, si se usa `useLayoutEffect` en un componente que
 * también se renderiza en el servidor — y estas pantallas sí se renderizan
 * allí. En el servidor, donde el efecto nunca llegaría a correr, se degrada a
 * `useEffect` y el aviso desaparece.
 */
const useEfectoDeDisposicion =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export interface EstadoDeCaja {
  /** Sube cada vez que el dominio de caja cambia: una mutación, o la reposición. */
  version: number;
  balances: readonly CajaBalance[];
  movimientos: readonly CajaMovement[];
  jornada: CajaJornada | null;
  jornadaAbierta: boolean;
}

/**
 * Lee el dominio de caja desde una pantalla, y es lo que hace que la jornada
 * sobreviva a una recarga.
 *
 * Hace dos cosas, y las dos en el único orden que la hidratación admite:
 *
 *   1. **Suscribe** la pantalla al dominio. Mientras React hidrata, la
 *      versión es 0 tanto en el servidor como en el cliente, así que el
 *      primer render del cliente es idéntico al HTML que llegó y no hay
 *      desajuste.
 *   2. **Repone** lo que el equipo tenía guardado, en un efecto de
 *      disposición — es decir, ya hidratado y antes de pintar — y marca su
 *      propio estado. Ese `setState` es lo que importa: desde un efecto de
 *      disposición, React vuelve a renderizar **de forma sincrónica, antes de
 *      que el navegador pinte**, así que lo primero que el usuario ve es la
 *      caja como la dejó y no un fotograma con la caja cerrada. Avisar al
 *      resto de suscriptores por la vía normal no bastaría: `useSyncExternalStore`
 *      se suscribe en un efecto pasivo, que corre después de pintar.
 *
 * Los arrays que devuelve son copias nuevas en cada versión, a propósito:
 * así un `useMemo` de la pantalla puede depender de `movimientos` o de
 * `balances` y recalcularse cuando el libro cambia de verdad, sin tener que
 * colar un número de versión entre sus dependencias.
 *
 * Una pantalla que solo necesita que el dominio esté repuesto y volver a
 * pintar cuando cambie puede llamarla y descartar el resultado — leyendo
 * `CAJA_BALANCES` y compañía como siempre, que vuelven a evaluarse en cada
 * render.
 */
export function useCaja(): EstadoDeCaja {
  const version = React.useSyncExternalStore(
    subscribeCaja,
    getVersionCaja,
    getVersionCajaServidor,
  );

  const [repuesta, setRepuesta] = React.useState(false);

  useEfectoDeDisposicion(() => {
    if (restaurarCaja()) setRepuesta(true);
  }, []);

  return React.useMemo(
    () => ({
      version,
      balances: [...CAJA_BALANCES],
      movimientos: [...CAJA_MOVEMENTS],
      jornada: getJornadaActual(),
      jornadaAbierta: hasOpenJornada(),
    }),
    /* `version` ya sube con la reposición, así que bastaría para recalcular.
       `repuesta` está aquí para dejar escrito que ese render concreto es el
       sincrónico del efecto de disposición — sin él, el estado nuevo llegaría
       por la suscripción, que es un efecto pasivo y ya ha pintado. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, repuesta],
  );
}
