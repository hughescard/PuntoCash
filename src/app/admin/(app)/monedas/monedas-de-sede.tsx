"use client";

import * as React from "react";
import { CirclePlus, MinusCircle } from "lucide-react";

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
  Field,
  fieldAria,
  type FieldSpec,
} from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import { useHydrated } from "@/lib/use-hydrated";
import type { MonedaCatalogo } from "@/features/network/currencies";
import { anadirMonedaAction, retirarMonedaAction, type ResultadoMoneda } from "./_actions";
import { enviarSinReiniciar } from "@/lib/enviar-sin-reiniciar";

/**
 * La lista de monedas de una sede, con sus dos acciones.
 *
 * Retirar se decide en el diálogo y no al enviar: si alguna caja tiene saldo,
 * o es la última moneda, el diálogo lo dice **en lugar** del botón de
 * confirmar (**FR-AD-STATE-6**). Un botón que se ofrece para fallar al
 * pulsarlo enseña la regla a golpes.
 */

export interface MonedaRow {
  code: string;
  name: string;
  /** Cajas activas con la moneda habilitada. */
  cajas: readonly string[];
  /** De esas, las que tienen saldo distinto de cero. */
  cajasConSaldo: readonly string[];
  totalCajas: number;
  /** La única moneda de una sede activa (**FR-AD-MON-9**). */
  esUnica: boolean;
  /** Las tasas que se retirarían con ella (**FR-AD-MON-8**). */
  tasas: readonly string[];
}

interface SedeRef {
  id: string;
  name: string;
}

const SELECT_CLASS =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle";

/** «Caja 01», «Caja 01 y Caja 03», «Caja 01, Caja 02 y Caja 03». */
function enumerar(nombres: readonly string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

function textoCajas(fila: MonedaRow): string {
  if (fila.cajas.length === 0) return "En ninguna caja todavía";
  return `${fila.cajas.length} de ${fila.totalCajas}: ${fila.cajas.join(", ")}`;
}

export function MonedasDeSede({
  sede,
  filas,
  editable,
}: {
  sede: SedeRef;
  filas: readonly MonedaRow[];
  editable: boolean;
}): React.JSX.Element {
  const [retirando, setRetirando] = React.useState<MonedaRow | null>(null);
  const hydrated = useHydrated();

  const boton = (fila: MonedaRow) =>
    editable ? (
      <Button
        variant="tertiary"
        size="sm"
        disabled={!hydrated}
        onClick={() => setRetirando(fila)}
        aria-label={`Retirar ${fila.code} de ${sede.name}`}
      >
        Retirar
      </Button>
    ) : null;

  const columnas: readonly ResponsiveColumn<MonedaRow>[] = [
    {
      key: "moneda",
      header: "Moneda",
      cell: (fila) => <NombreMoneda fila={fila} />,
      hiddenOnCard: true,
    },
    {
      key: "cajas",
      header: "Habilitada en cajas",
      cell: (fila) => (
        <span className={fila.cajas.length === 0 ? "text-text-secondary" : undefined}>
          {textoCajas(fila)}
        </span>
      ),
      /* En la tarjeta va como subtítulo: un único par etiqueta/valor ocupa
         media tarjeta y parte la lista de cajas en tres renglones. */
      hiddenOnCard: true,
    },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      cell: boton,
      hiddenOnCard: true,
    },
  ];

  return (
    <>
      <ResponsiveTable
        rows={filas}
        columns={columnas}
        rowKey={(fila) => fila.code}
        cardTitle={(fila) => <NombreMoneda fila={fila} />}
        cardSubtitle={(fila) => `Habilitada en cajas: ${textoCajas(fila)}`}
        cardFooter={boton}
        empty={<p className="text-body text-text-secondary">Esta sede no tiene monedas.</p>}
      />

      {retirando ? (
        <DialogoRetirar sede={sede} fila={retirando} onCerrar={() => setRetirando(null)} />
      ) : null}
    </>
  );
}

function NombreMoneda({ fila }: { fila: MonedaRow }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-3">
      <CurrencyFlag currency={fila.code} />
      <span className="pc-numeric font-semibold text-text-primary">{fila.code}</span>
      <span className="text-text-secondary">{fila.name}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------
 * Añadir — FR-AD-MON-3 y FR-AD-MON-4
 * ---------------------------------------------------------------------- */

const MONEDA: FieldSpec = {
  id: "anadir-moneda",
  label: "Moneda",
  required: true,
  description: "Del catálogo de PuntoCash.",
};

export function AnadirMoneda({
  sede,
  disponibles,
}: {
  sede: SedeRef;
  disponibles: readonly MonedaCatalogo[];
}): React.JSX.Element {
  const [abierto, setAbierto] = React.useState(false);
  const hydrated = useHydrated();

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        disabled={!hydrated}
        onClick={() => setAbierto(true)}
        aria-label={`Añadir moneda a ${sede.name}`}
      >
        <CirclePlus aria-hidden="true" />
        Añadir moneda
      </Button>
      {abierto ? (
        <DialogoAnadir sede={sede} disponibles={disponibles} onCerrar={() => setAbierto(false)} />
      ) : null}
    </>
  );
}

