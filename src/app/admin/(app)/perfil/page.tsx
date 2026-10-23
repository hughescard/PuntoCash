import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { KeyRound, Pencil } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Button, Card, CardContent } from "@/components/ui";
import { maskEmail } from "@/features/auth/two-factor";
import { getAdminSession } from "@/features/admin/session-server";
import { redEnAlcance } from "@/features/network/scoped-reads";

export const metadata: Metadata = {
  title: "Administración de sede · Perfil",
  robots: { index: false, follow: false },
};

/**
 * El perfil de quien tiene la sesión — **FR-AD-PERF-1** a **FR-AD-PERF-4**.
 *
 * Existe porque §8 tiene dueño. Mientras Usuarios fue de todos, cada uno
 * corregía su nombre entrando en su propia ficha; desde que es del principal,
 * quien no lo es no tenía ningún sitio donde ver sus datos ni cambiar su
 * contraseña sin fingir que la había olvidado.
 *
 * ── Lo que se puede cambiar aquí y lo que no ──────────────────────────────
 * Nombre, apellidos, teléfono y contraseña, sí. El **correo**, no: es el canal
 * del segundo factor y de la recuperación, y quien lo cambia decide a dónde
 * van los códigos de acceso de esa cuenta. Que eso siga siendo cosa del
 * principal es lo que impide que alguien con una sesión ajena abierta se
 * quede con la cuenta redirigiendo el correo a uno suyo. El identificador
 * tampoco: es con lo que se entra, y no lo cambia nadie.
 *
 * Por eso esta pantalla es la misma para el principal y para los demás, con
 * una sola diferencia: a quién remite para cambiar el correo.
 */
export default async function AdminPerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ contrasena?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { contrasena } = await searchParams;
  const { user, operator } = session;

  const principal = user.isPrincipal
    ? user
    : redEnAlcance(session.scope).administradorPrincipal();

  return (
    <>
      <PageHeader title="Perfil" />

      {/* **FR-AD-PERF-6**: un cambio de contraseña no se ve en ningún dato de
          la pantalla, así que sin esta confirmación no habría forma de saber
          que se hizo. */}
      {contrasena === "cambiada" ? (
        <Alert variant="success" title="Tu contraseña está cambiada" className="mb-12">
          La próxima vez que inicies sesión, usa la nueva. Esta sesión sigue abierta.
        </Alert>
      ) : null}

      <Section
        title="Tus datos"
        actions={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/admin/perfil/editar">
              <Pencil aria-hidden="true" />
              Editar
            </Link>
          </Button>
        }
      >
        <Card>
          <CardContent className="pt-6">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 wide:grid-cols-3">
              <Dato label="Nombre" valor={user.fullName} />
              <Dato label="Identificador de acceso" valor={user.identifier} numerico />
              <Dato label="Teléfono" valor={user.phone} numerico />
              <Dato
                label="Correo de verificación"
                valor={maskEmail(user.email)}
                nota={
                  <NotaCorreo
                    esPrincipal={user.isPrincipal}
                    usuarioId={user.id}
                    principal={principal?.fullName}
                  />
                }
              />
              <Dato
                label="Papel"
                valor={user.isPrincipal ? "Administrador principal" : "Administrador"}
              />
              <Dato label="Empresa" valor={operator.name} />
            </dl>
          </CardContent>
        </Card>
      </Section>

      <Section title="Contraseña">
        <Card>
          <CardContent className="flex flex-col items-stretch gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            {/* Ocho puntos fijos, no los de la contraseña: su largo tampoco
                es algo que esta pantalla deba revelar. */}
            <span aria-hidden="true" className="text-body tracking-[0.2em] text-text-secondary">
              ••••••••
            </span>
            <Button variant="secondary" asChild>
              <Link href="/admin/perfil/contrasena">
                <KeyRound aria-hidden="true" />
                Cambiar contraseña
              </Link>
            </Button>
          </CardContent>
        </Card>
      </Section>
    </>
  );
}

/**
 * **FR-AD-PERF-4**: el correo no se cambia aquí, y la pantalla dice dónde sí.
 * Es lo único que se explica, porque es lo único que alguien buscaría en esta
 * pantalla sin encontrarlo.
 */
function NotaCorreo({
  esPrincipal,
  usuarioId,
  principal,
}: {
  esPrincipal: boolean;
  usuarioId: string;
  principal: string | undefined;
}): React.JSX.Element {
  if (esPrincipal) {
    return (
      <>
        Se cambia desde{" "}
        <Link
          href={`/admin/usuarios/${usuarioId}` as Route}
          className="font-medium text-primary underline underline-offset-2"
        >
          tu ficha en Usuarios
        </Link>
        .
      </>
    );
  }

  return (
    <>
      Para cambiarlo, pídeselo a {principal ?? "el administrador principal de tu empresa"}.
    </>
  );
}

function Dato({
  label,
  valor,
  nota,
  numerico,
}: {
  label: string;
  valor: React.ReactNode;
  nota?: React.ReactNode;
  numerico?: boolean;
}): React.JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-caption uppercase text-text-secondary">{label}</dt>
      <dd className={`mt-1 break-words text-body text-text-primary ${numerico ? "pc-numeric" : ""}`}>
        {valor}
      </dd>
      {nota ? <dd className="mt-1 text-body-sm text-text-secondary">{nota}</dd> : null}
    </div>
  );
}
