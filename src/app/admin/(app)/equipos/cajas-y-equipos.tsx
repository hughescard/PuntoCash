"use client";

import * as React from "react";
import Link from "next/link";
import { MonitorSmartphone, Unlink } from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import { useHydrated } from "@/lib/use-hydrated";
import { desvincularEquipoAction, type ResultadoAccion } from "./_actions";

/**
 * Las cajas del alcance y el equipo de cada una — **FR-AD-EQ-5** y
 * **FR-AD-EQ-6**.
 *
 * Las filas llegan **ya formateadas desde el servidor**: aquí no se convierte
 * ninguna fecha. Formatear en el cliente una fecha que el servidor ya pintó
 * produce un desajuste de hidratación en cuanto las zonas horarias no
 * coinciden, y es un fallo que no se ve en la máquina de quien lo escribe.
 *
 * El orden lo decide el servidor y tampoco se toca aquí: **las cajas sin
 * equipo van primero** porque son el punto de la pantalla y no un detalle
 * (**FR-AD-EQ-6**) — una caja sin equipo es una caja en la que nadie puede
 * iniciar sesión.
 */

export interface CajaEquipoRow {
  /** La caja es la fila; el equipo puede faltar. */
  id: string;
  sede: string;
  caja: string;
  equipo: {
    id: string;
    label: string;
    /** Ya formateadas por el servidor. */
    vinculadoEl: string;
    por: string;
    ultimaActividad: string | null;
  } | null;
}

export function CajasYEquipos({ filas }: { filas: readonly CajaEquipoRow[] }): React.JSX.Element {
  const [desvinculando, setDesvinculando] = React.useState<CajaEquipoRow | null>(null);

  const columnas: readonly ResponsiveColumn<CajaEquipoRow>[] = [
    { key: "sede", header: "Sede", cell: (fila) => fila.sede, hiddenOnCard: true },
    {
      key: "caja",
      header: "Caja",
      cell: (fila) => <span className="font-medium text-text-primary">{fila.caja}</span>,
      hiddenOnCard: true,
    },
    {
      key: "equipo",
      header: "Equipo",
      cell: (fila) =>
        fila.equipo ? (
          <span className="flex min-w-0 flex-col">
            <span className="flex items-center gap-2">
              <MonitorSmartphone className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{fila.equipo.label}</span>
            </span>
            {/* **FR-AD-EQ-5** pide el identificador, no solo el rótulo: es el
                dato por el que se reconoce un equipo cuando hay dos iguales en
                la misma sala. */}
            <span className="pc-numeric text-caption text-text-secondary">{fila.equipo.id}</span>
          </span>
        ) : (
          <span className="text-warning-foreground">Sin equipo vinculado</span>
        ),
    },
    {
      key: "vinculado",
      header: "Vinculado",
      cell: (fila) =>
        fila.equipo ? (
          <span className="flex min-w-0 flex-col">
            <span>{fila.equipo.vinculadoEl}</span>
            <span className="truncate text-caption text-text-secondary">por {fila.equipo.por}</span>
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "actividad",
      header: "Última actividad",
      cell: (fila) => fila.equipo?.ultimaActividad ?? "—",
    },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      cell: (fila) => <Acciones fila={fila} onDesvincular={setDesvinculando} />,
      hiddenOnCard: true,
    },
  ];

  return (
    <>
      <ResponsiveTable
        rows={filas}
        columns={columnas}
        rowKey={(fila) => fila.id}
        cardTitle={(fila) => fila.caja}
        cardSubtitle={(fila) => fila.sede}
        cardBadge={(fila) => <EstadoVinculo fila={fila} />}
        cardFooter={(fila) => <Acciones fila={fila} onDesvincular={setDesvinculando} />}
        empty={
          <p className="text-body text-text-secondary">
            Ninguna de tus sedes tiene cajas todavía. Créalas en Cajas y después vincula sus equipos.
          </p>
        }
      />

      {desvinculando?.equipo ? (
        <DialogoDesvincular
          caja={desvinculando.caja}
          equipo={desvinculando.equipo}
          onCerrar={() => setDesvinculando(null)}
        />
      ) : null}
    </>
  );
}

function EstadoVinculo({ fila }: { fila: CajaEquipoRow }): React.JSX.Element {
  return fila.equipo ? (
    <Badge variant="success">Vinculada</Badge>
  ) : (
    <Badge variant="warning">Sin equipo</Badge>
  );
}

