"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";

import { Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import { OperationStatusBadge, OPERATION_STATUSES, type OperationStatus } from "@/components/patterns/operation-status-badge";
import { SERVICIOS_DE_RED } from "@/features/network/operaciones";
import { useHydrated } from "@/lib/use-hydrated";
import { useFiltrosEnUrl } from "@/lib/filtros-en-url";
import { SELECT, TODAS } from "../equipos/controles";

/**
 * Las operaciones de toda la red.
 *
 * Mismos filtros que en la consola del mercante más **operador**, y la
 * ventana de fechas obligatoria por la misma razón que en Jornadas: la red
 * entera no cabe en una pantalla sin acotar.
 *
 * La columna de operador dice **quién administraba la sede ese día**. Si hoy
 * la administra otro, aquí sigue apareciendo el de entonces: es con él con
 * quien se concilia esa operación.
 *
 * **El cliente tiene columna propia, con su documento debajo.** No es un
 * dato que solo interese a quien lo atendió: hay servicios por llegar que
 * exigen que la persona tenga contrato con PuntoCash, y podrá usarlos desde
 * cualquier sede, la administre quien la administre. O sea, el cliente será
 * de PuntoCash aunque el mostrador no lo sea. Hasta que exista ese dominio
 * de clientes, esta columna es la trazabilidad que hay: quién hizo cada
 * operación, identificado por su documento y no solo por un nombre que
 * puede repetirse.
 */

export interface OperacionDeRedRow {
  codigo: string;
  /** «AAAA-MM-DD» en Cuba, para el filtro de fechas. */
  dia: string;
  /** Ya formateada en el servidor. */
  fecha: string;
  fechaHora: string;
  sedeId: string;
  sede: string;
  operadorId: string | null;
  operador: string | null;
  caja: string;
  workerId: string;
  trabajador: string;
  servicio: string;
  /** En un giro, si se envió o se pagó. */
  accion: string | null;
  cliente: string;
  documento: string;
  /** En un cambio, lo que entrega y lo que recibe; en lo demás, solo el importe. */
  importe: { entrega: string; recibe: string | null };
  estado: OperationStatus;
  desdeKiosco: boolean;
}

const BUSCAR: FieldSpec = { id: "sa-ops-buscar", label: "Buscar" };
const DESDE: FieldSpec = { id: "sa-ops-desde", label: "Desde" };
const HASTA: FieldSpec = { id: "sa-ops-hasta", label: "Hasta" };
const OPERADOR: FieldSpec = { id: "sa-ops-operador", label: "Operador" };
const SEDE: FieldSpec = { id: "sa-ops-sede", label: "Sede" };
const SERVICIO: FieldSpec = { id: "sa-ops-servicio", label: "Servicio" };
const ESTADO: FieldSpec = { id: "sa-ops-estado", label: "Estado" };

export function OperacionesDeRedList({
  rows,
  inicial = {},
  desdePorDefecto,
  hoy,
}: {
  rows: readonly OperacionDeRedRow[];
  inicial?: Record<string, string | undefined>;
  desdePorDefecto: string;
  hoy: string;
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [texto, setTexto] = React.useState(inicial.texto ?? "");
  const [desde, setDesde] = React.useState(inicial.desde ?? desdePorDefecto);
  const [hasta, setHasta] = React.useState(inicial.hasta ?? hoy);
  const [operador, setOperador] = React.useState(inicial.operador ?? TODAS);
  const [sede, setSede] = React.useState(inicial.sede ?? TODAS);
  const [servicio, setServicio] = React.useState(inicial.servicio ?? TODAS);
  const [estado, setEstado] = React.useState(inicial.estado ?? TODAS);
  useFiltrosEnUrl(
    { texto, desde, hasta, operador, sede, servicio, estado },
    { operador: TODAS, sede: TODAS, servicio: TODAS, estado: TODAS, desde: desdePorDefecto, hasta: hoy },
  );

  const operadores = React.useMemo(() => {
    const vistos = new Map<string, string>();
    for (const r of rows) if (r.operadorId && r.operador) vistos.set(r.operadorId, r.operador);
    return [...vistos].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [rows]);
  const sedes = React.useMemo(() => {
    const vistos = new Map<string, string>();
    for (const r of rows) vistos.set(r.sedeId, r.sede);
    return [...vistos].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [rows]);

  const busqueda = texto.trim().toLowerCase();
  const visibles = rows.filter(
    (r) =>
      r.dia >= desde &&
      r.dia <= hasta &&
      (operador === TODAS || r.operadorId === operador) &&
      (sede === TODAS || r.sedeId === sede) &&
      (servicio === TODAS || r.servicio === servicio) &&
      (estado === TODAS || r.estado === estado) &&
      (!busqueda ||
        r.codigo.toLowerCase().includes(busqueda) ||
        r.cliente.toLowerCase().includes(busqueda) ||
        r.documento.toLowerCase().includes(busqueda)),
  );

  const columnas: readonly ResponsiveColumn<OperacionDeRedRow>[] = [
    {
      /* El estado va aquí, junto al código, y no en columna propia: con siete
         datos por fila una columna más estrecha el resto hasta que la razón
         social de un operador ocupa cuatro líneas a 1280. Casi todas las
         operaciones están completadas, así que lo que importa del estado es
         verlo cuando no lo está, y eso una insignia junto al código lo hace
         igual de bien. */
      key: "operacion",
      header: "Operación",
      hiddenOnCard: true,
      cell: (r) => (
        <span className="flex flex-col items-start gap-1">
          <span className="pc-numeric whitespace-nowrap font-semibold text-text-primary">{r.codigo}</span>
          <span className="pc-numeric whitespace-nowrap text-caption text-text-secondary">{r.fecha}</span>
          <OperationStatusBadge status={r.estado} />
        </span>
      ),
    },
    {
      key: "servicio",
      header: "Servicio",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="xl:whitespace-nowrap">{r.servicio}</span>
          {r.accion || r.desdeKiosco ? (
            <span className="text-caption text-text-secondary xl:whitespace-nowrap">
              {[r.accion, r.desdeKiosco ? "desde el kiosco" : null].filter(Boolean).join(" · ")}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "cliente",
      header: "Cliente",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="text-text-primary">{r.cliente}</span>
          <span className="pc-numeric text-caption text-text-secondary">{r.documento}</span>
        </span>
      ),
    },
    {
      key: "importe",
      header: "Importe",
      /* El cambio se parte en dos líneas a propósito, no por desbordamiento:
         así se lee igual a 1280 que a 1440, y las cifras quedan alineadas. */
      cell: (r) => (
        <span className="flex flex-col">
          <span className="pc-numeric whitespace-nowrap">{r.importe.entrega}</span>
          {r.importe.recibe ? (
            <span className="pc-numeric whitespace-nowrap text-text-secondary">→ {r.importe.recibe}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "donde",
      header: "Sede y operador",
      /* Una línea cada uno, cortando con puntos suspensivos y el nombre
         entero en el `title`. Sin esto, una razón social como «Malecón
         Servicios Financieros S.R.L.» ocupa cuatro líneas a 1280 y estira
         toda la fila. El nombre completo está en el desplegable de operador,
         en el detalle y a un clic en su ficha. */
      cell: (r) => (
        <span className="flex min-w-0 flex-col xl:max-w-44 min-[1400px]:max-w-72">
          <Link
            href={`/super-admin/sedes/${r.sedeId}` as Route}
            title={r.sede}
            className="relative z-10 text-text-primary underline-offset-4 hover:underline xl:truncate"
          >
            {r.sede}
          </Link>
          {r.operadorId ? (
            <Link
              href={`/super-admin/operadores/${r.operadorId}` as Route}
              title={r.operador ?? undefined}
              className="relative z-10 text-caption text-text-secondary underline-offset-4 hover:text-text-primary hover:underline xl:truncate"
            >
              {r.operador}
            </Link>
          ) : (
            <span className="text-caption text-text-secondary">Sin operador ese día</span>
          )}
        </span>
      ),
    },
    {
      /* Sin la caja: en esta consola la unidad es la sede, no el mostrador.
         Igual que el listado de trabajadores, que tampoco la lleva. La caja
         está en el detalle de la operación y en Jornadas, donde sí es la
         unidad, y aquí deja sitio para el cliente y el operador. */
      key: "quien",
      header: "Trabajador",
      cell: (r) => (
        <Link
          href={`/super-admin/trabajadores/${r.workerId}` as Route}
          className="relative z-10 w-fit text-text-primary underline underline-offset-4 hover:text-primary"
        >
          {r.trabajador}
        </Link>
      ),
    },
  ];

  return (
    <>
      <div className="mb-6 flex flex-col gap-4">
        <Field {...BUSCAR} className="sm:max-w-md">
          <Input
            {...fieldAria(BUSCAR)}
            type="search"
            disabled={!hydrated}
            value={texto}
            onChange={(e) => setTexto(e.currentTarget.value)}
            placeholder="Código, cliente o documento"
            prefix={<Search className="size-[18px]" aria-hidden="true" />}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field {...DESDE}>
            <Input {...fieldAria(DESDE)} type="date" disabled={!hydrated} value={desde} max={hasta} onChange={(e) => setDesde(e.currentTarget.value)} />
          </Field>
          <Field {...HASTA}>
            <Input {...fieldAria(HASTA)} type="date" disabled={!hydrated} value={hasta} min={desde} onChange={(e) => setHasta(e.currentTarget.value)} />
          </Field>
          <Field {...OPERADOR}>
            <select {...fieldAria(OPERADOR)} disabled={!hydrated} value={operador} onChange={(e) => setOperador(e.currentTarget.value)} className={SELECT}>
              <option value={TODAS}>Todos los operadores</option>
              {operadores.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field {...SEDE}>
            <select {...fieldAria(SEDE)} disabled={!hydrated} value={sede} onChange={(e) => setSede(e.currentTarget.value)} className={SELECT}>
              <option value={TODAS}>Todas las sedes</option>
              {sedes.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field {...SERVICIO}>
            <select {...fieldAria(SERVICIO)} disabled={!hydrated} value={servicio} onChange={(e) => setServicio(e.currentTarget.value)} className={SELECT}>
              <option value={TODAS}>Todos los servicios</option>
              {SERVICIOS_DE_RED.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field {...ESTADO}>
            <select {...fieldAria(ESTADO)} disabled={!hydrated} value={estado} onChange={(e) => setEstado(e.currentTarget.value)} className={SELECT}>
              <option value={TODAS}>Todos los estados</option>
              {OPERATION_STATUSES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <p className="text-body-sm text-text-secondary sm:ml-auto" aria-live="polite">
          {visibles.length === 1 ? "1 operación" : `${visibles.length} operaciones`} en el periodo
        </p>
      </div>

      <ResponsiveTable
        rows={visibles}
        columns={columnas}
        rowKey={(r) => r.codigo}
        tablaDesde="xl"
        tarjetasEnDosColumnas
        rowLink={(r) => ({ href: `/super-admin/operaciones/${r.codigo}`, label: `Ver la operación ${r.codigo}` })}
        cardTitle={(r) => <span className="pc-numeric font-semibold text-text-primary">{r.codigo}</span>}
        cardSubtitle={(r) => `${r.fecha} · ${r.sede}`}
        cardBadge={(r) => <OperationStatusBadge status={r.estado} />}
        empty={<p className="text-body text-text-primary">Ninguna operación coincide con estos filtros.</p>}
      />
    </>
  );
}
