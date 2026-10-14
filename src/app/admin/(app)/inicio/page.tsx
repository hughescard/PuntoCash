import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { ArrowRight, CircleCheck, TriangleAlert } from "lucide-react";
import { redirect } from "next/navigation";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Badge, Card, CardContent } from "@/components/ui";
import { ResponsiveTable } from "@/components/patterns/responsive-table";
import { getAdminSession } from "@/features/admin/session-server";
import { sedesVisibles, type AdminSession } from "@/features/admin/session";
import { redEnAlcance, type RedEnAlcance } from "@/features/network/scoped-reads";
import type { Sede } from "@/features/network/sedes";

export const metadata: Metadata = {
  title: "Administración de sede · Inicio",
  robots: { index: false, follow: false },
};

/**
 * Inicio — el panel que responde "¿qué está pasando ahora?" (**§5 del FRD**).
 *
 * Todo lo que muestra está acotado al alcance vigente (**A1**) y, dentro de
 * él, a la sede elegida en la cabecera (**FR-AD-SCOPE-4**).
 *
 * ── Qué hay y qué falta, a propósito ─────────────────────────────────────
 * Esta versión representa **solo lo que el dominio sabe de verdad**: sedes,
 * cajas, equipos, kioscos y trabajadores. Las métricas de jornada, operaciones
 * y volumen del día (**FR-AD-HOME-1**) y las entradas del panel de atención
 * que dependen de Monedas, Tasas, Promociones o Jornadas (**FR-AD-HOME-2**)
 * llegan con sus propios tramos, cuando exista de dónde leerlas para toda la
 * red — hoy los datos de caja son los de una sola caja simulada. Lo que la
 * pantalla no muestra está acotado en **FR-AD-HOME-9** y **FR-AD-HOME-10**.
 *
 * Se ha preferido una pantalla corta y cierta a una completa y inventada:
 * este demo es la referencia visual y de flujos que van a seguir quienes
 * implementen, y una cifra inventada se copia igual que una verdadera.
 */
