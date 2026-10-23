"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { CircleCheck, UserPlus } from "lucide-react";

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
import { crearUsuarioAction, type ResultadoAltaUsuario } from "../_actions";

/**
 * Alta de un usuario administrador — **FR-AD-USR-2** a **FR-AD-USR-5**.
 *
 * ── La única explicación de esta pantalla, y por qué se queda ─────────────
 * **FR-AD-USR-4** pide decir sin rodeos que el usuario nuevo podrá, **en la
 * operación**, todo lo que puede quien lo crea, en todas sus sedes —y que lo
 * único que no hereda es esta sección (**FR-AD-USR-11**)—. Se queda, y no cae en el criterio
 * que retiró las notas de §7: aquello explicaba lo que la etiqueta ya decía;
 * esto dice **lo que el producto decide por su cuenta** —no hay perfiles, no
 * hay límite por sede— y no hay ningún control en la pantalla del que
 * deducirlo. Es además lo que más probablemente sorprenda a quien acaba de dar
 * de alta a un trabajador, donde sí se elige sede.
 *
 * El desenlace **no vuelve al listado**: lo siguiente que tiene que pasar es
 * que alguien lea la credencial inicial y la entregue (**FR-AD-USR-5**).
 */

const campo = (id: string, label: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({
  id: `usuario-${id}`,
  label,
  required: true,
  ...extra,
});

const NOMBRE = campo("nombre", "Nombre");
const PRIMER = campo("primer-apellido", "Primer apellido");
const SEGUNDO = campo("segundo-apellido", "Segundo apellido", { required: false });
const TELEFONO = campo("telefono", "Teléfono");
const CORREO = campo("correo", "Correo electrónico");
const IDENTIFICADOR = campo("identificador", "Identificador de acceso", {
  description: "Con esto inicia sesión. No tiene que ser su correo.",
});

type Campo = "identificador" | "correo" | "nombre" | "primer-apellido" | "telefono";

export function NuevoUsuarioForm(): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAltaUsuario, FormData>(
    crearUsuarioAction,
    null,
  );

  if (estado?.ok) return <CredencialInicial resultado={estado} />;

  const previo = estado && !estado.ok ? estado.valores : undefined;
  const errorDe = (nombre: Campo) =>
    estado && !estado.ok && estado.campo === nombre ? estado.error : undefined;

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
              <Input
                {...fieldAria(SEGUNDO)}
                name="segundo-apellido"
                disabled={enviando}
                defaultValue={previo?.segundoApellido}
              />
            </Field>
            <Field {...TELEFONO} error={errorDe("telefono")}>
              <Input
                {...fieldAria({ ...TELEFONO, error: errorDe("telefono") })}
                name="telefono"
                type="tel"
                disabled={enviando}
                invalid={Boolean(errorDe("telefono"))}
                defaultValue={previo?.telefono}
                placeholder="+53 5 000 0000"
                className="pc-numeric"
              />
            </Field>
          </div>

          <Field {...CORREO} error={errorDe("correo")}>
            <Input
              {...fieldAria({ ...CORREO, error: errorDe("correo") })}
              name="correo"
              type="email"
              inputMode="email"
              disabled={enviando}
              invalid={Boolean(errorDe("correo"))}
              defaultValue={previo?.correo}
              placeholder="nombre@empresa.cu"
            />
          </Field>

          <Field {...IDENTIFICADOR} error={errorDe("identificador")}>
            <Input
              {...fieldAria({ ...IDENTIFICADOR, error: errorDe("identificador") })}
              name="identificador"
              disabled={enviando}
              invalid={Boolean(errorDe("identificador"))}
              defaultValue={previo?.identificador}
            />
          </Field>

          {/* **FR-AD-USR-4**: la consecuencia que más sorprende, dicha antes
              de confirmar y no después. Y la frontera, en la misma frase: lo
              único que no hereda es esta sección (**FR-AD-USR-11**). */}
          <Alert variant="warning" title="Podrá hacer todo lo que tú haces en la operación">
            No hay perfiles ni usuarios limitados a una sede. Desde que entre, esta persona podrá
            crear y desactivar trabajadores, vincular equipos, fijar tasas y aprobar solicitudes,
            en todas tus sedes. Lo único que no podrá es administrar usuarios: esta pantalla es
            tuya mientras seas el administrador principal, y él no la verá.
          </Alert>

          <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="secondary" asChild>
              <Link href="/admin/usuarios">Cancelar</Link>
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

/** **FR-AD-USR-5**: la credencial inicial, con el tratamiento de §7. */
function CredencialInicial({
  resultado,
}: {
  resultado: Extract<ResultadoAltaUsuario, { ok: true }>;
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
            <p className="pc-numeric mt-1 text-body text-text-primary">
              {resultado.identificador}
            </p>

            <p className="mt-4 text-caption uppercase text-text-secondary">Credencial inicial</p>
            <p className="pc-numeric mt-1 text-screen-title tracking-wide text-text-primary">
              {resultado.credencial}
            </p>
          </div>

          <Alert variant="warning" title="Cópiala ahora: no se podrá volver a consultar">
            Entrégasela en persona junto con su identificador. Si se pierde, habrá que regenerarla
            desde su ficha — nadie, ni tú, puede volver a leer esta.
          </Alert>
        </CardContent>
      </Card>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="secondary" asChild>
          <Link href="/admin/usuarios/nuevo">Dar de alta a otro</Link>
        </Button>
        <Button asChild>
          <Link href={`/admin/usuarios/${resultado.usuarioId}` as Route}>Ver su ficha</Link>
        </Button>
      </div>
    </div>
  );
}
