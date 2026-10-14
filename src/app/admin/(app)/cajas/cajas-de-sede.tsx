"use client";

import * as React from "react";
import { MonitorSmartphone, RotateCcw, TriangleAlert } from "lucide-react";

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
  Field,
  fieldAria,
  Input,
  type FieldSpec,
} from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import { useHydrated } from "@/lib/use-hydrated";
import { MOTIVO_MIN_LENGTH } from "@/features/network/sedes";
import { reactivarCajaAction, retirarCajaAction, type ResultadoAccion } from "./_actions";

/**
 * Las cajas de una sede, con sus dos acciones — **FR-AD-CAJA-8 a 13**.
 *
 * La fila la escribe el servidor y llega ya formateada: aquí no se convierte
 * ninguna fecha. Es deliberado — formatear en el cliente una fecha que el
 * servidor ya pintó produce un desajuste de hidratación en cuanto las zonas
 * horarias no coinciden.
 *
 * Retirar y reactivar piden confirmación en un diálogo que resume qué va a
 * pasar (**FR-AD-STATE-3**), y el rechazo del dominio se lee dentro del mismo
 * diálogo: quien lo provoca está ahí, y mandarlo a buscar el motivo a otra
 * parte de la pantalla sería perderlo.
 */

export interface CajaRow {
  id: string;
  name: string;
  status: "activa" | "retirada";
  equipo: { id: string; label: string } | null;
  /** Ya formateada por el servidor. */
  alta: string;
  motivoRetirada?: string;
}

type Accion = { tipo: "retirar" | "reactivar"; caja: CajaRow };

export function CajasDeSede({ cajas }: { cajas: readonly CajaRow[] }): React.JSX.Element {
  const [accion, setAccion] = React.useState<Accion | null>(null);

  const columnas: readonly ResponsiveColumn<CajaRow>[] = [
    {
      key: "caja",
      header: "Caja",
      cell: (caja) => <span className="font-medium text-text-primary">{caja.name}</span>,
      hiddenOnCard: true,
    },
    {
      key: "equipo",
      header: "Equipo",
      cell: (caja) =>
        caja.equipo ? (
          <span className="inline-flex items-center gap-2">
            <MonitorSmartphone className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{caja.equipo.label}</span>
          </span>
        ) : (
          /* Es la situación que impide operar, así que se dice, no se deja en
             blanco (**FR-AD-CAJA-2**). */
          <span className="text-warning-foreground">Sin equipo vinculado</span>
        ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (caja) => (
        <div className="flex flex-col items-start gap-1">
          <EstadoCaja caja={caja} />
          {/* El motivo declarado al retirarla: sin él, «retirada» no dice nada
              a quien llega meses después a preguntar por qué. */}
          {caja.motivoRetirada ? (
            <span className="text-caption text-text-secondary">{caja.motivoRetirada}</span>
          ) : null}
        </div>
      ),
      hiddenOnCard: true,
    },
    { key: "alta", header: "Alta", cell: (caja) => caja.alta },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      cell: (caja) => <Acciones caja={caja} onElegir={setAccion} />,
      hiddenOnCard: true,
    },
  ];

  return (
    <>
      <ResponsiveTable
        rows={cajas}
        columns={columnas}
        rowKey={(caja) => caja.id}
        cardTitle={(caja) => caja.name}
        cardSubtitle={(caja) => caja.motivoRetirada ?? null}
        cardBadge={(caja) => <EstadoCaja caja={caja} />}
        cardFooter={(caja) => <Acciones caja={caja} onElegir={setAccion} />}
        empty={<p className="text-body text-text-secondary">Esta sede no tiene cajas.</p>}
      />

      {accion?.tipo === "retirar" ? (
        <DialogoRetirar caja={accion.caja} onCerrar={() => setAccion(null)} />
      ) : null}

      {accion?.tipo === "reactivar" ? (
        <DialogoReactivar caja={accion.caja} onCerrar={() => setAccion(null)} />
      ) : null}
    </>
  );
}

