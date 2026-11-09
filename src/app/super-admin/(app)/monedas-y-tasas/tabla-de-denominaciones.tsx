"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
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
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";
import { enviarSinReiniciar } from "@/lib/enviar-sin-reiniciar";
import { formatoDeDenominacion } from "@/features/caja/billetes";
import {
  anadirDenominacionAction,
  reincorporarDenominacionAction,
  retirarDenominacionAction,
  type ResultadoDenominacion,
} from "./_denominaciones-actions";

/**
 * Las denominaciones de cada moneda: los billetes y monedas que las cajas de
 * toda la red aceptan del cliente y entregan. Una moneda sin ninguna no se
 * puede operar en efectivo. Retirar una no la saca de las cajas: lo que haya
 * se queda en el inventario hasta que se retire de la caja.
 */

export interface DenominacionEnTabla {
  valor: number;
  tipo: "billete" | "moneda";
  /** Fecha de retirada ya formateada, o `null` si se acepta. */
  retirada: string | null;
  /** Lo que hay ahora en cajas abiertas. */
  cajas: number;
  unidades: number;
}

export interface FilaDeDenominaciones {
  code: string;
  nombre: string;
  /** La moneda está retirada del catálogo de la plataforma. */
  monedaRetirada: boolean;
  denominaciones: readonly DenominacionEnTabla[];
}

type Abierto =
  | { accion: "anadir"; fila: FilaDeDenominaciones }
  | { accion: "retirar" | "reincorporar"; fila: FilaDeDenominaciones; d: DenominacionEnTabla };

/** «el billete de 20 USD», «la moneda de 0,25 USD». */
const nombreDe = (d: { tipo: "billete" | "moneda"; valor: number }, code: string) =>
  `${d.tipo === "billete" ? "el billete" : "la moneda"} de ${formatoDeDenominacion(d.valor)} ${code}`;

