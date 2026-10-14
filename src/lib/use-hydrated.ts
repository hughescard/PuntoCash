"use client";

import * as React from "react";

/**
 * `false` en el servidor y durante la hidratación, `true` en cuanto React se
 * ha enganchado al marcado en el navegador.
 *
 * Sirve para dos cosas distintas que conviene no confundir:
 *
 * 1. **No pintar lo que solo existe en el cliente.** Un dato que vive en
 *    memoria del navegador (el reto de verificación, por ejemplo) no se puede
 *    representar en el servidor sin contradecirse medio segundo después.
 *
 * 2. **No ofrecer un control antes de que haga lo que promete.** Un botón de
 *    envío pintado por el servidor ya es un `submit` nativo: pulsarlo antes de
 *    que el formulario tenga su manejador en JavaScript provoca un GET al
 *    mismo URL con los campos en la barra de direcciones — con la contraseña
 *    dentro, y además en el historial. Deshabilitarlo hasta la hidratación
 *    cierra esa ventana sin cambiar nada de lo que se ve después.
 *
 * `subscribeNever` nunca notifica porque el valor solo cambia una vez, y ese
 * cambio ya lo provoca la propia hidratación.
 */
function subscribeNever(): () => void {
  return () => {};
}

export function useHydrated(): boolean {
  return React.useSyncExternalStore(subscribeNever, () => true, () => false);
}
