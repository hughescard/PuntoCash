"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
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
import { DOCUMENT_TYPES } from "@/features/customers/customers";
import {
  editarTrabajadorAction,
  type CampoDeEdicion,
  type ResultadoEdicion,
} from "../../_actions";

/**
 * Los datos personales de un trabajador — **FR-AD-TRAB-9**.
 *
 * ── Lo que esta pantalla deliberadamente no edita ─────────────────────────
 * Faltan tres campos que el alta sí pide, y los tres por un motivo distinto
 * que conviene que el desarrollador que lea esto conozca:
 *
 *   · El **identificador de acceso** es con lo que inicia sesión. Cambiarlo
 *     mientras alguien está trabajando lo deja fuera sin aviso.
 *   · El **correo** es el canal del segundo factor **[R13]**, no un dato de
 *     contacto. **FR-AD-TRAB-9** lo nombra aparte y **FR-AD-TRAB-10** lo mete
 *     dentro de la asistencia de acceso, que es donde alguien lo corrige
 *     mirando el problema que causa.
 *   · La **sede** cambia dónde puede iniciar sesión (**FR-AD-TRAB-14**), así
 *     que tiene su propia acción y su propia advertencia.
 *
 * **No se dicen en pantalla**: no estar es la explicación, igual que la caja
 * ausente del alta (**FR-AD-TRAB-4**). Quien busque el correo o la sede los
 * tiene en la ficha, a un clic, con su propia acción.
 */

const campo = (id: string, label: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({
  id: `editar-${id}`,
  label,
  required: true,
  ...extra,
});

const NOMBRE = campo("nombre", "Nombre");
const PRIMER = campo("primer-apellido", "Primer apellido");
const SEGUNDO = campo("segundo-apellido", "Segundo apellido", { required: false });
const TIPO_DOC = campo("tipo-documento", "Tipo de documento");
const DOCUMENTO = campo("documento", "Número de documento");
const TELEFONO = campo("telefono", "Teléfono");

const SELECT_CLASS =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle";

export interface DatosDelTrabajador {
  id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  tipoDocumento: string;
  documento: string;
  telefono: string;
}

export function EditarTrabajadorForm({
  trabajador,
}: {
  trabajador: DatosDelTrabajador;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoEdicion, FormData>(
    editarTrabajadorAction,
    null,
  );

  /* Tras un rechazo manda lo tecleado; en la primera pintura, lo guardado. */
  const previo = estado && !estado.ok ? estado.valores : undefined;
  const errorDe = (campo: CampoDeEdicion) =>
    estado && !estado.ok && estado.campo === campo ? estado.error : undefined;

  return (
    <form action={accion} className="max-w-form-max">
      <input type="hidden" name="trabajador" value={trabajador.id} />

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
                autoFocus
                disabled={enviando}
                invalid={Boolean(errorDe("nombre"))}
                defaultValue={previo?.nombre ?? trabajador.nombre}
              />
            </Field>
            <Field {...PRIMER} error={errorDe("primer-apellido")}>
              <Input
                {...fieldAria({ ...PRIMER, error: errorDe("primer-apellido") })}
                name="primer-apellido"
                disabled={enviando}
                invalid={Boolean(errorDe("primer-apellido"))}
                defaultValue={previo?.primerApellido ?? trabajador.primerApellido}
              />
            </Field>
            <Field {...SEGUNDO}>
              <Input
                {...fieldAria(SEGUNDO)}
                name="segundo-apellido"
                disabled={enviando}
                defaultValue={previo?.segundoApellido ?? trabajador.segundoApellido}
              />
            </Field>
            <Field {...TIPO_DOC}>
              <select
                {...fieldAria(TIPO_DOC)}
                name="tipo-documento"
                disabled={enviando}
                defaultValue={previo?.tipoDocumento ?? trabajador.tipoDocumento}
                className={SELECT_CLASS}
              >
                {DOCUMENT_TYPES.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field {...DOCUMENTO} error={errorDe("documento")}>
              <Input
                {...fieldAria({ ...DOCUMENTO, error: errorDe("documento") })}
                name="documento"
                inputMode="numeric"
                disabled={enviando}
                invalid={Boolean(errorDe("documento"))}
                defaultValue={previo?.documento ?? trabajador.documento}
                className="pc-numeric"
              />
            </Field>
            <Field {...TELEFONO} error={errorDe("telefono")}>
              <Input
                {...fieldAria({ ...TELEFONO, error: errorDe("telefono") })}
                name="telefono"
                type="tel"
                disabled={enviando}
                invalid={Boolean(errorDe("telefono"))}
                defaultValue={previo?.telefono ?? trabajador.telefono}
                className="pc-numeric"
              />
            </Field>
          </div>

          <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="secondary" asChild>
              <Link href={`/admin/trabajadores/${trabajador.id}` as Route}>Cancelar</Link>
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
