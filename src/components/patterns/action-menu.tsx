"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Menú de acciones de una fila («⋯»). Sustituye a las hileras de botones
 * repetidos en cada fila de una tabla: un solo botón y, al tocarlo, la lista de
 * acciones. Se pinta en un portal con posición fija, para que ni el borde de la
 * tabla ni su desplazamiento lo recorten.
 *
 * Si se desplaza la página, sigue al botón. Teclado: Enter/Espacio/↓ abre y enfoca la primera acción; ↑/↓ recorren;
 * Inicio/Fin saltan; Esc cierra y devuelve el foco; Tab cierra.
 */
export interface AccionDeMenu {
  key: string;
  label: string;
  /** Texto accesible más específico, p. ej. «Cambiar el rango del USD». */
  ariaLabel?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  /** Acción que quita o retira algo: se pinta en el color de peligro. */
  destructiva?: boolean;
}

export function ActionMenu({
  label,
  acciones,
  disabled,
}: {
  /** Nombre accesible del botón: «Acciones de USD». */
  label: string;
  acciones: readonly AccionDeMenu[];
  disabled?: boolean;
}): React.JSX.Element {
  const [abierto, setAbierto] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; bottom: number; right: number; ancho?: number } | null>(null);
  const [arriba, setArriba] = React.useState(false);
  const boton = React.useRef<HTMLButtonElement>(null);
  const lista = React.useRef<HTMLDivElement>(null);
  const id = React.useId();

  const cerrar = React.useCallback((devolverFoco: boolean) => {
    setAbierto(false);
    if (devolverFoco) boton.current?.focus();
  }, []);

  const abrir = () => {
    const r = boton.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.top, bottom: r.bottom, right: window.innerWidth - r.right });
    setArriba(false);
    setAbierto(true);
  };

  /* Si no cabe debajo del botón, se abre hacia arriba. */
  React.useLayoutEffect(() => {
    if (!abierto || !lista.current || !boton.current) return;
    const alto = lista.current.offsetHeight;
    const r = boton.current.getBoundingClientRect();
    const cabeAbajo = r.bottom + 4 + alto <= window.innerHeight - 8;
    const cabeArriba = r.top - 4 - alto >= 8;
    setArriba(!cabeAbajo && cabeArriba);
    setPos({ top: r.top, bottom: r.bottom, right: window.innerWidth - r.right, ancho: lista.current.offsetWidth });
  }, [abierto, pos?.top, pos?.right]);

  React.useEffect(() => {
    if (!abierto) return;
    lista.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const fuera = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!lista.current?.contains(t) && !boton.current?.contains(t)) setAbierto(false);
    };
    /* Si la página se desplaza o cambia de tamaño, el menú sigue al botón. */
    const sigue = () => {
      const r = boton.current?.getBoundingClientRect();
      if (r) setPos({ top: r.top, bottom: r.bottom, right: window.innerWidth - r.right });
    };
    document.addEventListener("pointerdown", fuera);
    window.addEventListener("resize", sigue);
    window.addEventListener("scroll", sigue, true);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      window.removeEventListener("resize", sigue);
      window.removeEventListener("scroll", sigue, true);
    };
  }, [abierto]);

  const onKeyList = (e: React.KeyboardEvent) => {
    const items = Array.from(lista.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") items[(i + 1) % items.length]?.focus();
    else if (e.key === "ArrowUp") items[(i - 1 + items.length) % items.length]?.focus();
    else if (e.key === "Home") items[0]?.focus();
    else if (e.key === "End") items[items.length - 1]?.focus();
    else if (e.key === "Escape") cerrar(true);
    else if (e.key === "Tab") cerrar(false);
    else return;
    if (e.key !== "Tab") e.preventDefault();
  };

  return (
    <>
      <button
        ref={boton}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? id : undefined}
        disabled={disabled}
        onClick={() => (abierto ? cerrar(false) : abrir())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !abierto) {
            e.preventDefault();
            abrir();
          }
        }}
        className="inline-flex size-control-sm items-center justify-center rounded-md border border-border bg-surface text-text-secondary outline-none hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
      >
        <MoreHorizontal aria-hidden="true" className="size-5" />
      </button>
      {abierto && pos
        ? createPortal(
            <div
              ref={lista}
              id={id}
              role="menu"
              aria-label={label}
              onKeyDown={onKeyList}
              style={{
                position: "fixed",
                /* Alineado al borde derecho del botón, sin salirse de la pantalla por la izquierda. */
                right: Math.min(pos.right, Math.max(8, window.innerWidth - (pos.ancho ?? 224) - 8)),
                ...(arriba ? { bottom: window.innerHeight - pos.top + 4 } : { top: pos.bottom + 4 }),
              }}
              className="z-50 min-w-56 rounded-md border border-border bg-surface p-1 shadow-lg"
            >
              {acciones.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  role="menuitem"
                  aria-label={a.ariaLabel}
                  onClick={() => {
                    cerrar(false);
                    a.onSelect();
                  }}
                  className={cn(
                    "flex min-h-control-sm w-full items-center gap-2 rounded-sm px-3 text-left text-label outline-none hover:bg-surface-subtle focus-visible:bg-surface-subtle [&_svg]:size-4",
                    a.destructiva ? "text-error" : "text-text-primary",
                  )}
                >
                  {a.icon}
                  {a.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
