import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound, Pencil } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Button, Card, CardContent } from "@/components/ui";
import { maskEmail } from "@/features/auth/two-factor";
import { getContextoDeTrabajo } from "@/features/worker/sesion-servidor";

export const metadata: Metadata = {
  title: "Perfil",
  robots: { index: false, follow: false },
};

/**
 * El perfil del trabajador (decisión del 12/11/2026).
 *
 * ── Lo que cambia él y lo que no ──────────────────────────────────────────
 * **Su nombre de usuario y su teléfono, sí.** El nombre de usuario es una
 * comodidad para entrar sin escribir el correo, y nada de lo registrado
 * cuelga de él; el teléfono es un dato de contacto que caduca, y quien mejor
 * lo mantiene al día es él.
 *
 * **Su nombre y su documento, no.** Son los que dicen quién hizo cada
 * operación, cada jornada y cada cuadre: si los pudiera cambiar, la traza
 * dejaría de valer. Los corrige su administrador. **El correo tampoco**: es
 * el canal del segundo factor, y cambiarlo decide quién puede entrar.
 */
export default async function WorkerPerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ datos?: string; contrasena?: string }>;
}) {
  const ctx = await getContextoDeTrabajo();
  if (!ctx) redirect("/worker/login");
  const { datos, contrasena } = await searchParams;
  const { worker, sede } = ctx;

  return (
    <>
      <PageHeader title="Perfil" />

      {datos === "guardados" ? (
        <Alert variant="success" title="Datos guardados" className="mb-8">
          Desde ahora entras con «{worker.identifier}» o con tu correo.
        </Alert>
      ) : datos === "sin-cambios" ? (
        <Alert variant="info" title="Sin cambios" className="mb-8">
          Tus datos eran ya esos.
        </Alert>
      ) : null}
      {contrasena === "cambiada" ? (
        <Alert variant="success" title="Tu contraseña está cambiada" className="mb-8">
          La próxima vez que inicies sesión, usa la nueva. Esta sesión sigue abierta.
        </Alert>
      ) : null}

      <Section
        title="Tus datos"
        actions={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/worker/perfil/editar">
              <Pencil aria-hidden="true" />
              Cambiar usuario o teléfono
            </Link>
          </Button>
        }
      >
        <Card>
          <CardContent className="flex flex-col gap-6 pt-6">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-3">
              <Dato label="Nombre" valor={worker.fullName} />
              <Dato label="Documento" valor={`${worker.documentType} ${worker.documentId}`} numerico />
              <Dato label="Nombre de usuario" valor={worker.identifier} numerico />
              <Dato label="Teléfono" valor={worker.phone} numerico />
              <Dato label="Correo de verificación" valor={maskEmail(worker.email)} />
              <Dato label="Sede" valor={sede.name} />
            </dl>
            <p className="text-body-sm text-text-secondary">
              Tu nombre, tu documento y tu correo los cambia tu administrador: son los que dicen quién hizo cada
              operación y adónde llegan tus códigos de acceso. Si alguno está mal, pídeselo.
            </p>
          </CardContent>
        </Card>
      </Section>

      <Section title="Contraseña">
        <Card>
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            {/* Ocho puntos fijos: tampoco se revela el largo. */}
            <span aria-hidden="true" className="text-body tracking-[0.2em] text-text-secondary">
              ••••••••
            </span>
            <Button variant="secondary" asChild>
              <Link href="/worker/perfil/contrasena">
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

function Dato({ label, valor, numerico }: { label: string; valor: string; numerico?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-caption text-text-secondary">{label}</dt>
      <dd className={numerico ? "pc-numeric break-words text-body text-text-primary" : "break-words text-body text-text-primary"}>{valor}</dd>
    </div>
  );
}
