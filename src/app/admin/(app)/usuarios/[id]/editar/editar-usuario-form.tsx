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
import { editarUsuarioAction, type ResultadoEdicionUsuario } from "../../_actions";

/**
 * Los datos personales de un usuario administrador — **FR-AD-USR-6**.
 *
 * Alcanza a **nombre, apellidos y teléfono**. No al identificador, que es con
 * lo que inicia sesión, ni al correo, que es el canal del segundo factor y
 * tiene su propia acción en la ficha. Ninguno de los dos se menciona aquí: no
 * estar es la explicación, y quien los busque los tiene en la ficha de la que
 * viene.
 */

const campo = (id: string, label: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({
  id: `editar-usuario-${id}`,
  label,
  required: true,
  ...extra,
});

const NOMBRE = campo("nombre", "Nombre");
const PRIMER = campo("primer-apellido", "Primer apellido");
const SEGUNDO = campo("segundo-apellido", "Segundo apellido", { required: false });
const TELEFONO = campo("telefono", "Teléfono");

type Campo = "nombre" | "primer-apellido" | "telefono";

export function EditarUsuarioForm({
  usuario,
}: {
  usuario: {
    id: string;
    nombre: string;
    primerApellido: string;
    segundoApellido: string;
    telefono: string;
  };
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoEdicionUsuario, FormData>(
    editarUsuarioAction,
    null,
  );

  /* Tras un rechazo manda lo tecleado; en la primera pintura, lo guardado.
     React reinicia los campos no controlados cuando la acción termina, y aquí
     el daño sería mayor: son datos que ya existían y que alguien acaba de
     corregir a mano. */
  const previo = estado && !estado.ok ? estado.valores : undefined;
  const errorDe = (nombre: Campo) =>
    estado && !estado.ok && estado.campo === nombre ? estado.error : undefined;

  return (
    <form action={accion} className="max-w-form-max">
      <input type="hidden" name="usuario" value={usuario.id} />

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
                defaultValue={previo?.nombre ?? usuario.nombre}
              />
            </Field>
            <Field {...PRIMER} error={errorDe("primer-apellido")}>
              <Input
                {...fieldAria({ ...PRIMER, error: errorDe("primer-apellido") })}
                name="primer-apellido"
                disabled={enviando}
                invalid={Boolean(errorDe("primer-apellido"))}
                defaultValue={previo?.primerApellido ?? usuario.primerApellido}
              />
            </Field>
            <Field {...SEGUNDO}>
              <Input
                {...fieldAria(SEGUNDO)}
                name="segundo-apellido"
                disabled={enviando}
                defaultValue={previo?.segundoApellido ?? usuario.segundoApellido}
              />
            </Field>
            <Field {...TELEFONO} error={errorDe("telefono")}>
              <Input
                {...fieldAria({ ...TELEFONO, error: errorDe("telefono") })}
                name="telefono"
                type="tel"
                disabled={enviando}
                invalid={Boolean(errorDe("telefono"))}
                defaultValue={previo?.telefono ?? usuario.telefono}
                className="pc-numeric"
              />
            </Field>
          </div>

          <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="secondary" asChild>
              <Link href={`/admin/usuarios/${usuario.id}` as Route}>Cancelar</Link>
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
