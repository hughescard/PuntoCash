"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

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
import { cifraDeTablero } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { enviarSinReiniciar } from "@/lib/enviar-sin-reiniciar";
import { definirRangoAction, retirarRangoAction, type ResultadoRango } from "./_actions";

/**
 * Una fila por moneda del catálogo, con su rango de compra y de venta contra
 * el CUP (decisión del 27/10: una sola tabla en vez de catálogo y rangos por
 * separado). Sin rango, la moneda **no es cotizable** en ninguna sede, y la
 * fila dice cuántas sedes la tienen en su lista esperando poder cotizarla.
 */

interface Intervalo {
  min: number;
  max: number;
}

export interface FilaDeRango {
  code: string;
  nombre: string;
  rango: { compra: Intervalo; venta: Intervalo } | null;
  /** Ya formateados en el servidor. */
  actualizadoEl: string | null;
  actualizadoPor: string | null;
  enLista: number;
  esperando: number;
  cotizan: number;
  /** Las tasas guardadas de esta moneda, para calcular qué quedaría fuera. */
  tasas: readonly { sedeId: string; sedeNombre: string; compra: number; venta: number }[];
}

const tramo = (i: Intervalo) => `${cifraDeTablero(i.min)} – ${cifraDeTablero(i.max)}`;

export function TablaDeRangos({ filas }: { filas: readonly FilaDeRango[] }): React.JSX.Element {
  const hydrated = useHydrated();
  const [abierto, setAbierto] = React.useState<{ fila: FilaDeRango; accion: "editar" | "retirar" } | null>(null);
  const [hecho, setHecho] = React.useState<string | null>(null);
  const cerrar = React.useCallback(() => setAbierto(null), []);
  const terminar = React.useCallback((m: string) => {
    setAbierto(null);
    setHecho(m);
  }, []);

  const columnas: readonly ResponsiveColumn<FilaDeRango>[] = [
    {
      key: "moneda",
      header: "Moneda",
      hiddenOnCard: true,
      cell: (f) => <Moneda fila={f} />,
    },
    {
      key: "compra",
      header: "Compra (CUP)",
      /* Sin rango, la celda lo dice: en la tabla no hay columna de estado (la
         repetiría), y en la tarjeta lo dice la etiqueta. */
      cell: (f) =>
        f.rango ? (
          <span className="pc-numeric whitespace-nowrap">{tramo(f.rango.compra)}</span>
        ) : (
          <span className="whitespace-nowrap font-medium text-text-secondary">Sin rango</span>
        ),
    },
    {
      key: "venta",
      header: "Venta (CUP)",
      cell: (f) => (f.rango ? <span className="pc-numeric whitespace-nowrap">{tramo(f.rango.venta)}</span> : <span className="text-text-secondary">—</span>),
    },
    {
      key: "sedes",
      header: "Sedes",
      cell: (f) =>
        f.rango && f.enLista === 0 ? (
          <span className="text-text-secondary">En ninguna lista</span>
        ) : f.rango ? (
          <span className="flex flex-col">
            <span className="whitespace-nowrap text-text-primary">
              {f.cotizan === 1 ? "1 la cotiza" : `${f.cotizan} la cotizan`}
            </span>
            <span className="whitespace-nowrap text-caption text-text-secondary">en la lista de {f.enLista}</span>
          </span>
        ) : f.esperando > 0 ? (
          <span className="flex flex-col">
            <span className="whitespace-nowrap font-medium text-warning-foreground">
              {f.esperando === 1 ? "1 sede la espera" : `${f.esperando} sedes la esperan`}
            </span>
            <span className="text-caption text-text-secondary">la tienen en su lista y no pueden cotizarla</span>
          </span>
        ) : (
          <span className="text-text-secondary">{f.enLista === 0 ? "En ninguna lista" : `En la lista de ${f.enLista}`}</span>
        ),
    },
    {
      key: "cambio",
      header: "Último cambio",
      cell: (f) =>
        f.actualizadoEl ? (
          <span className="flex flex-col">
            <span className="whitespace-nowrap text-text-primary">{f.actualizadoEl}</span>
            <span className="whitespace-nowrap text-caption text-text-secondary">{f.actualizadoPor}</span>
          </span>
        ) : (
          <span className="text-text-secondary">—</span>
        ),
    },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      cell: (f) => (
        <span className="flex flex-wrap gap-2 xl:flex-nowrap">
          <Button
            size="sm"
            /* Destacado solo donde alguna sede espera la moneda: es la única
               fila en la que definir el rango responde a algo que ya pasa. */
            variant={!f.rango && f.esperando > 0 ? "primary" : "secondary"}
            disabled={!hydrated}
            onClick={() => {
              setHecho(null);
              setAbierto({ fila: f, accion: "editar" });
            }}
            aria-label={`${f.rango ? "Cambiar" : "Definir"} el rango del ${f.code}`}
          >
            {f.rango ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}
            {f.rango ? "Cambiar" : "Definir rango"}
          </Button>
          {f.rango ? (
            <Button
              size="sm"
              variant="tertiary"
              disabled={!hydrated}
              onClick={() => {
                setHecho(null);
                setAbierto({ fila: f, accion: "retirar" });
              }}
              aria-label={`Retirar el rango del ${f.code}`}
            >
              <Trash2 aria-hidden="true" />
              Retirar
            </Button>
          ) : null}
        </span>
      ),
    },
  ];

  return (
    <>
      <p className="mb-4 text-body-sm text-text-secondary">
        Cada operador fija la tasa de su sede dentro de estos rangos. El peso cubano es la moneda de referencia y no lleva
        rango.
      </p>
      {hecho ? (
        <Alert variant="success" title="Hecho" className="mb-6">
          {hecho}
        </Alert>
      ) : null}
      <ResponsiveTable
        rows={filas}
        columns={columnas}
        rowKey={(f) => f.code}
        tablaDesde="xl"
        tarjetasEnDosColumnas
        cardTitle={(f) => <Moneda fila={f} />}
        cardBadge={(f) => (f.rango ? <Badge variant="success">Cotizable</Badge> : <Badge variant="neutral">No cotizable</Badge>)}
        empty={null}
      />
      {abierto?.accion === "editar" ? <EditorDeRango key={abierto.fila.code} fila={abierto.fila} onCerrar={cerrar} onHecho={terminar} /> : null}
      {abierto?.accion === "retirar" ? <RetirarRango key={abierto.fila.code} fila={abierto.fila} onCerrar={cerrar} onHecho={terminar} /> : null}
    </>
  );
}

