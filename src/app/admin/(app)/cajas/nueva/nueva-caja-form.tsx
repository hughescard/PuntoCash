"use client";

import * as React from "react";
import { CirclePlus } from "lucide-react";

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
import { crearCajaAction, type ResultadoAccion } from "../_actions";
import { enviarSinReiniciar } from "@/lib/enviar-sin-reiniciar";

/**
 * El formulario de alta. El desenlace lo decide el dominio y llega por
 * `useActionState`: un identificador repetido dentro de la misma sede se
 * rechaza con su mensaje (**FR-AD-CAJA-6**), y el éxito no vuelve aquí — la
 * acción redirige al listado, que es donde se encamina el paso siguiente.
 *
 * El selector de sede es un `select` nativo por la misma razón que el de la
 * cabecera: vive dentro de un formulario que se envía, y el `Select` del
 * sistema no envía nada por sí mismo. Aquí, además, está sobre superficie
 * clara, así que hereda los mismos tokens que el resto de los campos.
 */

const SEDE: FieldSpec = {
  id: "nueva-caja-sede",
  label: "Sede",
  description: "Solo aparecen las sedes que administras.",
  required: true,
};

const NOMBRE: FieldSpec = {
  id: "nueva-caja-nombre",
  label: "Identificador de la caja",
  description: "Como se la llama en la sucursal: Caja 01, Ventanilla 2, Mostrador principal.",
  required: true,
};

export function NuevaCajaForm({
  sedes,
  preseleccionada,
}: {
  sedes: readonly { id: string; name: string; suspendida: boolean }[];
  preseleccionada?: string | undefined;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccion, FormData>(
    crearCajaAction,
    null,
  );

  const unica = sedes.length === 1 ? sedes[0] : undefined;

  return (
    <form onSubmit={enviarSinReiniciar(accion)}>
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          {estado && !estado.ok ? (
            <Alert variant="error" title="No se pudo crear la caja">
              {estado.error}
            </Alert>
          ) : null}

          {unica ? (
            /* Con una sola sede, un desplegable prometería una elección que no
               existe. Se muestra cuál es y se envía en un campo oculto. */
            <>
              <input type="hidden" name="sede" value={unica.id} />
              <div>
                <p className="text-label font-medium text-text-primary">Sede</p>
                <p className="mt-1 text-body text-text-secondary">{unica.name}</p>
              </div>
            </>
          ) : (
            <Field {...SEDE}>
              <select
                {...fieldAria(SEDE)}
                name="sede"
                defaultValue={preseleccionada ?? ""}
                disabled={enviando}
                className="h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle"
              >
                <option value="" disabled>
                  Elige una sede
                </option>
                {sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.name}
                    {sede.suspendida ? " · suspendida" : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field {...NOMBRE}>
            <Input
              {...fieldAria(NOMBRE)}
              name="nombre"
              autoFocus
              disabled={enviando}
              placeholder="Caja 01"
            />
          </Field>

          <p className="text-body-sm text-text-secondary">
            La caja nace activa y sin equipo. Para que pueda operar hay que vincularle uno después.
          </p>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={enviando}>
              <CirclePlus aria-hidden="true" />
              Crear caja
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