function DialogoAnadir({
  sede,
  disponibles,
  onCerrar,
}: {
  sede: SedeRef;
  disponibles: readonly MonedaCatalogo[];
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoMoneda, FormData>(
    anadirMonedaAction,
    null,
  );
  const hecho = estado?.ok === true;

  return (
    <Dialog open onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Añadir una moneda a {sede.name}</DialogTitle>
          {/* **FR-AD-MON-4**: la confusión más probable, dicha donde se decide. */}
          <DialogDescription>
            Añadir una moneda aquí no la activa en ninguna caja. Cada trabajador la habilita en la
            suya cuando la necesite.
          </DialogDescription>
        </DialogHeader>

        {hecho ? (
          <>
            <DialogBody>
              <Alert variant="success" title="Moneda añadida">
                {estado.mensaje}
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={enviarSinReiniciar(accion)}>
            <input type="hidden" name="sede" value={sede.id} />
            <DialogBody className="flex flex-col gap-4">
              {estado && !estado.ok ? (
                <Alert variant="error" title="No se pudo añadir">
                  {estado.error}
                </Alert>
              ) : null}
              <Field {...MONEDA}>
                <select
                  {...fieldAria(MONEDA)}
                  name="moneda"
                  defaultValue=""
                  disabled={enviando}
                  className={SELECT_CLASS}
                >
                  <option value="" disabled>
                    Elige una moneda
                  </option>
                  {disponibles.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.code} — {m.name}
                    </option>
                  ))}
                </select>
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" loading={enviando}>
                <CirclePlus aria-hidden="true" />
                Añadir
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------
 * Retirar — FR-AD-MON-6 a FR-AD-MON-9
 * ---------------------------------------------------------------------- */

function DialogoRetirar({
  sede,
  fila,
  onCerrar,
}: {
  sede: SedeRef;
  fila: MonedaRow;
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoMoneda, FormData>(
    retirarMonedaAction,
    null,
  );
  const hecho = estado?.ok === true;

  /* Lo que impide retirarla se sabe antes de abrir, y se dice en vez de
     ofrecer el botón. El dominio lo vuelve a comprobar al enviar. */
  const bloqueo = fila.esUnica
    ? "Es la única moneda de esta sede: sin ella sus cajas no podrían manejar efectivo. Añade otra antes de retirar esta."
    : fila.cajasConSaldo.length > 0
      ? `${fila.code} tiene saldo en ${enumerar(fila.cajasConSaldo)}. Debe quedar en cero antes de retirarla de la lista.`
      : null;

  const enCero = fila.cajas.filter((c) => !fila.cajasConSaldo.includes(c));

  return (
    <Dialog open onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            Retirar {fila.code} de {sede.name}
          </DialogTitle>
          <DialogDescription>
            Sus trabajadores dejarán de poder habilitarla en una caja. Las operaciones y movimientos
            ya registrados en {fila.code} no cambian.
          </DialogDescription>
        </DialogHeader>

        {hecho ? (
          <>
            <DialogBody>
              <Alert variant="success" title="Moneda retirada">
                {estado.mensaje}
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : bloqueo ? (
          <>
            <DialogBody>
              <Alert variant="warning" title="Todavía no se puede retirar">
                {bloqueo}
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Entendido</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={enviarSinReiniciar(accion)}>
            <input type="hidden" name="sede" value={sede.id} />
            <input type="hidden" name="moneda" value={fila.code} />
            {(estado && !estado.ok) || enCero.length > 0 || fila.tasas.length > 0 ? (
              <DialogBody className="flex flex-col gap-4">
                {estado && !estado.ok ? (
                  <Alert variant="error" title="No se pudo retirar">
                    {estado.error}
                  </Alert>
                ) : null}
                {/* **FR-AD-MON-6**: sale también de las cajas que la tienen en
                    cero, y se nombran antes de confirmar. */}
                {enCero.length > 0 ? (
                  <p className="text-body text-text-primary">
                    Se quitará también de {enumerar(enCero)}, donde está en cero.
                  </p>
                ) : null}
                {/* **FR-AD-MON-8**: las tasas que se van con ella, nombradas. */}
                {fila.tasas.length > 0 ? (
                  <p className="text-body text-text-primary">
                    {fila.code === "CUP"
                      ? `Se retirarán también las tasas de ${enumerar(fila.tasas)}: sin pesos cubanos la sede no puede cotizar ninguna, y dejarán de verse en su tablero.`
                      : `Se retirará también su tasa, y ${fila.code} dejará de verse en el tablero de la sede.`}
                  </p>
                ) : null}
              </DialogBody>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" loading={enviando}>
                <MinusCircle aria-hidden="true" />
                Retirar {fila.code}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
