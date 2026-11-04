"use client";

import * as React from "react";
import { Copy } from "lucide-react";

import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  DIAS,
  lineasDeHorario,
  NOMBRE_DEL_DIA,
  type Dia,
  type Franja,
  type HorarioSemanal,
} from "@/features/network/horario";

/**
 * El horario de una sede, por días: cada día abre o no, y si abre, a qué hora
 * abre y a qué hora cierra. Debajo se ve cómo quedará escrito en la pantalla de
 * la sucursal, porque eso es lo que se está decidiendo y el texto lo produce el
 * sistema, no quien escribe.
 *
 * Lo usan Admin de sede (editar los datos de contacto) y Super administración
 * (alta y edición de una sede sin asignar). Manda al formulario, por cada día,
 * `{dia}-abierto` (casilla), `{dia}-abre` y `{dia}-cierra` (horas en 24 h);
 * `horarioDesdeFormulario` (en `features/network/horario.ts`) lo lee.
 */

/** Lo que se le propone a un día que se marca como abierto sin horas previas. */
const FRANJA_POR_DEFECTO: Franja = { abre: "09:00", cierra: "18:00" };

interface DiaEnEdicion {
  abierto: boolean;
  abre: string;
  cierra: string;
}

export function HorarioEditor({
  inicial,
  disabled,
  error,
  diaConError,
  descripcion = "Marca los días que abre la sucursal y a qué hora abre y cierra cada uno.",
}: {
  inicial: HorarioSemanal | null;
  disabled?: boolean;
  error?: string | undefined;
  diaConError?: Dia | undefined;
  descripcion?: string;
}): React.JSX.Element {
  /* Controlado: abrir o cerrar un día cambia lo que se ve, y la vista previa
     depende de él. Las horas de un día cerrado se conservan para que volver a
     abrirlo no obligue a escribirlas otra vez. */
  const [dias, setDias] = React.useState<Record<Dia, DiaEnEdicion>>(
    () =>
      Object.fromEntries(
        DIAS.map((d) => {
          const f = inicial?.[d] ?? null;
          return [d, { abierto: Boolean(f), ...(f ?? FRANJA_POR_DEFECTO) }];
        }),
      ) as Record<Dia, DiaEnEdicion>,
  );

  const cambiar = (dia: Dia, parcial: Partial<DiaEnEdicion>) =>
    setDias((prev) => ({ ...prev, [dia]: { ...prev[dia], ...parcial } }));

  const copiarLunes = () =>
    setDias(
      (prev) =>
        Object.fromEntries(
          DIAS.map((d) => [
            d,
            prev[d].abierto ? { ...prev[d], abre: prev.lun.abre, cierra: prev.lun.cierra } : prev[d],
          ]),
        ) as Record<Dia, DiaEnEdicion>,
    );

  const vista = lineasDeHorario(
    Object.fromEntries(
      DIAS.map((d) => [d, dias[d].abierto && dias[d].abre && dias[d].cierra ? dias[d] : null]),
    ) as HorarioSemanal,
  );

  return (
    <fieldset className="min-w-0" aria-describedby={error ? "sede-horario-error" : undefined}>
      <legend className="text-body font-semibold text-text-primary">Horario</legend>
      <p className="mt-1 text-body-sm text-text-secondary">{descripcion}</p>

      {error ? (
        <p id="sede-horario-error" role="alert" className="mt-3 text-body-sm font-semibold text-error">
          {error}
        </p>
      ) : null}

      <ul className="mt-4 flex flex-col divide-y divide-border rounded-card border border-border">
        {DIAS.map((dia) => {
          const d = dias[dia];
          const nombre = NOMBRE_DEL_DIA[dia];
          return (
            <li
              key={dia}
              className={cn(
                "grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[10rem_minmax(0,24rem)] sm:items-center",
                diaConError === dia && "bg-error/5",
              )}
            >
              <label className="flex min-h-control-sm items-center gap-3 text-body font-medium text-text-primary">
                <input
                  type="checkbox"
                  name={`${dia}-abierto`}
                  checked={d.abierto}
                  disabled={disabled}
                  onChange={(e) => cambiar(dia, { abierto: e.target.checked })}
                  className="size-5 shrink-0 accent-primary"
                />
                {nombre}
              </label>

              {d.abierto ? (
                <div className="grid min-w-0 grid-cols-2 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-3">
                  <Input
                    type="time"
                    name={`${dia}-abre`}
                    aria-label={`${nombre}, abre`}
                    value={d.abre}
                    disabled={disabled}
                    invalid={diaConError === dia}
                    onChange={(e) => cambiar(dia, { abre: e.target.value })}
                    className="pc-numeric px-2 sm:px-4"
                  />
                  <span className="hidden text-text-secondary sm:inline" aria-hidden="true">
                    a
                  </span>
                  <Input
                    type="time"
                    name={`${dia}-cierra`}
                    aria-label={`${nombre}, cierra`}
                    value={d.cierra}
                    disabled={disabled}
                    invalid={diaConError === dia}
                    onChange={(e) => cambiar(dia, { cierra: e.target.value })}
                    className="pc-numeric px-2 sm:px-4"
                  />
                </div>
              ) : (
                <p className="text-body text-text-secondary">Cerrado</p>
              )}
            </li>
          );
        })}
      </ul>

      {dias.lun.abierto ? (
        <Button type="button" variant="tertiary" size="sm" className="mt-3" onClick={copiarLunes} disabled={disabled}>
          <Copy aria-hidden="true" />
          Copiar el lunes a los días abiertos
        </Button>
      ) : null}

      <div className="mt-4 rounded-card border border-border bg-surface-subtle p-4">
        <p className="text-body-sm font-semibold text-text-primary">Así se verá en la pantalla de la sucursal</p>
        {vista.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1 text-body-sm text-text-secondary">
            {vista.map((linea) => (
              <li key={linea}>{linea}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-body-sm text-text-secondary">Ningún día abierto.</p>
        )}
      </div>
    </fieldset>
  );
}