function Acciones({
  fila,
  onDesvincular,
}: {
  fila: CajaEquipoRow;
  onDesvincular: (fila: CajaEquipoRow) => void;
}): React.JSX.Element {
  /* Abre un diálogo, así que antes de hidratar no hace nada: el servidor lo
     pinta y React todavía no escucha. Queda cerrado hasta entonces, por la
     misma regla que el botón de acceso y el buscador de Nueva operación — no
     se ofrece un control antes de que funcione (`lib/use-hydrated.ts`). */
  const hydrated = useHydrated();

  /* Una caja sin equipo no ofrece «desvincular», ofrece vincular: es la única
     acción que la saca de donde está (**FR-AD-EQ-6**). Y eso es un enlace, que
     funciona desde el primer pintado. */
  return fila.equipo ? (
    <Button variant="tertiary" size="sm" disabled={!hydrated} onClick={() => onDesvincular(fila)}>
      <Unlink aria-hidden="true" />
      Desvincular
    </Button>
  ) : (
    <Button variant="secondary" size="sm" asChild>
      <Link href="/admin/equipos/vincular">Vincular un equipo</Link>
    </Button>
  );
}

/**
 * La confirmación de **FR-AD-EQ-9**, **FR-AD-EQ-10** y **FR-AD-EQ-11**.
 *
 * Dice con todas sus letras lo que va a pasar, lo que **no** va a pasar, y
 * pone a mano la alternativa. Las tres cosas importan y ninguna es relleno:
 *
 *   · El equipo vuelve a su pantalla de vinculación al instante, y si hay un
 *     trabajador con sesión iniciada, su sesión termina.
 *   · **La jornada no se cierra.** Es lo que FR-DEV-7 dejó explícitamente a
 *     este documento, y la razón de que la acción se permita: a veces se
 *     desvincula precisamente porque el equipo se averió.
 *   · Si prefiere no dejar la caja sin equipo, el cierre forzado de la jornada
 *     está a un enlace — pero no se ejecuta por él (**FR-AD-EQ-11**).
 *
 * Lo que esta pantalla **no** afirma es si esa caja tiene ahora mismo una
 * jornada abierta: no se conoce para toda la red (ver
 * `features/admin/register-guards.ts`). Así que el aviso se da siempre, en vez
 * de darse solo cuando toca y callarse cuando no se sabe — que es lo que
 * convertiría un desconocimiento en una afirmación.
 */
function DialogoDesvincular({
  caja,
  equipo,
  onCerrar,
}: {
  caja: string;
  equipo: NonNullable<CajaEquipoRow["equipo"]>;
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccion, FormData>(
    desvincularEquipoAction,
    null,
  );

  const hecho = estado?.ok === true;

  return (
    <Dialog open onOpenChange={(abierto) => (abierto ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Desvincular el equipo de {caja}</DialogTitle>
          <DialogDescription>
            {equipo.label} dejará de ser {caja}. Volverá a su pantalla de vinculación al instante, y si
            hay un trabajador con sesión iniciada en él, su sesión termina: lo que tuviera a medias sin
            confirmar se descarta, y lo ya confirmado se conserva.
          </DialogDescription>
        </DialogHeader>

        {hecho ? (
          <>
            <DialogBody>
              <Alert variant="success" title="Equipo desvinculado">
                {estado.mensaje}
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form action={accion}>
            <input type="hidden" name="equipo" value={equipo.id} />

            <DialogBody className="flex flex-col gap-4">
              {estado && !estado.ok ? (
                <Alert variant="error" title="No se pudo desvincular">
                  {estado.error}
                </Alert>
              ) : null}

              <Alert variant="warning" title="Desvincular no cierra la jornada">
                Si {caja} tiene una jornada abierta, seguirá abierta hasta su arqueo y cierre, y para
                hacerlo habrá que vincular un equipo a esa caja.
              </Alert>

              <p className="text-body-sm text-text-secondary">
                Si prefieres no dejarla sin equipo, puedes forzar el cierre de su jornada desde{" "}
                <Link href="/admin/jornadas" className="font-semibold text-primary underline underline-offset-4">
                  Jornadas
                </Link>{" "}
                antes de desvincular.
              </p>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" loading={enviando}>
                {enviando ? null : <Unlink aria-hidden="true" />}
                Desvincular equipo
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
