"use client";

import * as React from "react";
import Link from "next/link";
import { Save } from "lucide-react";

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
import { HorarioEditor } from "@/components/patterns/horario-editor";
import type { HorarioSemanal } from "@/features/network/horario";
import { editarDatosDeSedeAction, type ResultadoDatosDeSede } from "../../_actions";

/**
 * Dirección, teléfono y horario de una sede — **FR-AD-SEDE-14**.
 *
 * El horario se edita **por días** con el editor compartido
 * (`components/patterns/horario-editor.tsx`), el mismo que usa Super
 * administración al dar de alta una sede.
 */

const DIRECCION: FieldSpec = { id: "sede-direccion", label: "Dirección", required: true };
const MUNICIPIO: FieldSpec = {
  id: "sede-municipio",
  label: "Municipio y provincia",
  required: true,
  description: "Por ejemplo: La Habana Vieja, La Habana.",
};
const TELEFONO: FieldSpec = { id: "sede-telefono", label: "Teléfono", required: true };

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

          <HorarioEditor
            inicial={datos.horario}
            disabled={enviando}
            error={errorHorario}
            diaConError={diaConError}
          />

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
