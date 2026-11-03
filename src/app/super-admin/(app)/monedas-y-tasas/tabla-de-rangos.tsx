"use client";

import * as React from "react";
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";

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
import { SELECT } from "../equipos/controles";
import { ActionMenu, type AccionDeMenu } from "@/components/patterns/action-menu";
import { DECIMALES_DE_MONEDA } from "@/features/network/decimales";
import { MONEDAS_ISO } from "@/features/network/iso-monedas";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import { cifraDeTablero } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { enviarSinReiniciar } from "@/lib/enviar-sin-reiniciar";
import {
  anadirMonedaAlCatalogoAction,
  definirRangoAction,
  reincorporarMonedaAction,
  retirarMonedaDelCatalogoAction,
  retirarRangoAction,
  type ResultadoRango,
} from "./_actions";

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
  simbolo: string;
  /** Fecha en que se retiró del catálogo, ya formateada, o `null` si sigue disponible. */
  retirada: string | null;
  /** Cajas activas que la tienen habilitada hoy (`enLista` son las sedes). */
  cajas: number;
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
  const [abierto, setAbierto] = React.useState<
    { accion: "anadir" } | { fila: FilaDeRango; accion: "editar" | "retirar" | "retirar-moneda" | "reincorporar" } | null
  >(null);
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
        <span className="flex justify-end py-1.5">
          <ActionMenu
            label={`Acciones de ${f.code}`}
            disabled={!hydrated}
            acciones={accionesDe(f, (accion) => {
              setHecho(null);
              setAbierto({ fila: f, accion });
            })}
          />
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <p className="text-body-sm text-text-secondary sm:max-w-3xl">
          Estas son las monedas de la plataforma: de aquí elige cada mercante las de sus sedes, y cada operador fija la tasa
          de su sede dentro del rango de la moneda. El peso cubano es la moneda de referencia: no lleva rango y no se puede
          retirar.
        </p>
        <Button
          variant="secondary"
          className="self-start"
          disabled={!hydrated}
          onClick={() => {
            setHecho(null);
            setAbierto({ accion: "anadir" });
          }}
        >
          <Plus aria-hidden="true" />
          Añadir moneda
        </Button>
      </div>
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
        cardBadge={(f) =>
          f.retirada ? (
            <Badge variant="warning">Retirada</Badge>
          ) : f.rango ? (
            <Badge variant="success">Cotizable</Badge>
          ) : (
            <Badge variant="neutral">No cotizable</Badge>
          )
        }
        empty={null}
      />
      {abierto?.accion === "anadir" ? <AnadirMonedaAlCatalogo enCatalogo={["CUP", ...filas.map((f) => f.code)]} onCerrar={cerrar} onHecho={terminar} /> : null}
      {abierto?.accion === "retirar-moneda" ? <RetirarMonedaDelCatalogo key={abierto.fila.code} fila={abierto.fila} onCerrar={cerrar} onHecho={terminar} /> : null}
      {abierto?.accion === "reincorporar" ? <ReincorporarMoneda key={abierto.fila.code} fila={abierto.fila} onCerrar={cerrar} onHecho={terminar} /> : null}
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
        <span className="pc-numeric font-semibold text-text-primary">
          {fila.code}
          {fila.retirada ? <span className="ml-2 align-middle"><Badge variant="warning">Retirada</Badge></span> : null}
        </span>
        <span className="whitespace-nowrap text-caption text-text-secondary">{fila.nombre}</span>
        <span className="whitespace-nowrap text-caption text-text-secondary">
          {fila.simbolo}
        </span>
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
  /* Cambiar un rango ya definido se explica; definir el primero, no. */
  const MOTIVO_DEL_CAMBIO: FieldSpec = {
    id: "rango-cambio-motivo",
    label: "Motivo del cambio",
    required: true,
    description: "Al menos 10 caracteres. Queda en la auditoría con tu nombre.",
  };
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

            {fila.rango ? (
              <Field {...MOTIVO_DEL_CAMBIO}>
                <Input {...fieldAria(MOTIVO_DEL_CAMBIO)} name="motivo" disabled={enviando} />
              </Field>
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

/** Las acciones de una fila, según su estado: rango, y alta o baja del catálogo. */
function accionesDe(f: FilaDeRango, abrir: (a: "editar" | "retirar" | "retirar-moneda" | "reincorporar") => void): AccionDeMenu[] {
  const acciones: AccionDeMenu[] = [];
  if (!(f.retirada && !f.rango)) {
    acciones.push({
      key: "editar",
      label: f.rango ? "Cambiar rango" : "Definir rango",
      ariaLabel: `${f.rango ? "Cambiar" : "Definir"} el rango del ${f.code}`,
      icon: f.rango ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />,
      onSelect: () => abrir("editar"),
    });
  }
  if (f.rango) {
    acciones.push({
      key: "retirar",
      label: "Retirar rango",
      ariaLabel: `Retirar el rango del ${f.code}`,
      icon: <Trash2 aria-hidden="true" />,
      destructiva: true,
      onSelect: () => abrir("retirar"),
    });
  }
  acciones.push(
    f.retirada
      ? {
          key: "reincorporar",
          label: "Reincorporar al catálogo",
          ariaLabel: `Reincorporar el ${f.code} al catálogo`,
          icon: <RotateCcw aria-hidden="true" />,
          onSelect: () => abrir("reincorporar"),
        }
      : {
          key: "retirar-moneda",
          label: "Retirar del catálogo",
          ariaLabel: `Retirar el ${f.code} del catálogo`,
          icon: <Trash2 aria-hidden="true" />,
          destructiva: true,
          onSelect: () => abrir("retirar-moneda"),
        },
  );
  return acciones;
}

/* -------------------------------------------------------------------------
 * El catálogo: añadir, retirar, reincorporar
 * ---------------------------------------------------------------------- */

const CODIGO: FieldSpec = {
  id: "moneda-codigo",
  label: "Moneda",
  required: true,
  description: "De la lista ISO 4217: el código, el nombre y el símbolo vienen con ella y no se escriben.",
};

function AnadirMonedaAlCatalogo({
  enCatalogo,
  onCerrar,
  onHecho,
}: {
  enCatalogo: readonly string[];
  onCerrar: () => void;
  onHecho: (m: string) => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoRango, FormData>(anadirMonedaAlCatalogoAction, null);
  React.useEffect(() => {
    if (estado?.ok) onHecho(estado.mensaje);
  }, [estado, onHecho]);
  const [codigo, setCodigo] = React.useState("");
  const ofrecidas = MONEDAS_ISO.filter((m) => !enCatalogo.includes(m[0]));
  const elegida = ofrecidas.find((m) => m[0] === codigo);

  return (
    <Dialog open onOpenChange={(o) => (o ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Añadir una moneda al catálogo</DialogTitle>
          <DialogDescription>
            Queda a disposición de toda la red. No se activa en ninguna sede: cada mercante la añade a las suyas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviarSinReiniciar(accion)} noValidate>
          <DialogBody className="flex flex-col gap-5">
            {estado && !estado.ok ? (
              <Alert variant="error" title="No se pudo añadir">
                {estado.error}
              </Alert>
            ) : null}
            <Field {...CODIGO}>
              <select
                {...fieldAria(CODIGO)}
                name="codigo"
                value={codigo}
                disabled={enviando}
                autoFocus
                onChange={(e) => setCodigo(e.currentTarget.value)}
                className={SELECT}
              >
                <option value="">Elige una moneda</option>
                {ofrecidas.map((m) => (
                  <option key={m[0]} value={m[0]}>
                    {m[0]} · {m[1]}
                  </option>
                ))}
              </select>
            </Field>
            {elegida ? (
              <dl className="grid grid-cols-3 gap-4 rounded-md border border-border bg-surface-subtle p-4 text-body-sm">
                <div>
                  <dt className="text-text-secondary">Código</dt>
                  <dd className="pc-numeric font-medium text-text-primary">{elegida[0]}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary">Símbolo</dt>
                  <dd className="font-medium text-text-primary">{elegida[2]}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary">Decimales</dt>
                  <dd className="font-medium text-text-primary">{DECIMALES_DE_MONEDA}, fijos</dd>
                </div>
              </dl>
            ) : null}
            <p className="text-body-sm text-text-secondary">
              Para que las sedes puedan cotizarla, define después su rango contra el peso cubano.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" loading={enviando} disabled={!elegida}>
              Añadir la moneda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RetirarMonedaDelCatalogo({
  fila,
  onCerrar,
  onHecho,
}: {
  fila: FilaDeRango;
  onCerrar: () => void;
  onHecho: (m: string) => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoRango, FormData>(retirarMonedaDelCatalogoAction, null);
  React.useEffect(() => {
    if (estado?.ok) onHecho(estado.mensaje);
  }, [estado, onHecho]);
  const MOTIVO: FieldSpec = {
    id: "moneda-retiro-motivo",
    label: "Motivo",
    required: true,
    description: "Al menos 10 caracteres. Queda en la auditoría con tu nombre.",
  };
  const sedes = fila.enLista;

  return (
    <Dialog open onOpenChange={(o) => (o ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Retirar el {fila.code} del catálogo</DialogTitle>
          <DialogDescription>
            Ningún mercante podrá añadir {fila.nombre.toLowerCase()} a una sede. Solo cambia lo que viene.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviarSinReiniciar(accion)} noValidate>
          <input type="hidden" name="moneda" value={fila.code} />
          <DialogBody className="flex flex-col gap-4">
            {estado && !estado.ok ? (
              <Alert variant="error" title="No se pudo retirar">
                {estado.error}
              </Alert>
            ) : null}
            <Alert
              variant="warning"
              title={
                sedes === 0
                  ? "Ninguna sede la tiene en su lista"
                  : `Seguirá en ${sedes} ${sedes === 1 ? "sede" : "sedes"}, en ${fila.cajas} ${fila.cajas === 1 ? "caja" : "cajas"}`
              }
            >
              <p>
                {sedes === 0
                  ? "Nadie deja de usarla."
                  : "No se quita de las sedes que ya la tienen: quitarla de cada una es decisión de su mercante."}{" "}
                No toca saldos ni ningún registro histórico.
              </p>
              {fila.rango ? <p className="mt-1">Su rango y las tasas de las sedes que la cotizan se mantienen.</p> : null}
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
              Retirar la moneda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReincorporarMoneda({
  fila,
  onCerrar,
  onHecho,
}: {
  fila: FilaDeRango;
  onCerrar: () => void;
  onHecho: (m: string) => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoRango, FormData>(reincorporarMonedaAction, null);
  React.useEffect(() => {
    if (estado?.ok) onHecho(estado.mensaje);
  }, [estado, onHecho]);
  return (
    <Dialog open onOpenChange={(o) => (o ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Reincorporar el {fila.code} al catálogo</DialogTitle>
          <DialogDescription>
            Los mercantes podrán volver a añadir {fila.nombre.toLowerCase()} a sus sedes. Retirada el {fila.retirada}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviarSinReiniciar(accion)} noValidate>
          <input type="hidden" name="moneda" value={fila.code} />
          <DialogBody>
            {estado && !estado.ok ? (
              <Alert variant="error" title="No se pudo reincorporar">
                {estado.error}
              </Alert>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" loading={enviando}>
              Reincorporar la moneda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
