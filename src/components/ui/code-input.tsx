"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Campo de código de un solo uso — manual §15 ("Inputs") y §20 ("Accesibilidad").
 *
 * Es **un único `<input>` real** presentado sobre una fila de casillas. La
 * alternativa habitual — una casilla `<input>` por dígito — rompe tres cosas
 * que en una caja importan: el autorrelleno del código (`one-time-code`) deja
 * de funcionar, el pegado reparte mal los dígitos, y el lector de pantalla
 * anuncia seis campos sin etiqueta propia en lugar de uno. Aquí las casillas
 * son decoración (`aria-hidden`) y el control es el campo que las cubre.
 *
 *   Geometría  Casillas de 48×56px — por encima del mínimo de 44px (§20).
 *   Focus      Borde navy visible en la casilla activa, con anillo (§15).
 *   Error      Borde rojo en todas las casillas + mensaje del `Field` (§20).
 *   Cifras     Tabulares, para que los seis dígitos no bailen (§17).
 *
 * El agrupamiento visual 3+3 solo separa la lectura; el valor nunca contiene
 * separadores.
 */
export interface CodeInputProps {
  id: string;
  /** Valor actual — solo dígitos, nunca más largo que `length`. */
  value: string;
  onChange: (value: string) => void;
  /** Se invoca cuando el último dígito entra, con el código completo. */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: true;
  "aria-invalid"?: true;
  className?: string;
}

const CodeInput = React.forwardRef<HTMLInputElement, CodeInputProps>(function CodeInput(
  {
    id,
    value,
    onChange,
    onComplete,
    length = 6,
    disabled = false,
    invalid = false,
    autoFocus = false,
    className,
    ...aria
  },
  forwardedRef,
) {
  const innerRef = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle(forwardedRef, () => innerRef.current as HTMLInputElement);

  const [focused, setFocused] = React.useState(false);

  /** El cursor siempre al final: el campo se llena de izquierda a derecha. */
  const caretToEnd = React.useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, []);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    // Un pegado con espacios, guiones o el texto entero del correo se reduce a
    // sus dígitos, en vez de rechazarse.
    const digits = event.target.value.replace(/\D/g, "").slice(0, length);

    onChange(digits);

    if (digits.length === length) onComplete?.(digits);
  }

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <div className={cn("relative w-fit", className)}>
      {/* Las casillas son la representación del valor, no controles. */}
      <div aria-hidden="true" className="flex items-center gap-2.5">
        {Array.from({ length }, (_, index) => {
          const digit = value[index];
          const isActive = focused && !disabled && index === activeIndex && value.length < length;
          const isLast = focused && !disabled && value.length === length && index === length - 1;

          return (
            <div
              key={index}
              className={cn(
                "grid h-control-lg w-12 place-items-center rounded-control border bg-surface",
                "text-amount font-semibold text-text-primary pc-numeric",
                "transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-standard)",
                // Separación de lectura 3+3.
                index === length / 2 && "ml-3",
                invalid
                  ? "border-error"
                  : isActive || isLast
                    ? "border-primary ring-2 ring-primary/20"
                    : digit
                      ? "border-border-strong"
                      : "border-border",
                disabled && "bg-surface-subtle text-text-secondary",
              )}
            >
              {digit ?? (isActive ? <Caret /> : null)}
            </div>
          );
        })}
      </div>

      {/* El control real, transparente y del tamaño exacto de la fila. El
          caret nativo se oculta porque la casilla activa ya lo dibuja. */}
      <input
        ref={innerRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        // Un gestor de contraseñas no debe guardar un código de un solo uso.
        data-1p-ignore
        spellCheck={false}
        maxLength={length}
        value={value}
        autoFocus={autoFocus}
        disabled={disabled}
        onChange={handleChange}
        onFocus={() => {
          setFocused(true);
          caretToEnd();
        }}
        onBlur={() => setFocused(false)}
        // Un clic en cualquier casilla lleva el cursor al final: no se puede
        // escribir en el hueco 5 dejando el 2 vacío.
        onClick={caretToEnd}
        onSelect={caretToEnd}
        className={cn(
          "absolute inset-0 h-full w-full rounded-control border-0 bg-transparent",
          "text-transparent caret-transparent outline-none",
          "selection:bg-transparent",
          disabled ? "cursor-not-allowed" : "cursor-text",
        )}
        {...aria}
      />
    </div>
  );
});

/** Barra de inserción de la casilla activa. */
function Caret(): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="h-6 w-0.5 animate-pulse rounded-pill bg-primary"
    />
  );
}

export { CodeInput };
