"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CirclePlus, MinusCircle, Pencil } from "lucide-react";

import { Section } from "@/components/shell/app-shell";
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
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import { formatAmount } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import {
  confirmarTasaAjustadaAction,
  fijarTasaAction,
  retirarTasaAction,
  type ResultadoTasa,
} from "./_actions";

/**
 * El detalle de las tasas de una sede, con sus acciones.
 *
 * Fijar una tasa es **un diálogo en dos pasos**: primero las cifras, con el
 * rango de PuntoCash a la vista junto a cada campo y la validación al
 * teclear (**FR-AD-TASA-7**, **FR-AD-TASA-8**); después un resumen con el
 * antes y el ahora y lo que el cambio provoca (**FR-AD-TASA-10**). La
 * confirmación no es un trámite: es el momento en que el tablero de una sala
 * de espera cambia de cifra.
 */

interface Intervalo {
  min: number;
  max: number;
}

export interface RangoVista {
  compra: Intervalo;
  venta: Intervalo;
  version: string;
}

export interface TasaRow {
  code: string;
  name: string;
  compra: number;
  venta: number;
  rango: RangoVista | null;
  /** «14 oct 2026 · Marta Sánchez», ya formateado. */
  actualizada: string;
  fijada?: { fecha: string; anterior: { compra: number; venta: number } };
  /** Por qué no se cotiza ni se exhibe, si es el caso. */
  fueraDeVigor: string | null;
}

export interface SinTasaRow {
  code: string;
  name: string;
  rango: RangoVista | null;
  /** Por qué no puede fijarse, o `null` si puede. */
  motivo: string | null;
}

interface SedeRef {
  id: string;
  name: string;
}

type Abierto =
  | { tipo: "fijar"; code: string; name: string; rango: RangoVista; actual: TasaRow | null }
  | { tipo: "retirar"; fila: TasaRow }
  | null;

const cifra = (n: number) => formatAmount(n, 2);
const intervalo = (i: Intervalo) => `${cifra(i.min)}–${cifra(i.max)}`;

