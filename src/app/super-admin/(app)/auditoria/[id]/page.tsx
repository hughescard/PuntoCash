import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Button, Card, CardContent } from "@/components/ui";
import { AUDIT_EVENTS } from "@/features/network/audit";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { fechaYHora } from "@/app/admin/(app)/jornadas/formato";
import { filaDeEvento } from "../datos";

export const metadata: Metadata = {
  title: "Super administración · Evento de auditoría",
  robots: { index: false, follow: false },
};

/**
 * Un evento del registro — **FR-SA-AUD-5** y **FR-SA-AUD-7**: enlaza a la sede
 * y al operador mientras sigan siendo alcanzables, y dice el valor anterior y
 * el nuevo para que no haya que reconstruirlo. **Ningún control**: ni editar,
 * ni borrar, ni deshabilitado **[RP-21]**.
 */
export default async function SuperAdminEventoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  const { id } = await params;
  const evento = AUDIT_EVENTS.find((e) => e.id === decodeURIComponent(id));
  if (!evento) notFound();
  const e = filaDeEvento(evento, session.user.isPrincipal);

  return (
    <>
      <PageHeader
        title={e.evento}
        description={`${fechaYHora(e.cuando)} · ${e.objeto}`}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/super-admin/auditoria">
              <ArrowLeft aria-hidden="true" />
              Volver a Auditoría
            </Link>
          </Button>
        }
      />

      <Section title="Qué pasó">
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <Dato etiqueta="Fecha y hora" valor={<span className="pc-numeric">{fechaYHora(e.cuando)}</span>} />
              <Dato
                etiqueta="Quién actuó"
                valor={
                  <span className="flex flex-col">
                    <span>{e.actor}</span>
                    <span className="text-body-sm text-text-secondary">
                      {e.rol === "admin-sede" ? `Mercante${e.operador ? ` · ${e.operador}` : ""}` : "PuntoCash"}
                    </span>
                  </span>
                }
              />
              <Dato
                etiqueta="Sobre qué"
                valor={
                  e.objetoHref ? (
                    <Link href={e.objetoHref as Route} className="underline underline-offset-4 hover:text-primary">
                      {e.objeto}
                    </Link>
                  ) : (
                    e.objeto
                  )
                }
              />
              <Dato
                etiqueta="Sede"
                valor={
                  e.sedeId && e.sede ? (
                    <Link href={`/super-admin/sedes/${e.sedeId}` as Route} className="underline underline-offset-4 hover:text-primary">
                      {e.sede}
                    </Link>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )
                }
              />
              <Dato
                etiqueta="Operador"
                valor={
                  e.operadorId && e.operador ? (
                    <Link href={`/super-admin/operadores/${e.operadorId}` as Route} className="underline underline-offset-4 hover:text-primary">
                      {e.operador}
                    </Link>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )
                }
              />
              <Dato etiqueta="Motivo declarado" valor={e.motivo ?? <span className="text-text-secondary">No se declaró</span>} />
            </dl>
          </CardContent>
        </Card>
      </Section>

      {e.antes || e.despues ? (
        <Section title="Antes y después">
          <div className="grid items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <Valor etiqueta="Antes" valor={e.antes} />
            <ArrowRight className="hidden size-6 self-center text-text-secondary md:block" aria-hidden="true" />
            <Valor etiqueta="Después" valor={e.despues} />
          </div>
        </Section>
      ) : null}
    </>
  );
}

function Valor({ etiqueta, valor }: { etiqueta: string; valor: string | null }): React.JSX.Element {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-caption uppercase tracking-wide text-text-secondary">{etiqueta}</p>
        <p className="mt-1 text-body text-text-primary">{valor ?? <span className="text-text-secondary">—</span>}</p>
      </CardContent>
    </Card>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption uppercase tracking-wide text-text-secondary">{etiqueta}</dt>
      <dd className="mt-1 text-body text-text-primary">{valor}</dd>
    </div>
  );
}
