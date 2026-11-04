"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Save } from "lucide-react";

import { Alert, Button, Card, CardContent, Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { HorarioEditor } from "@/components/patterns/horario-editor";
import { PROVINCIAS_DE_CUBA } from "@/features/geography/provincias-de-cuba";
import type { HorarioSemanal } from "@/features/network/horario";
import { enviarSinReiniciar } from "@/lib/enviar-sin-reiniciar";
import { editarSedeAction, type CampoDeAlta, type ResultadoEdicionSede } from "../../_actions";

const campo = (id: string, label: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({
  id: `editar-sede-${id}`,
  label,
  required: true,
  ...extra,
});

const CODIGO = campo("codigo", "Código", { description: "De 2 a 8 letras o números. Único en la red." });
const NOMBRE = campo("nombre", "Nombre");
const DIRECCION = campo("direccion", "Dirección");
const PROVINCIA = campo("provincia", "Provincia");
const MUNICIPIO = campo("municipio", "Municipio");
const TELEFONO = campo("telefono", "Teléfono");

const SELECT =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle aria-[invalid=true]:border-error";

export function EditarSedeForm({
  sede,
  contactoEditable,
  operador,
}: {
  sede: {
    id: string;
    codigo: string;
    nombre: string;
    direccion: string;
    provincia: string;
    municipio: string;
    telefono: string;
    horario: HorarioSemanal;
  };
  contactoEditable: boolean;
  operador: string | null;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoEdicionSede, FormData>(editarSedeAction, null);
  const enviar = enviarSinReiniciar(accion);
  const errorDe = (c: CampoDeAlta) => (estado && estado.campo === c ? estado.error : undefined);

  return (
    <form onSubmit={enviar} className="max-w-form-max" noValidate>
      <input type="hidden" name="sede" value={sede.id} />
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          {estado && !estado.campo ? (
            <Alert variant="error" title="No se pudo guardar">
              {estado.error}
            </Alert>
          ) : null}

          <Alert variant="info" title="Estos datos son públicos">
            Se ven en el kiosco y en la pantalla de la sucursal, y en el selector de sede de las pantallas de la red.
          </Alert>

          <div className="grid gap-6 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
            <Field {...CODIGO} error={errorDe("codigo")}>
              <Input
                {...fieldAria({ ...CODIGO, error: errorDe("codigo") })}
                name="codigo"
                maxLength={8}
                disabled={enviando}
                invalid={Boolean(errorDe("codigo"))}
                defaultValue={sede.codigo}
                className="pc-numeric uppercase"
              />
            </Field>
            <Field {...NOMBRE} error={errorDe("nombre")}>
              <Input
                {...fieldAria({ ...NOMBRE, error: errorDe("nombre") })}
                name="nombre"
                disabled={enviando}
                invalid={Boolean(errorDe("nombre"))}
                defaultValue={sede.nombre}
              />
            </Field>
          </div>

          {contactoEditable ? (
            <>
              <Field {...DIRECCION} error={errorDe("direccion")}>
                <Input
                  {...fieldAria({ ...DIRECCION, error: errorDe("direccion") })}
                  name="direccion"
                  disabled={enviando}
                  invalid={Boolean(errorDe("direccion"))}
                  defaultValue={sede.direccion}
                />
              </Field>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field {...PROVINCIA} error={errorDe("provincia")}>
                  <select
                    {...fieldAria({ ...PROVINCIA, error: errorDe("provincia") })}
                    name="provincia"
                    disabled={enviando}
                    defaultValue={PROVINCIAS_DE_CUBA.includes(sede.provincia) ? sede.provincia : ""}
                    className={SELECT}
                  >
                    <option value="" disabled>
                      Elige la provincia
                    </option>
                    {PROVINCIAS_DE_CUBA.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field {...MUNICIPIO} error={errorDe("municipio")}>
                  <Input
                    {...fieldAria({ ...MUNICIPIO, error: errorDe("municipio") })}
                    name="municipio"
                    disabled={enviando}
                    invalid={Boolean(errorDe("municipio"))}
                    defaultValue={sede.municipio}
                  />
                </Field>
                <Field {...TELEFONO} error={errorDe("telefono")}>
                  <Input
                    {...fieldAria({ ...TELEFONO, error: errorDe("telefono") })}
                    name="telefono"
                    type="tel"
                    disabled={enviando}
                    invalid={Boolean(errorDe("telefono"))}
                    defaultValue={sede.telefono}
                    className="pc-numeric"
                  />
                </Field>
              </div>
              <HorarioEditor
                inicial={sede.horario}
                disabled={enviando}
                error={errorDe("horario")}
                diaConError={estado?.dia}
              />
            </>
          ) : (
            <p className="rounded-card border border-border bg-surface-subtle p-4 text-body-sm text-text-secondary">
              La dirección, el municipio, el teléfono y el horario los mantiene su operador
              {operador ? `, ${operador},` : ""} desde su consola. PuntoCash solo los cambia mientras la sede no tiene
              operador.
            </p>
          )}

          <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="secondary" asChild>
              <Link href={`/super-admin/sedes/${sede.id}` as Route}>Cancelar</Link>
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