export function TasasDeSede({
  sede,
  filas,
  sinTasa,
  editable,
}: {
  sede: SedeRef;
  filas: readonly TasaRow[];
  sinTasa: readonly SinTasaRow[];
  editable: boolean;
}): React.JSX.Element {
  const [abierto, setAbierto] = React.useState<Abierto>(null);
  const [confirmada, setConfirmada] = React.useState<string | null>(null);
  const hydrated = useHydrated();

  const fijadas = filas.filter((f) => f.fijada);

  const abrirFijar = (fila: TasaRow) =>
    fila.rango
      ? setAbierto({ tipo: "fijar", code: fila.code, name: fila.name, rango: fila.rango, actual: fila })
      : undefined;

  const acciones = (fila: TasaRow) =>
    editable ? (
      <>
        {fila.rango && !fila.fueraDeVigor ? (
          <Button
            variant="tertiary"
            size="sm"
            disabled={!hydrated}
            onClick={() => abrirFijar(fila)}
            aria-label={`${fila.fijada ? "Revisar" : "Cambiar"} la tasa de ${fila.code}`}
          >
            <Pencil aria-hidden="true" />
            {fila.fijada ? "Revisar" : "Cambiar"}
          </Button>
        ) : null}
        <Button
          variant="tertiary"
          size="sm"
          disabled={!hydrated}
          onClick={() => setAbierto({ tipo: "retirar", fila })}
          aria-label={`Retirar la tasa de ${fila.code}`}
        >
          Retirar
        </Button>
      </>
    ) : null;

  const columnas: readonly ResponsiveColumn<TasaRow>[] = [
    {
      key: "moneda",
      header: "Moneda",
      cell: (fila) => <NombreTasa fila={fila} />,
      hiddenOnCard: true,
    },
    { key: "compra", header: "Compra", numeric: true, cell: (fila) => cifra(fila.compra) },
    { key: "venta", header: "Venta", numeric: true, cell: (fila) => cifra(fila.venta) },
    {
      key: "rango",
      header: "Rango de PuntoCash",
      cell: (fila) =>
        fila.rango ? (
          <span className="pc-numeric flex flex-col text-body-sm text-text-secondary">
            <span>Compra {intervalo(fila.rango.compra)}</span>
            <span>Venta {intervalo(fila.rango.venta)}</span>
          </span>
        ) : (
          <span className="text-text-secondary">Sin rango</span>
        ),
    },
    {
      key: "cambio",
      header: "Último cambio",
      cell: (fila) => <span className="text-body-sm text-text-secondary">{fila.actualizada}</span>,
    },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      cell: (fila) => <div className="flex justify-end gap-1">{acciones(fila)}</div>,
      hiddenOnCard: true,
    },
  ];

  return (
    <>
      {/* **FR-AD-TASA-12**: destacado, diciendo qué movió PuntoCash y qué le
          pasó a la tasa, con las dos salidas a mano. */}
      {editable
        ? fijadas.map((fila) => (
            <AvisoDeAjuste
              key={fila.code}
              sede={sede}
              fila={fila}
              hydrated={hydrated}
              onElegirOtra={() => abrirFijar(fila)}
              onConfirmada={setConfirmada}
            />
          ))
        : null}

      {/* El aviso desaparece al confirmar; esto dice que fue a propósito. */}
      {confirmada ? (
        <Alert variant="success" title="Tasa confirmada" className="mb-8">
          {confirmada}
        </Alert>
      ) : null}

      <Section title="Tasas en CUP">
        <ResponsiveTable
          rows={filas}
          columns={columnas}
          rowKey={(fila) => fila.code}
          cardTitle={(fila) => <NombreTasa fila={fila} />}
          cardFooter={editable ? acciones : undefined}
          empty={
            <p className="text-body text-text-secondary">
              Esta sede todavía no cotiza ninguna moneda.
            </p>
          }
        />
      </Section>

      {sinTasa.length > 0 ? (
        <Section title="Monedas de la sede sin tasa">
          <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
            {sinTasa.map((m) => (
              <li
                key={m.code}
                className="flex flex-col items-stretch gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <NombreMoneda code={m.code} name={m.name} />
                  {/* **FR-AD-TASA-3**: una ausencia explicada es una petición
                      que el mercante puede hacer. */}
                  {m.motivo ? (
                    <p className="mt-1 text-body-sm text-text-secondary">{m.motivo}</p>
                  ) : null}
                </div>
                {editable && !m.motivo && m.rango ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!hydrated}
                    onClick={() =>
                      setAbierto({ tipo: "fijar", code: m.code, name: m.name, rango: m.rango!, actual: null })
                    }
                    aria-label={`Fijar la tasa de ${m.code}`}
                  >
                    <CirclePlus aria-hidden="true" />
                    Fijar tasa
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {editable ? (
        <p className="text-body-sm text-text-secondary">
          ¿Falta una moneda? Tiene que estar antes en la lista de la sede:{" "}
          <Link href="/admin/monedas" className="font-medium text-primary underline underline-offset-2">
            Monedas
          </Link>
          .
        </p>
      ) : null}

      {abierto?.tipo === "fijar" ? (
        <DialogoFijar sede={sede} {...abierto} onCerrar={() => setAbierto(null)} />
      ) : null}
      {abierto?.tipo === "retirar" ? (
        <DialogoRetirar sede={sede} fila={abierto.fila} onCerrar={() => setAbierto(null)} />
      ) : null}
    </>
  );
}

function NombreMoneda({ code, name }: { code: string; name: string }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-3">
      <CurrencyFlag currency={code} />
      <span className="pc-numeric font-semibold text-text-primary">{code}</span>
      <span className="text-text-secondary">{name}</span>
    </span>
  );
}

function NombreTasa({ fila }: { fila: TasaRow }): React.JSX.Element {
  return (
    <span className="flex flex-col items-start gap-1">
      <NombreMoneda code={fila.code} name={fila.name} />
      {fila.fijada ? <Badge variant="warning">Ajustada por PuntoCash</Badge> : null}
      {fila.fueraDeVigor ? (
        <span className="text-body-sm text-text-secondary">{fila.fueraDeVigor}</span>
      ) : null}
    </span>
  );
}

/* -------------------------------------------------------------------------
 * Tasa ajustada por PuntoCash — FR-AD-TASA-12
 * ---------------------------------------------------------------------- */

interface Ajuste {
  lado: "compra" | "venta";
  antes: number;
  ahora: number;
}

/** Qué lado movió el ajuste, y en qué sentido. Puede ser uno o los dos. */
function ajustesDe(fila: TasaRow): Ajuste[] {
  const anterior = fila.fijada?.anterior;
  if (!anterior) return [];
  const out: Ajuste[] = [];
  if (anterior.compra !== fila.compra) out.push({ lado: "compra", antes: anterior.compra, ahora: fila.compra });
  if (anterior.venta !== fila.venta) out.push({ lado: "venta", antes: anterior.venta, ahora: fila.venta });
  return out;
}

/**
 * El aviso no dice «estás en el límite», que es lo que se entendía antes y no
 * es ningún problema: dice **qué movió PuntoCash** y **qué le pasó a la tasa**.
 * Lo que importa es que esa cifra no la eligió el mercante. Y tiene las dos
 * salidas: quedarse con ella, que quita el aviso, o elegir otra.
 */
function AvisoDeAjuste({
  sede,
  fila,
  hydrated,
  onElegirOtra,
  onConfirmada,
}: {
  sede: SedeRef;
  fila: TasaRow;
  hydrated: boolean;
  onElegirOtra: () => void;
  onConfirmada: (mensaje: string) => void;
}): React.JSX.Element {
  /* Al confirmar, este aviso se desmonta con la revalidación: el mensaje lo
     guarda quien lo contiene, o se perdería con él. */
  const [estado, accion, enviando] = React.useActionState<ResultadoTasa, FormData>(
    async (previo, datos) => {
      const r = await confirmarTasaAjustadaAction(previo, datos);
      if (r?.ok) onConfirmada(r.mensaje);
      return r;
    },
    null,
  );
  const ajustes = ajustesDe(fila);
  const valorActual =
    ajustes.length === 1 ? cifra(ajustes[0]!.ahora) : `${cifra(fila.compra)} / ${cifra(fila.venta)}`;

  return (
    <Alert
      variant="warning"
      title={`PuntoCash cambió el rango del ${fila.code} y tu tasa se ajustó`}
      className="mb-8"
    >
      <p>
        {ajustes.map((a) => (
          <React.Fragment key={a.lado}>
            El {fila.fijada!.fecha} PuntoCash {a.ahora < a.antes ? "bajó el máximo" : "subió el mínimo"}{" "}
            de {a.lado} a {cifra(a.ahora)}, así que tu {a.lado} pasó de {cifra(a.antes)} a{" "}
            {cifra(a.ahora)}.{" "}
          </React.Fragment>
        ))}
        Confírmala o elige otra.
      </p>
      {estado && !estado.ok ? <p className="mt-2 font-semibold">{estado.error}</p> : null}
      <form action={accion} className="mt-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <input type="hidden" name="sede" value={sede.id} />
        <input type="hidden" name="moneda" value={fila.code} />
        <Button type="submit" size="sm" loading={enviando} disabled={!hydrated}>
          Mantener {valorActual}
        </Button>
        <Button type="button" variant="secondary" size="sm" disabled={!hydrated || enviando} onClick={onElegirOtra}>
          Elegir otra
        </Button>
      </form>
    </Alert>
  );
}

/* -------------------------------------------------------------------------
 * Fijar o cambiar — FR-AD-TASA-5, 7, 8, 10 y 11
 * ---------------------------------------------------------------------- */

function leer(texto: string): number {
  const limpio = texto.trim().replace(/\s/g, "").replace(",", ".");
  return limpio === "" ? Number.NaN : Number(limpio);
}

function errorDe(texto: string, cual: "compra" | "venta", rango: Intervalo): string | undefined {
  if (texto.trim() === "") return undefined;
  const n = leer(texto);
  if (!Number.isFinite(n) || n < rango.min || n > rango.max) {
    return `La tasa de ${cual} debe estar entre ${cifra(rango.min)} y ${cifra(rango.max)}.`;
  }
  return undefined;
}

function DialogoFijar({
  sede,
  code,
  name,
  rango,
  actual,
  onCerrar,
}: {
  sede: SedeRef;
  code: string;
  name: string;
  rango: RangoVista;
  actual: TasaRow | null;
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoTasa, FormData>(
    fijarTasaAction,
    null,
  );
  const [compra, setCompra] = React.useState(actual ? String(actual.compra) : "");
  const [venta, setVenta] = React.useState(actual ? String(actual.venta) : "");
  const [revisando, setRevisando] = React.useState(false);

  const errorCompra = errorDe(compra, "compra", rango.compra);
  const errorVenta = errorDe(venta, "venta", rango.venta);
  const nCompra = leer(compra);
  const nVenta = leer(venta);
  const errorCruce =
    !errorCompra && !errorVenta && nCompra > nVenta ? "La compra no puede ser mayor que la venta." : undefined;
  const completa = compra.trim() !== "" && venta.trim() !== "";
  const valida = completa && !errorCompra && !errorVenta && !errorCruce;
  const sinCambios = actual !== null && nCompra === actual.compra && nVenta === actual.venta;

  const COMPRA: FieldSpec = {
    id: "tasa-compra",
    label: "Compra",
    required: true,
    description: `Rango de PuntoCash: ${intervalo(rango.compra)}.`,
    ...(errorCompra ? { error: errorCompra } : {}),
  };
  const VENTA: FieldSpec = {
    id: "tasa-venta",
    label: "Venta",
    required: true,
    description: `Rango de PuntoCash: ${intervalo(rango.venta)}.`,
    ...(errorVenta || errorCruce ? { error: (errorVenta ?? errorCruce)! } : {}),
  };

  const hecho = estado?.ok === true;
  const titulo = actual ? `Cambiar la tasa de ${code}` : `Fijar la tasa de ${code}`;

  return (
    <Dialog open onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            {titulo} · {sede.name}
          </DialogTitle>
          <DialogDescription>
            {name}, en pesos cubanos. Las dos cifras deben quedar dentro del rango de PuntoCash.
          </DialogDescription>
        </DialogHeader>

        {hecho ? (
          <>
            <DialogBody>
              <Alert variant="success" title="Tasa guardada">
                {estado.mensaje}
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form action={accion}>
            <input type="hidden" name="sede" value={sede.id} />
            <input type="hidden" name="moneda" value={code} />
            <input type="hidden" name="version" value={rango.version} />
            <input type="hidden" name="compra" value={compra} />
            <input type="hidden" name="venta" value={venta} />

            {!revisando ? (
              <>
                <DialogBody className="flex flex-col gap-5">
                  {estado && !estado.ok ? (
                    <Alert variant="error" title="No se pudo guardar">
                      {estado.error}
                    </Alert>
                  ) : null}
                  <Field {...COMPRA}>
                    <Input
                      {...fieldAria(COMPRA)}
                      inputMode="decimal"
                      autoFocus
                      value={compra}
                      onChange={(e) => setCompra(e.target.value)}
                      invalid={Boolean(errorCompra)}
                      suffix="CUP"
                      numeric
                    />
                  </Field>
                  <Field {...VENTA}>
                    <Input
                      {...fieldAria(VENTA)}
                      inputMode="decimal"
                      value={venta}
                      onChange={(e) => setVenta(e.target.value)}
                      invalid={Boolean(errorVenta || errorCruce)}
                      suffix="CUP"
                      numeric
                    />
                  </Field>
                </DialogBody>
                <DialogFooter>
                  <Button key="cancelar" type="button" variant="secondary" onClick={onCerrar}>
                    Cancelar
                  </Button>
                  {/* Las claves no son decorativas: sin ellas React reutiliza este
                      mismo botón como el «Confirmar» del paso siguiente, le cambia
                      el tipo a `submit` dentro del propio clic, y el navegador
                      envía el formulario saltándose la revisión. */}
                  <Button
                    key="revisar"
                    type="button"
                    disabled={!valida || sinCambios}
                    onClick={() => setRevisando(true)}
                  >
                    Revisar el cambio
                    <ArrowRight aria-hidden="true" />
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogBody className="flex flex-col gap-5">
                  {/* **FR-AD-TASA-10**: moneda, sede, antes y después. */}
                  <div className="grid grid-cols-[auto_1fr_1fr] gap-x-6 gap-y-2 rounded-card border border-border px-5 py-4">
                    <span aria-hidden="true" />
                    <span className="text-caption uppercase text-text-secondary">Antes</span>
                    <span className="text-caption uppercase text-text-secondary">Ahora</span>
                    <span className="text-body text-text-primary">Compra</span>
                    <span className="pc-numeric text-body text-text-secondary">
                      {actual ? cifra(actual.compra) : "—"}
                    </span>
                    <span className="pc-numeric text-body font-semibold text-text-primary">{cifra(nCompra)}</span>
                    <span className="text-body text-text-primary">Venta</span>
                    <span className="pc-numeric text-body text-text-secondary">
                      {actual ? cifra(actual.venta) : "—"}
                    </span>
                    <span className="pc-numeric text-body font-semibold text-text-primary">{cifra(nVenta)}</span>
                  </div>
                  <p className="text-body text-text-primary">
                    Las operaciones de {code} que se coticen en {sede.name} a partir de ahora usarán esta
                    tasa, y el tablero de la sucursal —kiosco y pantalla informativa— pasa a mostrarla.
                    Ninguna operación ya registrada cambia.
                  </p>
                  {estado && !estado.ok ? (
                    <Alert variant="error" title="No se pudo guardar">
                      {estado.error}
                    </Alert>
                  ) : null}
                </DialogBody>
                <DialogFooter>
                  <Button
                    key="volver"
                    type="button"
                    variant="secondary"
                    onClick={() => setRevisando(false)}
                    disabled={enviando}
                  >
                    Volver
                  </Button>
                  <Button key="confirmar" type="submit" loading={enviando}>
                    Confirmar la tasa
                  </Button>
                </DialogFooter>
              </>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------
 * Retirar — FR-AD-TASA-13
 * ---------------------------------------------------------------------- */

function DialogoRetirar({
  sede,
  fila,
  onCerrar,
}: {
  sede: SedeRef;
  fila: TasaRow;
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoTasa, FormData>(
    retirarTasaAction,
    null,
  );
  const hecho = estado?.ok === true;

  return (
    <Dialog open onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            Retirar la tasa de {fila.code} · {sede.name}
          </DialogTitle>
          <DialogDescription>
            La sede deja de cotizar {fila.code} y desaparece de su tablero. {fila.code} sigue en su
            lista de monedas, así que sus cajas pueden seguir manejándola. Las operaciones ya
            registradas no cambian.
          </DialogDescription>
        </DialogHeader>

        {hecho ? (
          <>
            <DialogBody>
              <Alert variant="success" title="Tasa retirada">
                {estado.mensaje}
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form action={accion}>
            <input type="hidden" name="sede" value={sede.id} />
            <input type="hidden" name="moneda" value={fila.code} />
            {estado && !estado.ok ? (
              <DialogBody>
                <Alert variant="error" title="No se pudo retirar">
                  {estado.error}
                </Alert>
              </DialogBody>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" loading={enviando}>
                <MinusCircle aria-hidden="true" />
                Retirar la tasa
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
