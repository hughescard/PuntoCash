import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bell, CircleCheck } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Badge, Button, Card, CardContent } from "@/components/ui";
import { ElementoDeLista } from "@/components/patterns/elemento-de-lista";
import { formatAmount } from "@/lib/format";
import { formatoDeDenominacion, valorDeClave } from "@/features/caja/billetes";
import { getAdminSession } from "@/features/admin/session-server";
import { sedesVisibles } from "@/features/admin/session";
import { redEnAlcance } from "@/features/network/scoped-reads";
import {
  alertasActivas,
  desdeDeAlertas,
  historialDeAlertas,
  reglasVigentes,
  tituloDeAlerta,
} from "@/features/network/alertas";
import { fechaYHora } from "../jornadas/formato";
import { cifras } from "../cajas/[id]/alertas-de-la-caja";

export const metadata: Metadata = {
  title: "Administración de sede · Alertas",
  robots: { index: false, follow: false },
};

const HISTORIAL = 15;
/** Cuántas jornadas recientes de cada sede se repasan para el historial. */
const JORNADAS_REPASADAS = 30;

/**
 * Alertas (bloque 6): lo que está pasando ahora en las cajas, las reglas de
 * cada sede —que se **definen aquí**— y lo que pasó. Se ve la sede de la
 * cabecera o todas las del administrador.
 *
 * Una alerta es un estado: se enciende y se apaga sola, y solo cuenta con la
 * jornada abierta. El trabajador la ve sin cifras; aquí van con ellas.
 */
