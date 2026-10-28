import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Button, Card, CardContent } from "@/components/ui";
import { maskEmail } from "@/features/auth/two-factor";
import { getSuperAdminSession } from "@/features/super-admin/session-server";

export const metadata: Metadata = {
  title: "Administración de la red · Perfil",
  robots: { index: false, follow: false },
};

/**
 * El perfil de quien tiene la sesión. Sus datos son de solo lectura: las
 * cuentas de PuntoCash las mantiene su área de sistemas, fuera del producto.
 * Lo único que la persona cambia aquí es su contraseña.
 */
export default async function SuperAdminPerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ contrasena?: string }>;
}) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  const { contrasena } = await searchParams;
  const { user } = session;

  return (
    <>
      <PageHeader title="Perfil" />

      {contrasena === "cambiada" ? (
        <Alert variant="success" title="Tu contraseña está cambiada" className="mb-12">
          La próxima vez que inicies sesión, usa la nueva. Esta sesión sigue abierta.
        </Alert>
      ) : null}

      <Section title="Tus datos" description="Para corregir alguno de estos datos, pídelo al área de sistemas de PuntoCash.">
        <Card>
          <CardContent className="pt-6">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 wide:grid-cols-3">
              <Dato label="Nombre" valor={user.fullName} />
              <Dato label="Identificador de acceso" valor={user.identifier} />
              <Dato label="Correo de verificación" valor={maskEmail(user.email)} />
              <Dato label="Teléfono" valor={user.phone} numerico />
              <Dato label="Área" valor={user.area} />
            </dl>
          </CardContent>
        </Card>
      </Section>

      <Section title="Contraseña">
        <Card>
          <CardContent className="flex flex-col items-stretch gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <span aria-hidden="true" className="text-body tracking-[0.2em] text-text-secondary">
              ••••••••
            </span>
            <Button variant="secondary" asChild>
              <Link href="/super-admin/perfil/contrasena">
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

function Dato({ label, valor, numerico }: { label: string; valor: React.ReactNode; numerico?: boolean }): React.JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-caption uppercase text-text-secondary">{label}</dt>
      <dd className={`mt-1 break-words text-body text-text-primary ${numerico ? "pc-numeric" : ""}`}>{valor}</dd>
    </div>
  );
}
