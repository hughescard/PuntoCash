"use client";

import * as React from "react";
import { MonitorSmartphone, Unlink } from "lucide-react";

import {
  Alert,
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
import {
  BotonEditarEtiqueta,
  DialogoEtiqueta,
  type EquipoRenombrable,
} from "./etiqueta-de-equipo";

/**
 * Los kioscos de autoservicio del alcance — **FR-AD-EQ-12** a **FR-AD-EQ-16**.
 *
 * ── Por qué esta lista no se agrupa por sede y la de Cajas sí ─────────────
 * Porque las dos contestan preguntas distintas. En Cajas, una sede **sin
 * ninguna caja** es el estado que hay que ver —**FR-AD-CAJA-3** lo exige, y una
 * tabla plana no puede decir nada de una sede que no tiene filas—. Aquí se
 * listan los kioscos **vinculados**, y una sede sin kioscos no afirma nada que
 * haya que corregir: un kiosco es opcional, una caja no.
 *
 * Las filas llegan ya formateadas del servidor, por lo mismo que en la otra
 * pestaña: formatear fechas en el cliente desajusta la hidratación en cuanto
 * las zonas horarias no coinciden.
 */

export interface KioscoRow {
  id: string;
  sede: string;
  label: string;
  /** Ya formateadas por el servidor. */
  vinculadoEl: string;
  por: string;
  ultimaActividad: string | null;
}

export function KioscosDeSede({ filas }: { filas: readonly KioscoRow[] }): React.JSX.Element {
  const [desvinculando, setDesvinculando] = React.useState<KioscoRow | null>(null);
  const [renombrando, setRenombrando] = React.useState<EquipoRenombrable | null>(null);

  const columnas: readonly ResponsiveColumn<KioscoRow>[] = [
    { key: "sede", header: "Sede", cell: (fila) => fila.sede, hiddenOnCard: true },
    {
      key: "kiosco",
      header: "Kiosco",
      cell: (fila) => (
        <span className="flex min-w-0 flex-col">
          <span className="flex items-center gap-2">
            <MonitorSmartphone className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate font-medium text-text-primary">{fila.label}</span>
          </span>
          {/* **FR-AD-EQ-12** pide el identificador: es por lo que se reconoce
              un equipo cuando hay dos en la misma sala, que aquí es el caso
              normal y no la excepción (**FR-AD-EQ-14**). */}
          <span className="pc-numeric text-caption text-text-secondary">{fila.id}</span>
        </span>
      ),
      hiddenOnCard: true,
    },
    {
      key: "vinculado",
      header: "Vinculado",
      cell: (fila) => (
        <span className="flex min-w-0 flex-col">
          <span>{fila.vinculadoEl}</span>
          <span className="truncate text-caption text-text-secondary">por {fila.por}</span>
        </span>
      ),
    },
    { key: "actividad", header: "Última actividad", cell: (fila) => fila.ultimaActividad ?? "—" },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      cell: (fila) => (
        <Acciones fila={fila} onDesvincular={setDesvinculando} onRenombrar={setRenombrando} />
      ),
      hiddenOnCard: true,
    },
  ];

  return (
    <>
      <ResponsiveTable
        rows={filas}
        columns={columnas}
        rowKey={(fila) => fila.id}
        cardTitle={(fila) => fila.label}
        cardSubtitle={(fila) => `${fila.id} · ${fila.sede}`}
        cardFooter={(fila) => (
          <Acciones fila={fila} onDesvincular={setDesvinculando} onRenombrar={setRenombrando} />
        )}
        empty={
          <p className="text-body text-text-secondary">
            Ninguna de tus sedes tiene kioscos vinculados. Un kiosco prepara solicitudes que después
            resuelve un trabajador en el mostrador.
          </p>
        }
      />

      {desvinculando ? (
        <DialogoDesvincular kiosco={desvinculando} onCerrar={() => setDesvinculando(null)} />
      ) : null}

      {renombrando ? (
        <DialogoEtiqueta equipo={renombrando} onCerrar={() => setRenombrando(null)} />
      ) : null}
    </>
  );
}

function Acciones({
  fila,
  onDesvincular,
  onRenombrar,
}: {
  fila: KioscoRow;
  onDesvincular: (fila: KioscoRow) => void;
  onRenombrar: (equipo: EquipoRenombrable) => void;
}): React.JSX.Element {
  /* Abren diálogos: cerrados hasta que hidrata, por la misma regla que el
     resto de los controles de cliente (`lib/use-hydrated.ts`). */
  const hydrated = useHydrated();

  return (
    <span className="flex flex-wrap items-center gap-1">
      <BotonEditarEtiqueta equipo={fila} onElegir={onRenombrar} />
      <Button variant="tertiary" size="sm" disabled={!hydrated} onClick={() => onDesvincular(fila)}>
        <Unlink aria-hidden="true" />
        Desvincular
      </Button>
    </span>
  );
}

/**
 * La confirmación de **FR-AD-EQ-15** y **FR-AD-EQ-16**.
 *
 * Dice lo que ocurre —el kiosco pierde su sesión al instante, descarta sin
 * generar código lo que un cliente estuviera preparando, y vuelve a su
 * pantalla de vinculación con su aviso— y, lo que importa igual, **lo que no
 * ocurre**: las solicitudes ya generadas no se ven afectadas y siguen siendo
 * válidas en caja. Eso segundo no es relleno: es lo que evita una llamada de
 * alguien con un papel en la mano.
 *
 * No pide motivo, a diferencia de retirar una caja: **FR-AD-EQ-15** pide
 * confirmación, y un campo de texto obligatorio donde el requisito no lo exige
 * es fricción que acaba rellenándose con un punto.
 */
function DialogoDesvincular({
  kiosco,
  onCerrar,
}: {
  kiosco: KioscoRow;
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
          <DialogTitle>Desvincular {kiosco.label}</DialogTitle>
          <DialogDescription>
            Dejará de pertenecer a {kiosco.sede}. Pierde su sesión al instante: si un cliente estaba
            preparando una solicitud, se descarta sin generar ningún código, y el kiosco vuelve a su
            pantalla de vinculación.
          </DialogDescription>
        </DialogHeader>

        {hecho ? (
          <>
            <DialogBody>
              <Alert variant="success" title="Kiosco desvinculado">
                {estado.mensaje}
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form action={accion}>
            <input type="hidden" name="equipo" value={kiosco.id} />

            <DialogBody className="flex flex-col gap-4">
              {estado && !estado.ok ? (
                <Alert variant="error" title="No se pudo desvincular">
                  {estado.error}
                </Alert>
              ) : null}

              <Alert variant="info" title="Las solicitudes ya generadas no se ven afectadas">
                Los códigos que este kiosco entregó siguen siendo válidos en caja. Desvincularlo no
                cancela ninguna solicitud.
              </Alert>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" loading={enviando}>
                {enviando ? null : <Unlink aria-hidden="true" />}
                Desvincular kiosco
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
