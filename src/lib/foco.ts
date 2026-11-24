"use client";

import * as React from "react";

/**
 * Dónde queda la vista después de una acción del usuario. Dos reglas para
 * toda la aplicación:
 *
 * 1. **Al cambiar de paso** en un flujo (adelante o atrás), la vista vuelve
 *    arriba y el foco va al título de la pantalla. Lo primero que se ve es
 *    qué paso es y, si lo hay, el aviso que lo acompaña. Así no se empieza un
 *    paso a media altura, que es donde estaba el botón del anterior.
 * 2. **Al intentar seguir con errores**, la vista va al primer campo con
 *    error y lo enfoca. Solo al intentarlo: mientras se escribe, nada se mueve.
 *
 * Solo las acciones del usuario mueven la vista. Un refresco automático, como
 * el sondeo del kiosco, no la mueve. El movimiento es instantáneo, sin
 * animación.
 */

/** El elemento que hace scroll: el `main` del shell o, si no hay, la página. */
function contenedorDeScroll(desde: Element | null): Element {
  for (let el = desde; el; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) return el;
  }
  return document.scrollingElement ?? document.documentElement;
}

/** Lleva la vista arriba y el foco al título de la pantalla. */
export function irArriba(): void {
  const main = document.querySelector("main");
  const contenedor = contenedorDeScroll(main?.firstElementChild ?? main);
  contenedor.scrollTop = 0;
  if (contenedor !== document.scrollingElement) window.scrollTo(0, 0);

  const titulo = main?.querySelector("h1");
  if (titulo instanceof HTMLElement) {
    /* El título no es un control: se puede enfocar por código, no con Tab. */
    if (!titulo.hasAttribute("tabindex")) titulo.setAttribute("tabindex", "-1");
    titulo.classList.add("outline-none");
    titulo.focus({ preventScroll: true });
  }
}

/**
 * Lleva la vista al primer campo con error dentro de `contenedor` y lo enfoca.
 * Si no hay ningún campo con error pero sí un aviso de error (`role="alert"`),
 * por ejemplo un rechazo del servidor que no es de un campo, lleva la vista a
 * ese aviso. Si no hay ninguno de los dos, no hace nada. Espera a que React
 * pinte los errores recién calculados, así que se puede llamar justo después
 * de `setErrors`.
 */
export function enfocarPrimerError(contenedor: HTMLElement | null): void {
  /* Los errores pueden tardar algún frame en pintarse; se reintenta unos pocos
     antes de rendirse. */
  let intentos = 10;
  const intentar = () => {
    const campo = contenedor?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (campo) {
      campo.scrollIntoView({ block: "center" });
      campo.focus({ preventScroll: true });
      return;
    }
    const aviso = contenedor?.querySelector<HTMLElement>('[role="alert"]');
    if (aviso) {
      if (!aviso.hasAttribute("tabindex")) aviso.setAttribute("tabindex", "-1");
      aviso.classList.add("outline-none");
      aviso.scrollIntoView({ block: "nearest" });
      aviso.focus({ preventScroll: true });
      return;
    }
    if (--intentos > 0) requestAnimationFrame(intentar);
  };
  requestAnimationFrame(intentar);
}

/**
 * Para los formularios que valida el servidor (`useActionState`): cada vez que
 * llega un resultado nuevo, si trae errores, lleva la vista al primero.
 */
export function useEnfocarErrorAlResponder(
  resultado: unknown,
  formulario: React.RefObject<HTMLElement | null>,
): void {
  const anterior = React.useRef(resultado);
  React.useEffect(() => {
    if (Object.is(anterior.current, resultado)) return;
    anterior.current = resultado;
    enfocarPrimerError(formulario.current);
  }, [resultado, formulario]);
}

/**
 * Llama a `irArriba` cada vez que cambia `paso`, no al montar: al entrar en
 * la pantalla, la navegación ya la deja arriba.
 */
export function useIrArribaAlCambiarDePaso(paso: unknown): void {
  const anterior = React.useRef(paso);
  React.useEffect(() => {
    if (Object.is(anterior.current, paso)) return;
    anterior.current = paso;
    irArriba();
  }, [paso]);
}
