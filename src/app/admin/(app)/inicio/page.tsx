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
import { enHorario } from "@/features/network/horario";
import type { DiaDeSede, DiferenciaDelDia } from "@/features/network/jornadas";
import { TIPO_DE_SOLICITUD } from "@/features/network/aprobaciones";
import { antiguedad } from "../aprobaciones/formato";
import { diaEnCuba, fechaYHora, hora, jornadaDeCaja } from "../jornadas/formato";
import { JornadaCelda } from "../cajas/cajas-de-sede";

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
 * ── Lo que muestra ───────────────────────────────────────────────────────
 * Las métricas del día (**FR-AD-HOME-1**) son las que salen de las jornadas:
 * sedes operando —las que tienen al menos una caja con jornada abierta—, cajas
 * abiertas, trabajadores en turno, operaciones y aprobaciones pendientes. El
 * **volumen** no está aquí: por moneda son varias cifras, que en una tarjeta
 * de métrica se vuelven una lista; se consulta en Reportes.
 *
 * Una sede tiene varias cajas y cada una su jornada, así que la tabla por
 * sede **cuenta cajas** en vez de dar un único estado (**FR-AD-HOME-6**).
 */
export default async function AdminInicioPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  if (session.sedes.length === 0) return <SinSedes session={session} />;

  const sedes = sedesVisibles(session);
  /* La vista con alcance: las cifras de esta pantalla no pueden salir de una
     sede que no administra (`features/network/scoped-reads.ts`). */
  const red = redEnAlcance(session.scope);
  const ahora = new Date();
  const hoy = diaEnCuba(ahora);
  const filas = sedes.map((sede) => resumenDeSede(red, sede));

  const cajasActivas = filas.reduce((total, fila) => total + fila.cajas, 0);
  const cajasAbiertas = filas.reduce((total, fila) => total + fila.dia.abiertas, 0);
  /* Una sede con al menos una caja con jornada abierta está operando. */
  const sedesOperando = filas.filter((fila) => fila.dia.abiertas > 0).length;
  const enTurno = filas.reduce((total, fila) => total + fila.dia.enTurno.length, 0);
  const operacionesHoy = filas.reduce((total, fila) => total + fila.dia.operacionesHoy, 0);
  const sinCaja = filas.filter((fila) => fila.cajas === 0);
  /* Segunda prioridad de **FR-AD-HOME-2**, y por la misma razón que la
     primera: una caja sin equipo es una caja en la que nadie puede iniciar
     sesión (**FR-DEV-1**). Es el mismo cálculo con el que el menú pone su
     indicador en Equipos (**FR-AD-SHELL-3**), para que el aviso y el
     indicador no puedan contar cosas distintas. */
  const conCajasSinEquipo = filas.filter((fila) => fila.cajas > 0 && fila.sinEquipo > 0);
  const suspendidas = filas.filter((fila) => fila.sede.status === "suspendida");
  /* Una sucursal a medio montar: sin ninguna moneda no hay nada que operar, y
     con Cambio de moneda habilitado pero sin ninguna tasa, el tablero no
     cotiza nada (**FR-AD-HOME-2**). */
  const sinMoneda = filas.filter((fila) => fila.sede.status !== "cerrada" && red.monedas(fila.sede.id).length === 0);
  const cambioSinTasa = filas.filter(
    (fila) =>
      fila.sede.status !== "cerrada" &&
      fila.sede.services.includes("cambio-moneda") &&
      red.monedas(fila.sede.id).length > 0 &&
      red.tasas(fila.sede.id).length === 0,
  );
  /* **FR-AD-TASA-12**: PuntoCash movió un rango y el sistema llevó una tasa al
     límite. Opera, pero con una cifra que el mercante no eligió. */
  const fijadas = sedes.flatMap((sede) =>
    red
      .tasas(sede.id)
      .filter((t) => t.fijadaAlLimite)
      .map((t) => ({ sede, code: t.code })),
  );
  /* **FR-AD-TASA-15**: PuntoCash retiró el rango de una moneda y su tasa dejó
     de estar en vigor. No se borra —vuelve si el rango vuelve—, pero hoy el
     tablero no la muestra. */
  const sinRango = sedes.flatMap((sede) =>
    red
      .tasas(sede.id)
      .filter((t) => red.motivoSinCotizacion(sede.id, t.code) === "sin-rango")
      .map((t) => ({ sede, code: t.code })),
  );
  /* FR-AD-HOME-2, las de la operación del día. Una caja abierta fuera del
     horario de su sede es una caja que nadie cerró —incluye la que sigue
     abierta de un día anterior—; una sede en horario sin ninguna caja abierta
     es una sucursal que debería estar atendiendo y no lo está. */
  const fueraDeHorario = filas.flatMap((fila) =>
    fila.dia.cajas.flatMap((c) =>
      c.abierta && (!enHorario(fila.sede.horario, ahora) || diaEnCuba(c.abierta.openedAt) < hoy)
        ? [{ sede: fila.sede, jornada: c.abierta }]
        : [],
    ),
  );
  /* Las diferencias de cierre y de apertura esperan en Aprobaciones, así que
     aquí se cuentan allí; lo que queda son los cierres forzados que nadie ha
     vuelto a contar, que no son una solicitud de nadie. */
  const diferencias = filas.flatMap((fila) =>
    red
      .diferenciasDelDia(fila.sede.id)
      .filter((d) => d.momento === "sin-conciliar")
      .map((d) => ({ sede: fila.sede, d })),
  );
  /* FR-AD-HOME-1 y 2: las solicitudes que esperan visto bueno, la más antigua primero. */
  const pendientes = sedes
    .flatMap((sede) => red.solicitudes(sede.id).filter((x) => x.estado === "pendiente").map((x) => ({ sede, x })))
    .sort((a, b) => a.x.fechaHora.localeCompare(b.x.fechaHora));
  const sinAbrirEnHorario = filas.filter(
    (fila) =>
      fila.sede.status === "activa" &&
      fila.cajas - fila.sinEquipo > 0 &&
      fila.dia.abiertas === 0 &&
      enHorario(fila.sede.horario, ahora),
  );

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

      {/* FR-AD-HOME-1: las métricas del día que salen de las jornadas. */}
      <Section title="Hoy en tus sedes">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <Metric label="Sedes operando" value={`${sedesOperando} de ${sedes.length}`} />
          <Metric label="Cajas abiertas" value={`${cajasAbiertas} de ${cajasActivas}`} />
          <Metric label="Trabajadores en turno" value={enTurno} />
          <Metric label="Operaciones del día" value={operacionesHoy} />
          <Metric label="Aprobaciones pendientes" value={pendientes.length} tone={pendientes.length > 0 ? "warning" : "neutral"} />
        </div>
      </Section>

      {/* **FR-AD-HOME-5**: el panel no desaparece cuando no hay nada. Su
          ausencia y su vacío tienen que distinguirse a simple vista. */}
      <Section
        title="Requiere tu atención"
        description="Lo que impide que una sede opere encabeza siempre la lista."
      >
        {sinCaja.length === 0 &&
        conCajasSinEquipo.length === 0 &&
        suspendidas.length === 0 &&
        sinMoneda.length === 0 &&
        cambioSinTasa.length === 0 &&
        sinRango.length === 0 &&
        pendientes.length === 0 &&
        fueraDeHorario.length === 0 &&
        diferencias.length === 0 &&
        fijadas.length === 0 &&
        sinAbrirEnHorario.length === 0 ? (
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
                title={`${fila.sede.name} no tiene ninguna caja activa`}
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
                href={`/admin/sedes/${fila.sede.id}`}
                action="Ver la sede"
              />
            ))}
            {sinMoneda.map((fila) => (
              <AtencionItem
                key={`sin-moneda-${fila.sede.id}`}
                title={`${fila.sede.name} no tiene ninguna moneda en su lista`}
                detail="Sin monedas, sus cajas no pueden operar ni su tablero mostrar nada."
                href="/admin/monedas"
                action="Añadir monedas"
              />
            ))}
            {cambioSinTasa.map((fila) => (
              <AtencionItem
                key={`sin-tasa-${fila.sede.id}`}
                title={`${fila.sede.name} ofrece Cambio de moneda y no tiene ninguna tasa`}
                detail="Hasta que fijes al menos una, no puede comprar ni vender divisa y su tablero no cotiza nada."
                href={`/admin/tasas/${fila.sede.id}`}
                action="Fijar las tasas"
              />
            ))}
            {pendientes.length > 0 ? (
              <AtencionItem
                key="aprobaciones"
                title={
                  pendientes.length === 1
                    ? "Una solicitud espera tu aprobación"
                    : `${pendientes.length} solicitudes esperan tu aprobación`
                }
                detail={`La más antigua es de ${antiguedad(pendientes[0]!.x.fechaHora, ahora)}: ${TIPO_DE_SOLICITUD[pendientes[0]!.x.tipo].toLowerCase()} en ${pendientes[0]!.x.cajaNombre} de ${pendientes[0]!.sede.name}.`}
                href="/admin/aprobaciones"
                action="Revisarlas"
              />
            ) : null}
            {fueraDeHorario.map(({ sede, jornada }) => (
              <AtencionItem
                key={`fuera-${jornada.id}`}
                title={
                  diaEnCuba(jornada.openedAt) < hoy
                    ? `${jornada.cajaNombre} de ${sede.name} sigue abierta de un día anterior`
                    : `${jornada.cajaNombre} de ${sede.name} sigue abierta fuera de horario`
                }
                detail={`La abrió ${jornada.workerName} ${diaEnCuba(jornada.openedAt) === hoy ? `a las ${hora(jornada.openedAt)}` : `el ${fechaYHora(jornada.openedAt)}`}. Si nadie va a hacer su cierre, puedes forzarlo desde la jornada.`}
                href={`/admin/jornadas/${jornada.id}`}
                action="Ver la jornada"
              />
            ))}
            {diferencias.map(({ sede, d }) => (
              <AtencionItem
                key={`dif-${d.momento}-${d.jornada.id}`}
                {...textoDeDiferencia(d, sede)}
                href={`/admin/jornadas/${d.jornada.id}`}
                action="Ver la jornada"
              />
            ))}
            {fijadas.map((f) => (
              <AtencionItem
                key={`fijada-${f.sede.id}-${f.code}`}
                title={`PuntoCash ajustó la tasa del ${f.code} en ${f.sede.name}`}
                detail="Cambió el rango y la tasa se movió al nuevo límite sin que nadie de tu empresa la eligiera. Confírmala o elige otra."
                href={`/admin/tasas/${f.sede.id}`}
                action="Revisarla"
              />
            ))}
            {sinRango.map((f) => (
              <AtencionItem
                key={`sin-rango-${f.sede.id}-${f.code}`}
                title={`PuntoCash retiró el rango del ${f.code}: su tasa en ${f.sede.name} no está en vigor`}
                detail="La tasa se conserva y vuelve si el rango vuelve, pero mientras tanto esa moneda no se cotiza ni aparece en el tablero."
                href={`/admin/tasas/${f.sede.id}`}
                action="Ver las tasas"
              />
            ))}
            {sinAbrirEnHorario.map((fila) => (
              <AtencionItem
                key={`sin-abrir-${fila.sede.id}`}
                title={`${fila.sede.name} está en horario y no tiene ninguna caja abierta`}
                detail="Debería estar atendiendo, y ninguna de sus cajas ha abierto jornada."
                href={`/admin/sedes/${fila.sede.id}`}
                action="Ver la sede"
              />
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Estado por sede"
        description="Cada fila lleva a la ficha de su sede."
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
              key: "sede",
              header: "Sede",
              // Código y nombre, y la localidad debajo (**FR-AD-HOME-6**). Lleva a la ficha.
              cell: (fila) => (
                <span className="flex flex-col">
                  <EnlaceSede fila={fila} />
                  <span className="pc-numeric text-caption text-text-secondary">
                    {fila.sede.code} · {fila.sede.locality}
                  </span>
                </span>
              ),
              hiddenOnCard: true,
            },
            { key: "estado", header: "Estado", cell: (fila) => <EstadoSede sede={fila.sede} />, hiddenOnCard: true },
            {
              key: "cajas",
              header: "Cajas",
              cell: (fila) => (
                <span className="flex flex-col">
                  <span className="pc-numeric">{fila.cajas}</span>
                  {fila.sinEquipo > 0 ? (
                    <span className="whitespace-nowrap text-caption text-warning-foreground">{fila.sinEquipo} sin equipo</span>
                  ) : null}
                </span>
              ),
            },
            { key: "kioscos", header: "Kioscos", cell: (fila) => fila.kioscos, numeric: true },
            { key: "personal", header: "Trabajadores", cell: (fila) => fila.trabajadores, numeric: true },
            {
              key: "jornada",
              header: "Jornada",
              cell: (fila) =>
                fila.cajas === 0 ? (
                  <span className="text-text-secondary">—</span>
                ) : fila.dia.abiertas === 0 ? (
                  <span className="text-text-secondary">Ninguna caja abierta</span>
                ) : (
                  <span className="flex flex-col">
                    <span className="font-semibold text-text-primary">
                      {fila.dia.abiertas} de {fila.cajas} abiertas
                    </span>
                    {fila.dia.primeraApertura ? (
                      <span className="text-caption text-text-secondary">primera a las {hora(fila.dia.primeraApertura)}</span>
                    ) : null}
                  </span>
                ),
            },
            {
              key: "turno",
              header: "En turno",
              cell: (fila) =>
                fila.dia.enTurno.length === 0 ? (
                  <span className="text-text-secondary">—</span>
                ) : (
                  <span className="flex flex-col">
                    {fila.dia.enTurno.map((t) => (
                      <span key={t.workerId} className="whitespace-nowrap">{t.nombre}</span>
                    ))}
                  </span>
                ),
            },
            { key: "ops", header: "Operaciones hoy", cell: (fila) => fila.dia.operacionesHoy, numeric: true },
          ]}
          cardTitle={(fila) => <EnlaceSede fila={fila} />}
          cardSubtitle={(fila) => `${fila.sede.code} · ${fila.sede.locality}`}
          cardBadge={(fila) => <EstadoSede sede={fila.sede} />}
          empty={<p className="text-body text-text-secondary">No hay sedes que mostrar.</p>}
        />
      </Section>

      {/* **FR-AD-HOME-7**: con una sede elegida, la tabla se amplía con el
          detalle de sus cajas y sus equipos. */}
      {session.selected ? <DetalleDeSede red={red} sede={session.selected} hoy={hoy} /> : null}
    </>
  );
}

