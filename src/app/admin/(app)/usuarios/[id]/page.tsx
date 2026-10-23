import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Button, Card, CardContent } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { maskEmail } from "@/features/auth/two-factor";
import { getAdminSession } from "@/features/admin/session-server";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { EstadoUsuario } from "../usuarios-list";
import { AccionesUsuario } from "./acciones-usuario";

export const metadata: Metadata = {
  title: "Administración de sede · Ficha de usuario",
  robots: { index: false, follow: false },
};

/**
 * Ficha de un usuario administrador — **FR-AD-USR-6** a **FR-AD-USR-9**.
 *
 * La guarda va primero y es la de siempre: se comprueba que pertenezca al
 * operador de la sesión **antes de representar nada**, y un usuario de otra
 * empresa responde **exactamente igual que uno inexistente** (**FR-AD-NAV-2**,
 * **FR-AD-NAV-3**). Y antes aún, que quien mira sea el administrador principal
 * (**FR-AD-USR-11**).
 *
 * ── Datos y acciones, y nada más ──────────────────────────────────
 * Esta pantalla llegó a tener dos secciones explicando **qué puede hacer** un
 * administrador y **de dónde salió** su cuenta. Las dos se retiraron: un
 * administrador aprende sus capacidades en el manual al empezar a usar el
 * sistema, no en una ficha que abre para cambiar un teléfono. Lo único que
 * sigue explicándose aquí es **por qué falta un control**, que es otra cosa.
 *
 * ── Lo que se calcula antes de ofrecer nada ─────────────────────────
 * Si el usuario de la ficha es el principal, porque entonces no se ofrece
 * desactivar (**FR-AD-USR-13**) y el requisito pide que el control esté
 * **ausente**, con la razón visible, en vez de presente y fallando al
 * pulsarlo. Esa decisión no puede tomarse al enviar.
 */
export default async function AdminUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  /* **FR-AD-USR-11**: §8 pertenece al administrador principal. Para los demás
     la sección **no existe** —no «no tienes permiso»—, igual que una sede
     ajena (**FR-AD-NAV-3**): quien no la gobierna no necesita saber que está
     ahí. */
  if (!session.user.isPrincipal) notFound();

  const { id } = await params;

  const red = redEnAlcance(session.scope);
  const usuario = red.usuario(id);
  if (!usuario) notFound();

  const esYo = usuario.id === session.user.id;

  /* **FR-AD-USR-12**: a quién se le puede traspasar el papel. Solo activos, y
     nunca uno mismo. Se calcula aquí porque el diálogo necesita la lista para
     ofrecer una elección, no un campo libre. */
  const candidatos = red
    .usuarios()
    .filter((u) => u.status === "activo" && u.id !== session.user.id)
    .map((u) => ({ id: u.id, nombre: u.fullName }));

  return (
    <>
      <PageHeader
        title={usuario.fullName}
        description={esYo ? `${usuario.identifier} · tu usuario` : usuario.identifier}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/admin/usuarios">
              <ArrowLeft aria-hidden="true" />
              Volver a Usuarios
            </Link>
          </Button>
        }
      />

      {usuario.status === "desactivado" ? (
        <Alert variant="warning" title="Este usuario está desactivado" className="mb-12">
          No puede entrar en la consola. Nada de lo que hizo se ha borrado ni alterado, y puede
          reactivarse desde aquí.
        </Alert>
      ) : null}

      <Section title="Datos">
        <Card>
          <CardContent className="pt-6">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 wide:grid-cols-3">
              <Dato label="Estado" valor={<EstadoUsuario status={usuario.status} />} />
              <Dato label="Identificador de acceso" valor={usuario.identifier} numerico />
              <Dato label="Teléfono" valor={usuario.phone} numerico />
              <Dato label="Correo de verificación" valor={maskEmail(usuario.email)} />
              <Dato label="Alta" valor={formatDate(new Date(usuario.createdAt))} />
              <Dato
                label="Último acceso"
                valor={
                  usuario.lastAccessAt
                    ? formatDateTime(new Date(usuario.lastAccessAt))
                    : "Nunca ha entrado"
                }
              />
            </dl>
          </CardContent>
        </Card>
      </Section>

      <Section title="Acciones">
        <AccionesUsuario
          usuario={{
            id: usuario.id,
            nombre: usuario.fullName,
            correo: usuario.email,
            activo: usuario.status === "activo",
            esPrincipal: usuario.isPrincipal,
          }}
          esYo={esYo}
          candidatos={candidatos}
        />
      </Section>
    </>
  );
}

function Dato({
  label,
  valor,
  numerico,
}: {
  label: string;
  valor: React.ReactNode;
  numerico?: boolean;
}): React.JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-caption uppercase text-text-secondary">{label}</dt>
      <dd className={`mt-1 text-body text-text-primary ${numerico ? "pc-numeric" : ""}`}>
        {valor}
      </dd>
    </div>
  );
}