function Moneda({ fila }: { fila: FilaDeRango }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-2.5">
      <CurrencyFlag currency={fila.code} />
      <span className="flex flex-col leading-tight">
        <span className="pc-numeric font-semibold text-text-primary">{fila.code}</span>
        <span className="whitespace-nowrap text-caption text-text-secondary">{fila.nombre}</span>
      </span>
    </span>
  );
}

/* -------------------------------------------------------------------------
 * Definir o cambiar
 * ---------------------------------------------------------------------- */

const cifra = (t: string) => (t.trim() === "" ? Number.NaN : Number(t.trim().replace(",", ".")));
const limitar = (v: number, i: Intervalo) => Math.min(Math.max(v, i.min), i.max);

/** El mismo criterio que el dominio (`validarRango`), para avisar mientras se escribe. */
function problema(compra: Intervalo, venta: Intervalo): string | null {
  if ([compra.min, compra.max, venta.min, venta.max].some((v) => !Number.isFinite(v) || v <= 0)) return "Introduce un valor válido.";
  if (compra.min >= compra.max || venta.min >= venta.max) return "El mínimo debe ser menor que el máximo.";
  if (compra.min > venta.min || compra.max > venta.max) {
    return "La compra no puede quedar por encima de la venta: la compra mínima tiene que ser menor o igual que la venta mínima, y la compra máxima, menor o igual que la venta máxima.";
  }
  return null;
}