export function TablaDeDenominaciones({ filas }: { filas: readonly FilaDeDenominaciones[] }): React.JSX.Element {
  const hydrated = useHydrated();
  const [abierto, setAbierto] = React.useState<Abierto | null>(null);
  const [hecho, setHecho] = React.useState<string | null>(null);
  const cerrar = React.useCallback(() => setAbierto(null), []);
  const terminar = React.useCallback((m: string) => {
    setAbierto(null);
    setHecho(m);
  }, []);
  const abrir = (a: Abierto) => {
    setHecho(null);
    setAbierto(a);
  };

  return (
    <>
      <p className="mb-4 text-body-sm text-text-secondary sm:max-w-3xl">
        Los billetes y monedas de cada divisa que las cajas de toda la red aceptan y entregan. Con ellos lleva cada caja su
        inventario y el sistema propone con qué billetes pagar. Toca una denominación para retirarla o reincorporarla.
      </p>
      {hecho ? (
        <Alert variant="success" title="Hecho" className="mb-6">
          {hecho}
        </Alert>
      ) : null}
      <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Denominaciones por moneda">
        {filas.map((f) => {
          const activas = f.denominaciones.filter((d) => !d.retirada);
          return (
            <li key={f.code}>
              <Card>
                <CardContent className="flex flex-col gap-4 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-2.5">
                      <CurrencyFlag currency={f.code} />
                      <span className="flex flex-col leading-tight">
                        <span className="pc-numeric font-semibold text-text-primary">
                          {f.code}
                          {f.monedaRetirada ? (
                            <span className="ml-2 align-middle">
                              <Badge variant="warning">Moneda retirada</Badge>
                            </span>
                          ) : null}
                        </span>
                        <span className="text-caption text-text-secondary">{f.nombre}</span>
                      </span>
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!hydrated}
                      aria-label={`Añadir una denominación al ${f.code}`}
                      onClick={() => abrir({ accion: "anadir", fila: f })}
                    >
                      <Plus aria-hidden="true" />
                      Añadir
                    </Button>
                  </div>
                  {activas.length === 0 ? (
                    <Alert variant="warning" title="Sin denominaciones">
                      Ninguna caja puede aceptar ni entregar {f.code} en efectivo hasta que se añadan los billetes y monedas
                      que circulan.
                    </Alert>
                  ) : null}
                  <Grupo
                    titulo="Billetes"
                    fila={f}
                    lista={f.denominaciones.filter((d) => d.tipo === "billete")}
                    disabled={!hydrated}
                    onElegir={(d) => abrir({ accion: d.retirada ? "reincorporar" : "retirar", fila: f, d })}
                  />
                  <Grupo
                    titulo="Monedas"
                    fila={f}
                    lista={f.denominaciones.filter((d) => d.tipo === "moneda")}
                    disabled={!hydrated}
                    onElegir={(d) => abrir({ accion: d.retirada ? "reincorporar" : "retirar", fila: f, d })}
                  />
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
      {abierto?.accion === "anadir" ? <AnadirDenominacion fila={abierto.fila} onCerrar={cerrar} onHecho={terminar} /> : null}
      {abierto?.accion === "retirar" ? (
        <RetirarDenominacion key={`${abierto.fila.code}-${abierto.d.valor}`} fila={abierto.fila} d={abierto.d} onCerrar={cerrar} onHecho={terminar} />
      ) : null}
      {abierto?.accion === "reincorporar" ? (
        <ReincorporarDenominacion key={`${abierto.fila.code}-${abierto.d.valor}`} fila={abierto.fila} d={abierto.d} onCerrar={cerrar} onHecho={terminar} />
      ) : null}
    </>
  );
}

function Grupo({
  titulo,
  fila,
  lista,
  disabled,
  onElegir,
}: {
  titulo: string;
  fila: FilaDeDenominaciones;
  lista: readonly DenominacionEnTabla[];
  disabled: boolean;
  onElegir: (d: DenominacionEnTabla) => void;
}): React.JSX.Element | null {
  if (lista.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-caption font-medium uppercase tracking-wide text-text-secondary">{titulo}</h3>
      <ul className="flex flex-wrap gap-2" aria-label={`${titulo} del ${fila.code}`}>
        {lista.map((d) => (
          <li key={d.valor}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onElegir(d)}
              aria-label={`${d.retirada ? "Reincorporar" : "Retirar"} ${nombreDe(d, fila.code)}${d.retirada ? " (retirada)" : ""}`}
              className={cn(
                "pc-numeric inline-flex min-h-control-sm min-w-12 items-center justify-center rounded-md border px-3 text-label font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                d.retirada
                  ? "border-dashed border-error bg-error-subtle font-semibold text-error-foreground line-through decoration-2 hover:bg-error/5"
                  : "border-border bg-surface-subtle text-text-primary hover:border-primary",
              )}
            >
              {formatoDeDenominacion(d.valor)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const VALOR: FieldSpec = {
  id: "denominacion-valor",
  label: "Valor",
  required: true,
  description: "El valor impreso, hasta 2 decimales: 20, 0,25.",
};

function AnadirDenominacion({
  fila,
  onCerrar,
  onHecho,
}: {
  fila: FilaDeDenominaciones;
  onCerrar: () => void;
  onHecho: (m: string) => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoDenominacion, FormData>(anadirDenominacionAction, null);
  React.useEffect(() => {
    if (estado?.ok) onHecho(estado.mensaje);
  }, [estado, onHecho]);
  const [tipo, setTipo] = React.useState<"billete" | "moneda">("billete");

  return (
    <Dialog open onOpenChange={(o) => (o ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Añadir una denominación al {fila.code}</DialogTitle>
          <DialogDescription>Desde que la añadas, todas las cajas con {fila.code} la aceptan del cliente y la entregan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviarSinReiniciar(accion)} noValidate>
          <input type="hidden" name="moneda" value={fila.code} />
          <input type="hidden" name="tipo" value={tipo} />
          <DialogBody className="flex flex-col gap-5">
            {estado && !estado.ok ? (
              <Alert variant="error" title="No se pudo añadir">
                {estado.error}
              </Alert>
            ) : null}
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-label font-medium text-text-primary">Tipo</legend>
              <div className="flex gap-4">
                {(["billete", "moneda"] as const).map((t) => (
                  <label key={t} className="inline-flex min-h-control-sm items-center gap-2 text-body-sm text-text-primary">
                    <input type="radio" name="tipo-elegido" value={t} checked={tipo === t} disabled={enviando} onChange={() => setTipo(t)} />
                    {t === "billete" ? "Billete" : "Moneda"}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field {...VALOR}>
              <Input {...fieldAria(VALOR)} name="valor" inputMode="decimal" disabled={enviando} autoFocus className="pc-numeric" />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" loading={enviando}>
              Añadir la denominación
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RetirarDenominacion({
  fila,
  d,
  onCerrar,
  onHecho,
}: {
  fila: FilaDeDenominaciones;
  d: DenominacionEnTabla;
  onCerrar: () => void;
  onHecho: (m: string) => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoDenominacion, FormData>(retirarDenominacionAction, null);
  React.useEffect(() => {
    if (estado?.ok) onHecho(estado.mensaje);
  }, [estado, onHecho]);
  const MOTIVO: FieldSpec = {
    id: "denominacion-motivo",
    label: "Motivo",
    required: true,
    description: "Al menos 10 caracteres. Queda en la auditoría con tu nombre.",
  };
  const ultima = fila.denominaciones.filter((x) => !x.retirada).length === 1;

  return (
    <Dialog open onOpenChange={(o) => (o ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Retirar {nombreDe(d, fila.code)}</DialogTitle>
          <DialogDescription>Las cajas dejan de aceptarla del cliente y el sistema deja de proponerla para pagar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviarSinReiniciar(accion)} noValidate>
          <input type="hidden" name="moneda" value={fila.code} />
          <input type="hidden" name="valor" value={String(d.valor)} />
          <DialogBody className="flex flex-col gap-4">
            {estado && !estado.ok ? (
              <Alert variant="error" title="No se pudo retirar">
                {estado.error}
              </Alert>
            ) : null}
            <Alert
              variant="warning"
              title={
                d.unidades === 0
                  ? "Ninguna caja abierta tiene unidades"
                  : `Quedan ${d.unidades} ${d.unidades === 1 ? "unidad" : "unidades"} en ${d.cajas} ${d.cajas === 1 ? "caja abierta" : "cajas abiertas"}`
              }
            >
              <p>
                {d.unidades === 0
                  ? "No hay que sacar nada de ninguna caja."
                  : "Se quedan en el inventario de cada caja hasta que el supervisor las retire de ella."}{" "}
                Los movimientos ya registrados no cambian.
              </p>
              {ultima ? <p className="mt-1">Es la última denominación del {fila.code}: ninguna caja podrá operarlo en efectivo.</p> : null}
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
              Retirar la denominación
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReincorporarDenominacion({
  fila,
  d,
  onCerrar,
  onHecho,
}: {
  fila: FilaDeDenominaciones;
  d: DenominacionEnTabla;
  onCerrar: () => void;
  onHecho: (m: string) => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoDenominacion, FormData>(reincorporarDenominacionAction, null);
  React.useEffect(() => {
    if (estado?.ok) onHecho(estado.mensaje);
  }, [estado, onHecho]);
  return (
    <Dialog open onOpenChange={(o) => (o ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Reincorporar {nombreDe(d, fila.code)}</DialogTitle>
          <DialogDescription>
            Las cajas vuelven a aceptarla y el sistema vuelve a proponerla para pagar. Retirada el {d.retirada}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviarSinReiniciar(accion)} noValidate>
          <input type="hidden" name="moneda" value={fila.code} />
          <input type="hidden" name="valor" value={String(d.valor)} />
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
              Reincorporar la denominación
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