function EstadoCaja({ caja }: { caja: CajaRow }): React.JSX.Element {
  return caja.status === "activa" ? (
    <Badge variant="success">Activa</Badge>
  ) : (
    <Badge variant="neutral">Retirada</Badge>
  );
}

function Acciones({
  caja,
  onElegir,
}: {
  caja: CajaRow;
  onElegir: (accion: Accion) => void;
}): React.JSX.Element {
  /* Las dos abren un diálogo, así que antes de hidratar no hacen nada: el
     servidor las pinta y React todavía no escucha. Quedan cerradas hasta
     entonces, por la misma regla que el resto de los controles de cliente del
     producto (`lib/use-hydrated.ts`). */
  const hydrated = useHydrated();

  return caja.status === "activa" ? (
    <Button variant="tertiary" size="sm" disabled={!hydrated} onClick={() => onElegir({ tipo: "retirar", caja })}>
      Retirar
    </Button>
  ) : (
    <Button variant="tertiary" size="sm" disabled={!hydrated} onClick={() => onElegir({ tipo: "reactivar", caja })}>
      <RotateCcw aria-hidden="true" />
      Reactivar
    </Button>
  );
}

const MOTIVO: FieldSpec = {
  id: "retirar-caja-motivo",
  label: "Motivo de la retirada",
  description: `Queda en el registro de auditoría. Al menos ${MOTIVO_MIN_LENGTH} caracteres.`,
  required: true,
};

function DialogoRetirar({
  caja,
  onCerrar,
}: {
  caja: CajaRow;
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccion, FormData>(
    retirarCajaAction,
    null,
  );

  const hecho = estado?.ok === true;

  return (
    <Dialog open onOpenChange={(abierto) => (abierto ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Retirar {caja.name}</DialogTitle>
          <DialogDescription>
            Deja de estar disponible para operar. <strong>No se borra nada</strong>: sus jornadas,
            movimientos y operaciones siguen accesibles, y la caja seguirá apareciendo en los
            listados históricos marcada como retirada.
          </DialogDescription>
        </DialogHeader>

        {hecho ? (
          <>
            <DialogBody>
              <Alert variant="success" title="Caja retirada">
                {estado.mensaje}
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form action={accion}>
            <input type="hidden" name="caja" value={caja.id} />

            <DialogBody className="flex flex-col gap-4">
              {estado && !estado.ok ? (
                <Alert variant="error" title="No se pudo retirar">
                  {estado.error}
                </Alert>
              ) : null}

              {caja.equipo ? (
                <Alert variant="warning" title="Esta caja tiene un equipo vinculado">
                  Desvincula {caja.equipo.label} antes de retirarla.
                </Alert>
              ) : null}

              <Field {...MOTIVO}>
                <Input
                  {...fieldAria(MOTIVO)}
                  name="motivo"
                  autoFocus
                  disabled={enviando}
                  placeholder="Por qué se retira esta caja"
                />
              </Field>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" loading={enviando}>
                <TriangleAlert aria-hidden="true" />
                Retirar caja
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DialogoReactivar({
  caja,
  onCerrar,
}: {
  caja: CajaRow;
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccion, FormData>(
    reactivarCajaAction,
    null,
  );

  const hecho = estado?.ok === true;

  return (
    <Dialog open onOpenChange={(abierto) => (abierto ? undefined : onCerrar())}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Reactivar {caja.name}</DialogTitle>
          <DialogDescription>
            Vuelve a estar disponible. <strong>No recupera su equipo</strong>: habrá que vincularle
            uno antes de que pueda operar.
          </DialogDescription>
        </DialogHeader>

        {hecho ? (
          <>
            <DialogBody>
              <Alert variant="success" title="Caja reactivada">
                {estado.mensaje}
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form action={accion}>
            <input type="hidden" name="caja" value={caja.id} />

            {estado && !estado.ok ? (
              <DialogBody>
                <Alert variant="error" title="No se pudo reactivar">
                  {estado.error}
                </Alert>
              </DialogBody>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" loading={enviando}>
                <RotateCcw aria-hidden="true" />
                Reactivar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
