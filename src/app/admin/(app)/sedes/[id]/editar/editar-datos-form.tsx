"use client";

import * as React from "react";
import Link from "next/link";
import { Copy, Save } from "lucide-react";

import {
  Alert,
  Button,
  Card,
  CardContent,
  Field,
  fieldAria,
  Input,
  type FieldSpec,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  DIAS,
  lineasDeHorario,
  NOMBRE_DEL_DIA,
  type Dia,
  type Franja,
  type HorarioSemanal,
} from "@/features/network/horario";
import { editarDatosDeSedeAction, type ResultadoDatosDeSede } from "../../_actions";

/**
 * Dirección, teléfono y horario de una sede — **FR-AD-SEDE-14**.
 *
 * El horario se edita **por días**: cada día abre o no, y si abre, a qué hora
 * abre y a qué hora cierra. Debajo se ve cómo quedará escrito en la pantalla
 * de la sala, porque eso es lo que se está decidiendo y el texto lo produce el
 * sistema, no quien escribe.
 */

const DIRECCION: FieldSpec = { id: "sede-direccion", label: "Dirección", required: true };
const MUNICIPIO: FieldSpec = {
  id: "sede-municipio",
  label: "Municipio y provincia",
  required: true,
  description: "Por ejemplo: La Habana Vieja, La Habana.",
};
const TELEFONO: FieldSpec = { id: "sede-telefono", label: "Teléfono", required: true };

/** Lo que se le propone a un día que se marca como abierto sin horas previas. */
const FRANJA_POR_DEFECTO: Franja = { abre: "09:00", cierra: "18:00" };

interface DiaEnEdicion {
  abierto: boolean;
  abre: string;
  cierra: string;
}

export function EditarDatosForm({
  sede,
  datos,
}: {
  sede: { id: string; name: string };
  datos: { direccion: string; municipio: string; telefono: string; horario: HorarioSemanal };
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoDatosDeSede, FormData>(
    editarDatosDeSedeAction,
    null,
  );

  /* El horario es controlado: abrir o cerrar un día cambia lo que se ve, y
     la vista previa depende de él. Las horas de un día cerrado se conservan
     para que volver a abrirlo no obligue a escribirlas otra vez. */
  const [dias, setDias] = React.useState<Record<Dia, DiaEnEdicion>>(() =>
    Object.fromEntries(
      DIAS.map((d) => {
        const f = datos.horario[d];
        return [d, { abierto: Boolean(f), ...(f ?? FRANJA_POR_DEFECTO) }];
      }),
    ) as Record<Dia, DiaEnEdicion>,
  );

  const cambiar = (dia: Dia, parcial: Partial<DiaEnEdicion>) =>
    setDias((prev) => ({ ...prev, [dia]: { ...prev[dia], ...parcial } }));

  const copiarLunes = () =>
    setDias((prev) =>
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

  const previo = estado && !estado.ok ? estado.valores : undefined;
  const errorDe = (campo: "direccion" | "municipio" | "telefono") =>
    estado && !estado.ok && estado.campo === campo ? estado.error : undefined;
  const errorHorario = estado && !estado.ok && estado.campo === "horario" ? estado.error : undefined;
  const diaConError = estado && !estado.ok ? estado.dia : undefined;

  return (
    <form action={accion} className="max-w-form-max">
      <input type="hidden" name="sede" value={sede.id} />
      <Card>
        <CardContent className="flex flex-col gap-8 pt-6">
          {estado && !estado.ok && !estado.campo ? (
            <Alert variant="error" title="No se pudo guardar">
              {estado.error}
            </Alert>
          ) : null}

          <div className="grid gap-6">
            <Field {...DIRECCION} error={errorDe("direccion")}>
              <Input
                {...fieldAria({ ...DIRECCION, error: errorDe("direccion") })}
                name="direccion"
                autoComplete="street-address"
                disabled={enviando}
                invalid={Boolean(errorDe("direccion"))}
                defaultValue={previo?.direccion ?? datos.direccion}
              />
            </Field>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field {...MUNICIPIO} error={errorDe("municipio")}>
                <Input
                  {...fieldAria({ ...MUNICIPIO, error: errorDe("municipio") })}
                  name="municipio"
                  disabled={enviando}
                  invalid={Boolean(errorDe("municipio"))}
                  defaultValue={previo?.municipio ?? datos.municipio}
                />
              </Field>
              <Field {...TELEFONO} error={errorDe("telefono")}>
                <Input
                  {...fieldAria({ ...TELEFONO, error: errorDe("telefono") })}
                  name="telefono"
                  type="tel"
                  autoComplete="tel"
                  disabled={enviando}
                  invalid={Boolean(errorDe("telefono"))}
                  defaultValue={previo?.telefono ?? datos.telefono}
                  className="pc-numeric"
                />
              </Field>
            </div>
          </div>

          <fieldset className="min-w-0" aria-describedby={errorHorario ? "sede-horario-error" : undefined}>
            <legend className="text-body font-semibold text-text-primary">Horario</legend>
            <p className="mt-1 text-body-sm text-text-secondary">
              Marca los días que abre la sucursal y a qué hora abre y cierra cada uno.
            </p>

            {errorHorario ? (
              <p id="sede-horario-error" role="alert" className="mt-3 text-body-sm font-semibold text-error">
                {errorHorario}
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
                        disabled={enviando}
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
                          disabled={enviando}
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
                          disabled={enviando}
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
              <Button type="button" variant="tertiary" size="sm" className="mt-3" onClick={copiarLunes} disabled={enviando}>
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

          <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="secondary" asChild>
              <Link href={`/admin/sedes/${sede.id}`}>Cancelar</Link>
            </Button>
            <Button type="submit" loading={enviando}>
              <Save aria-hidden="true" />
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
