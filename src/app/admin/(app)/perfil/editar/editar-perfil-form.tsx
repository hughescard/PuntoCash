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
import { editarPerfilAction, type ResultadoEdicionPerfil } from "../_actions";

/**
 * Nombre, apellidos y teléfono propios — **FR-AD-PERF-3**.
 *
 * Ni identificador ni correo, y ninguno de los dos se menciona: el perfil del
 * que se viene ya dice dónde se cambia el correo (**FR-AD-PERF-4**).
 */

const campo = (id: string, label: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({
  id: `perfil-${id}`,
  label,
  required: true,
  ...extra,
});

const NOMBRE = campo("nombre", "Nombre");
const PRIMER = campo("primer-apellido", "Primer apellido");
const SEGUNDO = campo("segundo-apellido", "Segundo apellido", { required: false });
const TELEFONO = campo("telefono", "Teléfono");

type Campo = "nombre" | "primer-apellido" | "telefono";

export function EditarPerfilForm({
  datos,
}: {
  datos: { nombre: string; primerApellido: string; segundoApellido: string; telefono: string };
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoEdicionPerfil, FormData>(
    editarPerfilAction,
    null,
  );

  /* Tras un rechazo manda lo tecleado: React vacía los campos no controlados
     al terminar la acción, y sin esto un campo vacío borraría los otros tres. */
  const previo = estado && !estado.ok ? estado.valores : undefined;
  const errorDe = (nombre: Campo) =>
    estado && !estado.ok && estado.campo === nombre ? estado.error : undefined;

  return (
    <form action={accion} className="max-w-form-max">
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          {estado && !estado.ok && !estado.campo ? (
            <Alert variant="error" title="No se pudo guardar">
              {estado.error}
            </Alert>
          ) : null}

          <div className="grid gap-6 sm:grid-cols-2">
            <Field {...NOMBRE} error={errorDe("nombre")}>
              <Input
                {...fieldAria({ ...NOMBRE, error: errorDe("nombre") })}
                name="nombre"
                autoComplete="given-name"
                autoFocus
                disabled={enviando}
                invalid={Boolean(errorDe("nombre"))}
                defaultValue={previo?.nombre ?? datos.nombre}
              />
            </Field>
            <Field {...PRIMER} error={errorDe("primer-apellido")}>
              <Input
                {...fieldAria({ ...PRIMER, error: errorDe("primer-apellido") })}
                name="primer-apellido"
                autoComplete="family-name"
                disabled={enviando}
                invalid={Boolean(errorDe("primer-apellido"))}
                defaultValue={previo?.primerApellido ?? datos.primerApellido}
              />
            </Field>
            <Field {...SEGUNDO}>
              <Input
                {...fieldAria(SEGUNDO)}
                name="segundo-apellido"
                disabled={enviando}
                defaultValue={previo?.segundoApellido ?? datos.segundoApellido}
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

          <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="secondary" asChild>
              <Link href="/admin/perfil">Cancelar</Link>
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
