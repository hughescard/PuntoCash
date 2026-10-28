"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { CircleCheck, UserPlus } from "lucide-react";

import { Alert, Button, Card, CardContent, Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { crearUsuarioSuperAdminAction, type ResultadoAltaSuperAdmin } from "../_actions";

/**
 * Alta de un super administrador. Lo que nace con esta cuenta es toda la consola
 * menos la sección Usuarios, que sigue siendo del principal. Esa frontera es lo
 * que la pantalla tiene que decir antes de confirmar, porque es lo que más
 * sorprende a quien lo da de alta.
 */

const campo = (id: string, label: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({
  id: `sa-usuario-${id}`,
  label,
  required: true,
  ...extra,
});

const NOMBRE = campo("nombre", "Nombre");
const PRIMER = campo("primer-apellido", "Primer apellido");
const SEGUNDO = campo("segundo-apellido", "Segundo apellido", { required: false });
const TELEFONO = campo("telefono", "Teléfono");
const CORREO = campo("correo", "Correo electrónico");
const AREA = campo("area", "Área");
const IDENTIFICADOR = campo("identificador", "Identificador de acceso", {
  description: "Con esto inicia sesión. Por norma, su correo de PuntoCash.",
});

type Campo = "identificador" | "correo" | "nombre" | "primer-apellido" | "telefono" | "area";

export function NuevoUsuarioSuperAdminForm(): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAltaSuperAdmin, FormData>(
    crearUsuarioSuperAdminAction,
    null,
  );

  if (estado?.ok) return <CredencialInicialSA resultado={estado} />;

  const previo = estado && !estado.ok ? estado.valores : undefined;
  const errorDe = (nombre: Campo) => (estado && !estado.ok && estado.campo === nombre ? estado.error : undefined);

  return (
    <form action={accion} className="max-w-form-max" noValidate>
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          {estado && !estado.ok && !estado.campo ? (
            <Alert variant="error" title="No se pudo dar de alta">
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
                defaultValue={previo?.nombre}
              />
            </Field>
            <Field {...PRIMER} error={errorDe("primer-apellido")}>
              <Input
                {...fieldAria({ ...PRIMER, error: errorDe("primer-apellido") })}
                name="primer-apellido"
                disabled={enviando}
                invalid={Boolean(errorDe("primer-apellido"))}
                defaultValue={previo?.primerApellido}
              />
            </Field>
            <Field {...SEGUNDO}>
              <Input {...fieldAria(SEGUNDO)} name="segundo-apellido" disabled={enviando} defaultValue={previo?.segundoApellido} />
            </Field>
            <Field {...TELEFONO} error={errorDe("telefono")}>
              <Input
                {...fieldAria({ ...TELEFONO, error: errorDe("telefono") })}
                name="telefono"
                type="tel"
                disabled={enviando}
                invalid={Boolean(errorDe("telefono"))}
                defaultValue={previo?.telefono}
                placeholder="+53 7 000 0000"
                className="pc-numeric"
              />
            </Field>
            <Field {...AREA} error={errorDe("area")}>
              <Input
                {...fieldAria({ ...AREA, error: errorDe("area") })}
                name="area"
                disabled={enviando}
                invalid={Boolean(errorDe("area"))}
                defaultValue={previo?.area}
                placeholder="Operaciones de red"
              />
            </Field>
            <Field {...CORREO} error={errorDe("correo")}>
              <Input
                {...fieldAria({ ...CORREO, error: errorDe("correo") })}
                name="correo"
                type="email"
                inputMode="email"
                disabled={enviando}
                invalid={Boolean(errorDe("correo"))}
                defaultValue={previo?.correo}
                placeholder="nombre@puntocash.com"
              />
            </Field>
          </div>

          <Field {...IDENTIFICADOR} error={errorDe("identificador")}>
            <Input
              {...fieldAria({ ...IDENTIFICADOR, error: errorDe("identificador") })}
              name="identificador"
              disabled={enviando}
              invalid={Boolean(errorDe("identificador"))}
              defaultValue={previo?.identificador}
            />
          </Field>

          <Alert variant="warning" title="Verá toda la red, pero no esta sección">
            Desde que entre, podrá gestionar sedes, operadores, servicios, tasas, promociones y
            consultar todo. Lo único que no verá es Usuarios: esta sección es tuya mientras seas el
            principal, y los demás super administradores no la tendrán.
          </Alert>

          <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="secondary" asChild>
              <Link href="/super-admin/usuarios">Cancelar</Link>
            </Button>
            <Button type="submit" loading={enviando}>
              <UserPlus aria-hidden="true" />
              Dar de alta
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function CredencialInicialSA({
  resultado,
}: {
  resultado: Extract<ResultadoAltaSuperAdmin, { ok: true }>;
}): React.JSX.Element {
  return (
    <div className="flex max-w-form-max flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-5 pt-6">
          <p className="flex items-center gap-2 text-section-title text-text-primary">
            <CircleCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
            {resultado.nombre} ya puede entrar en la consola
          </p>

          <div className="rounded-control border border-border bg-surface-subtle px-4 py-4">
            <p className="text-caption uppercase text-text-secondary">Identificador de acceso</p>
            <p className="pc-numeric mt-1 text-body text-text-primary">{resultado.identificador}</p>

            <p className="mt-4 text-caption uppercase text-text-secondary">Credencial inicial</p>
            <p className="pc-numeric mt-1 text-screen-title tracking-wide text-text-primary">{resultado.credencial}</p>
          </div>

          <Alert variant="warning" title="Cópiala ahora: no se podrá volver a consultar">
            Entrégasela en persona junto con su identificador. Si se pierde, habrá que regenerarla desde su ficha.
          </Alert>
        </CardContent>
      </Card>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="secondary" asChild>
          <Link href="/super-admin/usuarios/nuevo">Dar de alta a otro</Link>
        </Button>
        <Button asChild>
          <Link href={`/super-admin/usuarios/${resultado.usuarioId}` as Route}>Ver su ficha</Link>
        </Button>
      </div>
    </div>
  );
}