function EditorDeRango({
  fila,
  onCerrar,
  onHecho,
}: {
  fila: FilaDeRango;
  onCerrar: () => void;
  onHecho: (mensaje: string) => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoRango, FormData>(definirRangoAction, null);
  const [v, setV] = React.useState({
    cmin: fila.rango ? String(fila.rango.compra.min) : "",
    cmax: fila.rango ? String(fila.rango.compra.max) : "",
    vmin: fila.rango ? String(fila.rango.venta.min) : "",
    vmax: fila.rango ? String(fila.rango.venta.max) : "",
  });
  React.useEffect(() => {
    if (estado?.ok) onHecho(estado.mensaje);
  }, [estado, onHecho]);

  const compra = { min: cifra(v.cmin), max: cifra(v.cmax) };
  const venta = { min: cifra(v.vmin), max: cifra(v.vmax) };
  const completo = Object.values(v).every((x) => x.trim() !== "");
  const mal = completo ? problema(compra, venta) : null;
  const fuera =
    completo && !mal
      ? fila.tasas
          .map((t) => ({ ...t, nc: limitar(t.compra, compra), nv: limitar(t.venta, venta) }))
          .filter((t) => t.nc !== t.compra || t.nv !== t.venta)
      : [];

  const campo = (id: keyof typeof v, label: string) => {
    const spec: FieldSpec = { id: `rango-${id}`, label, required: true };
    return (
      <Field {...spec}>
        <Input
          {...fieldAria(spec)}
          name={{ cmin: "compra-min", cmax: "compra-max", vmin: "venta-min", vmax: "venta-max" }[id]}
          inputMode="decimal"
          value={v[id]}
          disabled={enviando}
          onChange={(e) => {
            const valor = e.currentTarget.value;
            setV((p) => ({ ...p, [id]: valor }));
          }}
          className="pc-numeric"
        />
      </Field>
    );
  };

  return (
    <Dialog open onOpenChange={(o) => (o ? undefined : onCerrar())}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {fila.rango ? "Cambiar" : "Definir"} el rango del {fila.code}
          </DialogTitle>
          <DialogDescription>
            En pesos cubanos por cada unidad de {fila.nombre.toLowerCase()}. Cada sede fija su tasa dentro de este rango.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviarSinReiniciar(accion)} noValidate>
          <input type="hidden" name="moneda" value={fila.code} />
          <DialogBody className="flex flex-col gap-5">
            {estado && !estado.ok ? (
              <Alert variant="error" title="No se pudo guardar">
                {estado.error}
              </Alert>
            ) : null}
            <fieldset className="grid grid-cols-2 gap-3 sm:gap-4">
              <legend className="mb-2 text-body font-semibold text-text-primary">Compra · lo que la casa paga</legend>
              {campo("cmin", "Mínimo")}
              {campo("cmax", "Máximo")}
            </fieldset>
            <fieldset className="grid grid-cols-2 gap-3 sm:gap-4">
              <legend className="mb-2 text-body font-semibold text-text-primary">Venta · lo que la casa cobra</legend>
              {campo("vmin", "Mínimo")}
              {campo("vmax", "Máximo")}
            </fieldset>

            {mal ? (
              <p role="alert" className="text-body-sm font-semibold text-error">
                {mal}
              </p>
            ) : null}

            {fuera.length > 0 ? (
              <Alert variant="warning" title={`${fuera.length} ${fuera.length === 1 ? "sede tiene" : "sedes tienen"} hoy una tasa fuera del nuevo rango`}>
                <p>
                  Al guardar, su tasa se fijará automáticamente al límite más cercano, su tablero público pasará a mostrar ese
                  valor y se avisará a sus administradores.
                </p>
                {/* En el teléfono, una lista de dos líneas: la tabla de tres
                    columnas no cabe en 390 sin juntar las cabeceras. */}
                <ul className="mt-3 flex flex-col divide-y divide-warning-border text-body-sm sm:hidden">
                  {fuera.map((t) => (
                    <li key={t.sedeId} className="py-1.5">
                      <p className="font-medium">{t.sedeNombre}</p>
                      <p className="pc-numeric">
                        Hoy {cifraDeTablero(t.compra)} / {cifraDeTablero(t.venta)} →{" "}
                        <strong>
                          {cifraDeTablero(t.nc)} / {cifraDeTablero(t.nv)}
                        </strong>
                      </p>
                    </li>
                  ))}
                </ul>
                <table className="mt-3 hidden w-full text-body-sm sm:table">
                  <thead>
                    <tr className="text-left text-caption uppercase tracking-wide">
                      <th className="pb-1 font-medium">Sede</th>
                      <th className="pb-1 text-right font-medium">Hoy</th>
                      <th className="pb-1 text-right font-medium">Quedaría</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fuera.map((t) => (
                      <tr key={t.sedeId}>
                        <td className="py-0.5 pr-2">{t.sedeNombre}</td>
                        <td className="pc-numeric py-0.5 text-right whitespace-nowrap">
                          {cifraDeTablero(t.compra)} / {cifraDeTablero(t.venta)}
                        </td>
                        <td className="pc-numeric py-0.5 text-right font-semibold whitespace-nowrap">
                          {cifraDeTablero(t.nc)} / {cifraDeTablero(t.nv)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Alert>
            ) : completo && !mal && fila.tasas.length > 0 ? (
              <p className="text-body-sm text-text-secondary">
                Ninguna de las {fila.tasas.length} {fila.tasas.length === 1 ? "tasa guardada" : "tasas guardadas"} de esta moneda
                queda fuera.
              </p>
            ) : null}
            <p className="text-body-sm text-text-secondary">Las operaciones ya registradas no cambian.</p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" loading={enviando} disabled={!completo || Boolean(mal)}>
              {fila.rango ? "Guardar el rango" : "Definir el rango"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------
 * Retirar
 * ---------------------------------------------------------------------- */

function RetirarRango({
  fila,
  onCerrar,
  onHecho,
}: {
  fila: FilaDeRango;
  onCerrar: () => void;
  onHecho: (mensaje: string) => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoRango, FormData>(retirarRangoAction, null);
  React.useEffect(() => {
    if (estado?.ok) onHecho(estado.mensaje);
  }, [estado, onHecho]);
  const MOTIVO: FieldSpec = {
    id: "rango-motivo",
    label: "Motivo",
    required: true,
    description: "Al menos 10 caracteres. Queda en la auditoría con tu nombre.",
  };
  const n = fila.tasas.length;

  return (
    <Dialog open onOpenChange={(o) => (o ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Retirar el rango del {fila.code}</DialogTitle>
          <DialogDescription>Ninguna sede podrá cotizar {fila.nombre.toLowerCase()} hasta que se defina de nuevo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviarSinReiniciar(accion)} noValidate>
          <input type="hidden" name="moneda" value={fila.code} />
          <DialogBody className="flex flex-col gap-4">
            {estado && !estado.ok ? (
              <Alert variant="error" title="No se pudo retirar">
                {estado.error}
              </Alert>
            ) : null}
            <Alert variant="warning" title={n === 0 ? "Ninguna sede tiene tasa de esta moneda" : `${n} ${n === 1 ? "sede deja" : "sedes dejan"} de cotizarlo`}>
              {n > 0 ? (
                <p>
                  {fila.tasas.map((t) => t.sedeNombre).join(", ")} dejarán de cotizarlo y de mostrarlo en su tablero. Sus tasas
                  no se borran: vuelven, ajustadas al rango, si se define de nuevo.
                </p>
              ) : (
                <p>Ninguna sede deja de cotizar nada.</p>
              )}
              <p className="mt-1">Las operaciones ya registradas no cambian.</p>
            </Alert>
            <Field {...MOTIVO}>
              <Input {...fieldAria(MOTIVO)} name="motivo" disabled={enviando} autoFocus />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" loading={enviando}>
              Retirar el rango
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