export default async function AdminAlertasPage({ searchParams }: { searchParams: Promise<{ guardado?: string; sede?: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { guardado, sede: sedeGuardada } = await searchParams;
  const sedes = sedesVisibles(session);
  const red = redEnAlcance(session.scope);
  const ahora = new Date();

  const activas = sedes.flatMap((sede) =>
    (red.diaDeSede(sede.id)?.cajas ?? []).flatMap((c) =>
      c.abierta ? [{ sede, jornada: c.abierta, alertas: alertasActivas(c.abierta, ahora), desde: desdeDeAlertas(c.abierta) }] : [],
    ).filter((x) => x.alertas.length > 0),
  );
  const historial = sedes
    .flatMap((sede) => {
      const recientes = [...red.jornadas(sede.id)].sort((a, b) => b.openedAt.localeCompare(a.openedAt)).slice(0, JORNADAS_REPASADAS);
      return historialDeAlertas(recientes).map((t) => ({ sede, t, caja: recientes.find((j) => j.id === t.jornadaId)?.cajaNombre ?? "" }));
    })
    .filter((x) => x.t.hasta !== null)
    .sort((a, b) => b.t.desde.localeCompare(a.t.desde))
    .slice(0, HISTORIAL);

  const nombreGuardada = session.sedes.find((s) => s.id === sedeGuardada)?.name;

  return (
    <>
      <PageHeader
        title="Alertas"
        description={
          session.selected
            ? `Estás viendo ${session.selected.name}. Cambia de sede desde la cabecera.`
            : `Estás viendo tus ${session.sedes.length} sedes. Filtra por una desde la cabecera.`
        }
      />

      {guardado === "1" || guardado === "0" ? (
        <Alert variant="success" title={guardado === "1" ? "Alertas guardadas" : "Sin cambios en las alertas"} className="mb-8">
          {guardado === "1"
            ? `Rigen desde ahora en todas las cajas${nombreGuardada ? ` de ${nombreGuardada}` : ""}. Lo ocurrido antes se sigue leyendo con las reglas de entonces.`
            : "Las alertas eran ya esas."}
        </Alert>
      ) : null}

      <Section
        title="Activas ahora"
        description="Cajas con la jornada abierta que han cruzado un límite. Se apagan solas cuando se arregla la caja."
      >
        {activas.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <CircleCheck className="size-5 shrink-0 text-success-foreground" aria-hidden="true" />
              <p className="text-body text-text-primary">Ninguna caja abierta tiene alertas.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ul className="flex flex-col divide-y divide-border" aria-label="Alertas activas">
                {activas.map(({ sede, jornada, alertas, desde }) => (
                  <ElementoDeLista
                    key={jornada.registerId}
                    href={`/admin/cajas/${encodeURIComponent(jornada.registerId)}`}
                    label={`Ver la caja ${jornada.cajaNombre} de ${sede.name}`}
                  >
                    <span className="block font-medium text-text-primary">
                      {jornada.cajaNombre} · {sede.name}
                    </span>
                    <span className="mt-1 flex flex-col gap-1">
                      {alertas.map((a) => (
                        <span key={a.clave} className="text-body-sm text-text-secondary">
                          <span className="font-medium text-text-primary">{tituloDeAlerta(a)}.</span> {cifras(a)}
                          {desde.get(a.clave) ? ` Desde las ${fechaYHora(desde.get(a.clave)!)}.` : ""}
                        </span>
                      ))}
                    </span>
                  </ElementoDeLista>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </Section>

      <Section
        title="Reglas por sede"
        description="Las defines tú para cada sede y valen para todas sus cajas. Un campo vacío es «sin esa alerta»."
      >
        <div className="flex flex-col gap-4">
          {sedes.map((sede) => {
            const reglas = reglasVigentes(sede.id, ahora);
            return (
              <Card key={sede.id}>
                <CardContent className="flex flex-col gap-4 pt-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-h3 text-text-primary">{sede.name}</h3>
                    {sede.status !== "cerrada" ? (
                      <Button variant="secondary" size="sm" asChild>
                        <Link href={`/admin/alertas/${sede.id}`} aria-label={`Definir las alertas de ${sede.name}`}>
                          <Bell aria-hidden="true" />
                          Definir
                        </Link>
                      </Button>
                    ) : (
                      <Badge variant="neutral">Sede cerrada</Badge>
                    )}
                  </div>
                  {reglas.length === 0 ? (
                    <p className="text-body-sm text-text-secondary">Esta sede no tiene alertas definidas.</p>
                  ) : (
                    <ul className="flex flex-col gap-3" aria-label={`Reglas de ${sede.name}`}>
                      {reglas.map((r) => (
                        <li key={r.currency} className="flex flex-col gap-1">
                          <span className="font-semibold text-text-primary">{r.currency}</span>
                          <span className="text-body-sm text-text-secondary">
                            {[
                              r.minimo !== null ? `Mínimo ${formatAmount(r.minimo)} ${r.currency}` : null,
                              r.maximo !== null ? `Máximo ${formatAmount(r.maximo)} ${r.currency}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "Sin límites de efectivo"}
                          </span>
                          {Object.keys(r.billetesMinimos).length > 0 ? (
                            <span className="text-body-sm text-text-secondary">
                              Billetes mínimos:{" "}
                              {Object.entries(r.billetesMinimos)
                                .sort(([a], [b]) => Number(b) - Number(a))
                                .map(([k, n]) => `${formatoDeDenominacion(valorDeClave(k))} × ${n}`)
                                .join(" · ")}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section
        title="Historial"
        description={`Las ${HISTORIAL} más recientes que ya se apagaron. Cada una con las reglas que regían entonces.`}
      >
        {historial.length === 0 ? (
          <p className="text-body-sm text-text-secondary">Todavía no se ha apagado ninguna alerta.</p>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ul className="flex flex-col divide-y divide-border" aria-label="Historial de alertas">
                {historial.map(({ sede, t, caja }) => (
                  <ElementoDeLista key={`${t.jornadaId}-${t.clave}-${t.desde}`} href={`/admin/jornadas/${t.jornadaId}`}>
                    <span className="block font-medium text-text-primary">{tituloDeAlerta(t)}</span>
                    <span className="block text-body-sm text-text-secondary">
                      {caja} · {sede.name} · {fechaYHora(t.desde)} → {fechaYHora(t.hasta!)}
                    </span>
                  </ElementoDeLista>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </Section>
    </>
  );
}
