import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Button, Card, CardContent } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { maskEmail } from "@/features/auth/two-factor";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { findPuntoCashUserById, PUNTOCASH_USERS } from "@/features/super-admin/usuarios";
import { EstadoUsuarioSA } from "../usuarios-list";
import { AccionesUsuarioSA } from "./acciones-usuario";

export const metadata: Metadata = {
  title: "Super administración · Ficha de usuario",
  robots: { index: false, follow: false },
};

/** Ficha de un usuario de la consola. Solo el principal; el resto recibe 404. */
export default async function SuperAdminUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");
  if (!session.user.isPrincipal) notFound();

  const { id } = await params;
  const usuario = findPuntoCashUserById(id);
  if (!usuario) notFound();

  const esYo = usuario.id === session.user.id;

  /* Traspaso: solo activos, y nunca uno mismo (FR-SA-USR). */
  const candidatos = PUNTOCASH_USERS.filter((u) => u.status === "activo" && u.id !== session.user.id).map((u) => ({
    id: u.id,
    nombre: u.fullName,
  }));

  return (
    <>
      <PageHeader
        title={usuario.fullName}
        description={esYo ? `${usuario.identifier} · tu usuario` : usuario.identifier}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/super-admin/usuarios">
              <ArrowLeft aria-hidden="true" />
              Volver a Usuarios
            </Link>
          </Button>
        }
      />

      {usuario.status === "desactivado" ? (
        <Alert variant="warning" title="Este usuario está desactivado" className="mb-12">
          No puede entrar en la consola. Nada de lo que hizo se ha borrado ni alterado, y puede reactivarse desde aquí.
        </Alert>
      ) : null}

      <Section title="Datos">
        <Card>
          <CardContent className="pt-6">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 wide:grid-cols-3">
              <Dato label="Estado" valor={<EstadoUsuarioSA status={usuario.status} />} />
              <Dato label="Identificador de acceso" valor={usuario.identifier} numerico />
              <Dato label="Área" valor={usuario.area} />
              <Dato label="Teléfono" valor={usuario.phone} numerico />
              <Dato label="Correo de verificación" valor={maskEmail(usuario.email)} />
              <Dato label="Alta" valor={formatDate(new Date(usuario.createdAt))} />
              <Dato
                label="Último acceso"
                valor={usuario.lastAccessAt ? formatDateTime(new Date(usuario.lastAccessAt)) : "Nunca ha entrado"}
              />
              <Dato label="Papel" valor={usuario.isPrincipal ? "Principal" : "Super administrador"} />
            </dl>
          </CardContent>
        </Card>
      </Section>

      <Section title="Acciones">
        <AccionesUsuarioSA
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

function Dato({ label, valor, numerico }: { label: string; valor: React.ReactNode; numerico?: boolean }): React.JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-caption uppercase text-text-secondary">{label}</dt>
      <dd className={`mt-1 text-body text-text-primary ${numerico ? "pc-numeric" : ""}`}>{valor}</dd>
    </div>
  );
}