export default async function AdminInicioPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  if (session.sedes.length === 0) return <SinSedes session={session} />;

  const sedes = sedesVisibles(session);
  /* La vista con alcance: las cifras de esta pantalla no pueden salir de una
     sede que no administra (`features/network/scoped-reads.ts`). */
  const red = redEnAlcance(session.scope);
  const filas = sedes.map((sede) => resumenDeSede(red, sede));

  const cajasActivas = filas.reduce((total, fila) => total + fila.cajas, 0);
  const trabajadoresActivos = filas.reduce((total, fila) => total + fila.trabajadores, 0);
  const sinCaja = filas.filter((fila) => fila.cajas === 0);
  /* Segunda prioridad de **FR-AD-HOME-2**, y por la misma razón que la
     primera: una caja sin equipo es una caja en la que nadie puede iniciar
     sesión (**FR-DEV-1**). Es el mismo cálculo con el que el menú pone su
     indicador en Cajas (**FR-AD-SHELL-3**), para que el aviso y el indicador
     no puedan contar cosas distintas. */
  const conCajasSinEquipo = filas.filter((fila) => fila.cajas > 0 && fila.sinEquipo > 0);
  const suspendidas = filas.filter((fila) => fila.sede.status === "suspendida");

  return (
    <>
      <PageHeader
        title={`Hola, ${session.firstName}`}
        description={
          session.selected
            ? `Estás viendo ${session.selected.name}. Cambia de sede desde la cabecera.`
            : `Estás viendo tus ${session.sedes.length} sedes. Filtra por una desde la cabecera.`
        }
      />

      <Section title="Tu alcance de hoy">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Metric label={sedes.length === 1 ? "Sede" : "Sedes"} value={sedes.length} />
          <Metric label="Cajas activas" value={cajasActivas} />
          <Metric label="Trabajadores activos" value={trabajadoresActivos} />
          <Metric
            label="Sedes sin caja"
            value={sinCaja.length}
            tone={sinCaja.length > 0 ? "warning" : "neutral"}
          />
        </div>
      </Section>

      {/* **FR-AD-HOME-5**: el panel no desaparece cuando no hay nada. Su
          ausencia y su vacío tienen que distinguirse a simple vista. */}
      <Section
        title="Requiere tu atención"
        description="Lo que impide que una sede opere encabeza siempre la lista."
      >
        {sinCaja.length === 0 && conCajasSinEquipo.length === 0 && suspendidas.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <CircleCheck className="size-5 shrink-0 text-success-foreground" aria-hidden="true" />
              <p className="text-body text-text-primary">Todo en orden en tus sedes.</p>
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {sinCaja.map((fila) => (
              <AtencionItem
                key={`sin-caja-${fila.sede.id}`}
                title={`${fila.sede.name} no tiene ninguna caja`}
                detail="Sin al menos una caja, la sede no puede abrir jornada ni atender a nadie."
                href="/admin/cajas"
                action="Crear una caja"
              />
            ))}
            {conCajasSinEquipo.map((fila) => (
              <AtencionItem
                key={`sin-equipo-${fila.sede.id}`}
                title={
                  fila.sinEquipo === 1
                    ? `${fila.sede.name} tiene una caja sin equipo vinculado`
                    : `${fila.sede.name} tiene ${fila.sinEquipo} cajas sin equipo vinculado`
                }
                detail="En una caja sin equipo nadie puede iniciar sesión. Vincula el equipo del puesto para que pueda operar."
                href="/admin/equipos"
                action="Vincular un equipo"
              />
            ))}
            {suspendidas.map((fila) => (
              <AtencionItem
                key={`suspendida-${fila.sede.id}`}
                title={`${fila.sede.name} está suspendida`}
                detail="PuntoCash la suspendió: sus trabajadores no pueden iniciar sesión hasta que la reactive."
                href="/admin/sedes"
                action="Ver la sede"
              />
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Estado por sede"
        description="La jornada, el turno y las operaciones del día se incorporan con Jornadas y Operaciones."
      >
        {/* Una sola definición de columnas para las dos formas: tabla en
            escritorio y tarjeta por fila en el teléfono
            (`ResponsiveTable`, **FR-AD-SHELL-13**). Antes estaba escrito dos
            veces aquí mismo, que es exactamente como una de las dos acaba
            quedándose sin un dato que la otra sí muestra. */}
        <ResponsiveTable
          rows={filas}
          rowKey={(fila) => fila.sede.id}
          columns={[
            {
              key: "codigo",
              header: "Código",
              // **FR-AD-HOME-6** pide código y nombre, no solo el nombre.
              cell: (fila) => (
                <span className="pc-numeric text-text-secondary">{fila.sede.code}</span>
              ),
              hiddenOnCard: true,
            },
            {
              key: "sede",
              header: "Sede",
              // Cada fila lleva a la ficha de su sede (**FR-AD-HOME-6**).
              cell: (fila) => <EnlaceSede fila={fila} />,
              hiddenOnCard: true,
            },
            { key: "localidad", header: "Localidad", cell: (fila) => fila.sede.locality, hiddenOnCard: true },
            { key: "estado", header: "Estado", cell: (fila) => <EstadoSede sede={fila.sede} />, hiddenOnCard: true },
            { key: "cajas", header: "Cajas activas", cell: (fila) => fila.cajas, numeric: true },
            {
              key: "sinEquipo",
              header: "Sin equipo",
              cell: (fila) => fila.sinEquipo,
              numeric: true,
            },
            { key: "kioscos", header: "Kioscos", cell: (fila) => fila.kioscos, numeric: true },
            {
              key: "personal",
              header: "Trabajadores activos",
              cell: (fila) => fila.trabajadores,
              numeric: true,
            },
          ]}
          cardTitle={(fila) => <EnlaceSede fila={fila} />}
          cardSubtitle={(fila) => `${fila.sede.code} · ${fila.sede.locality}`}
          cardBadge={(fila) => <EstadoSede sede={fila.sede} />}
          empty={<p className="text-body text-text-secondary">No hay sedes que mostrar.</p>}
        />
      </Section>
    </>
  );
}

interface ResumenDeSede {
  sede: Sede;
  cajas: number;
  /** Cajas activas **sin equipo vinculado**: nadie puede iniciar sesión en ellas. */
  sinEquipo: number;
  kioscos: number;
  trabajadores: number;
}

function resumenDeSede(red: RedEnAlcance, sede: Sede): ResumenDeSede {
  const activas = red.cajasActivas(sede.id);
  return {
    sede,
    cajas: activas.length,
    /* **FR-AD-HOME-6** pide «cajas activas y cuántas sin equipo», y las dos
       salen del dominio: el equipo de una caja lo sabe este servidor desde el
       Paso 2. Lo que no sabe —jornada, turno, operaciones del día— es lo único
       que esta tabla sigue sin dar (**FR-AD-HOME-9**). */
    sinEquipo: activas.filter((caja) => !red.cajaTieneEquipo(caja.id)).length,
    kioscos: red.kioscos(sede.id).length,
    trabajadores: red.trabajadores(sede.id).filter((w) => w.status === "activo").length,
  };
}

function EnlaceSede({ fila }: { fila: ResumenDeSede }): React.JSX.Element {
  return (
    <Link
      /* Ruta dinámica: `typedRoutes` no puede comprobar un identificador que
         nace del dominio, así que se afirma igual que en el resto del producto. */
      href={`/admin/sedes/${fila.sede.id}` as Route}
      className="font-medium text-text-primary underline-offset-4 hover:underline"
    >
      {fila.sede.name}
    </Link>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warning";
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-caption uppercase tracking-wide text-text-secondary">{label}</p>
        <p
          className={
            tone === "warning" && value > 0
              ? "pc-numeric mt-2 text-screen-title text-warning-foreground"
              : "pc-numeric mt-2 text-screen-title text-text-primary"
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function AtencionItem({
  title,
  detail,
  href,
  action,
}: {
  title: string;
  detail: string;
  /* Literales y no `Route`: cada entrada del panel lleva a la pantalla donde
     se resuelve (**FR-AD-HOME-4**), y son pocas y conocidas. Enumerarlas deja
     que el compilador avise si alguna deja de existir. */
  href: "/admin/cajas" | "/admin/equipos" | "/admin/sedes";
  action: string;
}): React.JSX.Element {
  return (
    <li>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-start gap-3">
            <TriangleAlert
              className="mt-0.5 size-5 shrink-0 text-warning-foreground"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-body font-medium text-text-primary">{title}</p>
              <p className="mt-1 text-body-sm text-text-secondary">{detail}</p>
            </div>
          </div>

          {/* **FR-AD-HOME-4**: cada entrada lleva a donde se resuelve. */}
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1.5 self-start text-label font-medium text-primary underline-offset-4 hover:underline"
          >
            {action}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>
    </li>
  );
}

function EstadoSede({ sede }: { sede: Sede }): React.JSX.Element {
  if (sede.status === "activa") return <Badge variant="success">Activa</Badge>;
  if (sede.status === "suspendida") return <Badge variant="warning">Suspendida</Badge>;
  return <Badge variant="neutral">Cerrada</Badge>;
}

/**
 * **FR-AD-ACC-7** y **FR-AD-HOME-8**: un mercante al que PuntoCash todavía no
 * le ha asignado nada entra con normalidad. No se le enseñan métricas en cero
 * ni tablas vacías, que se leerían como un fallo del producto: se le explica.
 */
function SinSedes({ session }: { session: AdminSession }): React.JSX.Element {
  return (
    <>
      <PageHeader title={`Hola, ${session.firstName}`} />

      <Card>
        <CardContent className="px-6 py-12 text-center">
          <h2 className="text-section-title text-text-primary">Todavía no tienes sedes asignadas</h2>
          <p className="mx-auto mt-3 max-w-[34rem] text-body text-text-secondary">
            Cuando PuntoCash te asigne una sede, aparecerá aquí y podrás empezar a montarla: crear
            sus cajas, vincular sus equipos y dar de alta a tus trabajadores.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