function DetalleDeSede({ red, sede, hoy }: { red: RedEnAlcance; sede: Sede; hoy: string }): React.JSX.Element {
  const cajas = red.cajasActivas(sede.id).map((caja) => {
    const equipo = red.equipoDeCaja(caja.id);
    return {
      id: caja.id,
      nombre: caja.name,
      equipo: equipo ? { id: equipo.id, label: equipo.label } : null,
      jornada: jornadaDeCaja(red.jornadaAbiertaDeCaja(caja.id), hoy),
    };
  });
  const kioscos = red.kioscos(sede.id);
  return (
    <Section title={`Cajas y equipos de ${sede.name}`} description="Cada caja con su equipo y su jornada de hoy.">
      <ResponsiveTable
        rows={cajas}
        rowKey={(c) => c.id}
        columns={[
          { key: "caja", header: "Caja", cell: (c) => <span className="font-medium text-text-primary">{c.nombre}</span>, hiddenOnCard: true },
          {
            key: "equipo",
            header: "Equipo",
            cell: (c) =>
              c.equipo ? (
                <span className="flex flex-col">
                  <span>{c.equipo.label}</span>
                  <span className="pc-numeric text-caption text-text-secondary">{c.equipo.id}</span>
                </span>
              ) : (
                <span className="text-warning-foreground">Sin equipo vinculado</span>
              ),
          },
          { key: "jornada", header: "Jornada", cell: (c) => <JornadaCelda caja={c} /> },
        ]}
        cardTitle={(c) => c.nombre}
        empty={
          <p className="text-body text-text-secondary">
            Esta sede no tiene ninguna caja activa.{" "}
            <Link href="/admin/cajas" className="font-semibold text-primary underline underline-offset-4">
              Ir a Cajas
            </Link>
          </p>
        }
      />
      <p className="mt-4 text-body-sm text-text-secondary">
        {kioscos.length === 0
          ? "Sin kioscos de autoservicio vinculados."
          : `Kioscos vinculados: ${kioscos.map((k) => `${k.label} (${k.id})`).join(", ")}.`}
      </p>
    </Section>
  );
}

interface ResumenDeSede {
  sede: Sede;
  cajas: number;
  /** Cajas activas **sin equipo vinculado**: nadie puede iniciar sesión en ellas. */
  sinEquipo: number;
  kioscos: number;
  trabajadores: number;
  dia: DiaDeSede;
}

function resumenDeSede(red: RedEnAlcance, sede: Sede): ResumenDeSede {
  const activas = red.cajasActivas(sede.id);
  return {
    sede,
    cajas: activas.length,
    /* **FR-AD-HOME-6** pide «cajas activas y cuántas sin equipo». */
    sinEquipo: activas.filter((caja) => !red.cajaTieneEquipo(caja.id)).length,
    kioscos: red.kioscos(sede.id).length,
    trabajadores: red.trabajadores(sede.id).filter((w) => w.status === "activo").length,
    dia: red.diaDeSede(sede.id) ?? { cajas: [], abiertas: 0, enTurno: [], primeraApertura: null, operacionesHoy: 0 },
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
  value: number | string;
  tone?: "neutral" | "warning";
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-caption uppercase tracking-wide text-text-secondary">{label}</p>
        <p
          className={
            tone === "warning" && typeof value === "number" && value > 0
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
  href:
    | "/admin/cajas"
    | "/admin/equipos"
    | "/admin/monedas"
    | "/admin/aprobaciones"
    | `/admin/tasas/${string}`
    | `/admin/jornadas/${string}`
    | `/admin/sedes/${string}`;
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
            href={href as Route}
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

/** Un cierre forzado que nadie ha vuelto a contar (**FR-AD-JOR-20**). Las diferencias de cierre y de apertura están en Aprobaciones. */
function textoDeDiferencia(d: DiferenciaDelDia, sede: Sede): { title: string; detail: string } {
  return {
    title: `Cierre forzado sin contar en ${d.jornada.cajaNombre} de ${sede.name}`,
    detail: "Nadie ha contado el efectivo desde el cierre. El primer conteo será el de quien abra la próxima jornada.",
  };
}
