"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Check, Minus, Search } from "lucide-react";

import {
  Alert,
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
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";
import { useFiltrosEnUrl } from "@/lib/filtros-en-url";
import { enviarSinReiniciar } from "@/lib/enviar-sin-reiniciar";
import { cambiarServicioAction, type ResultadoServicio } from "./_actions";

/**
 * La matriz de sedes por servicios.
 *
 * Cada celda es un botón con su estado escrito —«Habilitado» o «No
 * habilitado»—, no un interruptor: cambiarlo tiene consecuencias que la
 * confirmación tiene que nombrar antes, y un interruptor invita a pulsarlo
 * sin leer. En escritorio, tabla; por debajo, una tarjeta por sede.
 */

export interface FilaDeServicios {
  id: string;
  nombre: string;
  codigo: string;
  municipio: string;
  provincia: string;
  operadorId: string | null;
  operador: string | null;
  /** Solo una sede activa necesita al menos un servicio. */
  activa: boolean;
  servicios: readonly string[];
}

interface Servicio {
  id: string;
  nombre: string;
}

const BUSQUEDA: FieldSpec = { id: "servicios-busqueda", label: "Buscar sede" };
const OPERADOR: FieldSpec = { id: "servicios-operador", label: "Operador" };
const PROVINCIA: FieldSpec = { id: "servicios-provincia", label: "Provincia" };
const TODOS = "todos";
const SIN_OPERADOR = "sin-operador";

const SELECT =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-secondary";

export function MatrizDeServicios({
  filas,
  servicios,
  proximos,
  inicial = {},
}: {
  filas: readonly FilaDeServicios[];
  servicios: readonly Servicio[];
  proximos: readonly string[];
  inicial?: Record<string, string | undefined>;
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [texto, setTexto] = React.useState(inicial.texto ?? "");
  const [operador, setOperador] = React.useState(inicial.operador ?? TODOS);
  const [provincia, setProvincia] = React.useState(inicial.provincia ?? TODOS);
  const [cambio, setCambio] = React.useState<{ fila: FilaDeServicios; servicio: Servicio } | null>(null);
  const [hecho, setHecho] = React.useState<string | null>(null);
  useFiltrosEnUrl({ texto, operador, provincia }, { operador: TODOS, provincia: TODOS });

  const operadores = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const f of filas) if (f.operadorId && f.operador) m.set(f.operadorId, f.operador);
    return [...m].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [filas]);
  const provincias = React.useMemo(() => [...new Set(filas.map((f) => f.provincia))].sort((a, b) => a.localeCompare(b, "es")), [filas]);

  const q = texto.trim().toLowerCase();
  const visibles = filas
    .filter(
      (f) =>
        (!q || f.nombre.toLowerCase().includes(q) || f.codigo.toLowerCase().includes(q)) &&
        (operador === TODOS || (operador === SIN_OPERADOR ? f.operadorId === null : f.operadorId === operador)) &&
        (provincia === TODOS || f.provincia === provincia),
    )
    .slice()
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const abrir = (fila: FilaDeServicios, servicio: Servicio) => {
    setHecho(null);
    setCambio({ fila, servicio });
  };

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Field {...BUSQUEDA}>
          <Input
            {...fieldAria(BUSQUEDA)}
            type="search"
            disabled={!hydrated}
            value={texto}
            onChange={(e) => setTexto(e.currentTarget.value)}
            placeholder="Código o nombre"
            prefix={<Search className="size-[18px]" aria-hidden="true" />}
          />
        </Field>
        <Field {...OPERADOR}>
          <select {...fieldAria(OPERADOR)} disabled={!hydrated} value={operador} onChange={(e) => setOperador(e.currentTarget.value)} className={SELECT}>
            <option value={TODOS}>Todos los operadores</option>
            <option value={SIN_OPERADOR}>Sin operador asignado</option>
            {operadores.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field {...PROVINCIA}>
          <select {...fieldAria(PROVINCIA)} disabled={!hydrated} value={provincia} onChange={(e) => setProvincia(e.currentTarget.value)} className={SELECT}>
            <option value={TODOS}>Todas las provincias</option>
            {provincias.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {hecho ? (
        <Alert variant="success" title="Hecho" className="mb-6">
          {hecho}
        </Alert>
      ) : null}

      {visibles.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-body text-text-primary">Ninguna sede coincide con estos filtros.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Escritorio: tabla. */}
          <div className="hidden overflow-hidden rounded-card border border-border bg-surface lg:block">
            <table className="w-full text-body">
              <thead className="bg-surface-subtle">
                <tr className="text-left text-caption uppercase tracking-wide text-text-secondary">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Sede
                  </th>
                  {servicios.map((s) => (
                    <th key={s.id} scope="col" className="px-4 py-3 font-medium">
                      <span className="block">{s.nombre}</span>
                      <span className="block font-normal normal-case tracking-normal">
                        en {visibles.filter((f) => f.servicios.includes(s.id)).length} de {visibles.length}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibles.map((f) => (
                  <tr key={f.id}>
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <EnlaceSede fila={f} />
                      <span className="block text-caption text-text-secondary">
                        {f.codigo} · {f.operador ?? "Sin operador"}
                      </span>
                    </th>
                    {servicios.map((s) => (
                      <td key={s.id} className="px-4 py-3">
                        <Celda fila={f} servicio={s} disabled={!hydrated} onClick={() => abrir(f, s)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tableta y teléfono: una tarjeta por sede. */}
          <ul className="grid gap-4 md:grid-cols-2 lg:hidden">
            {visibles.map((f) => (
              <li key={f.id}>
                <Card className="h-full">
                  <CardContent className="flex flex-col gap-3 pt-6">
                    <div>
                      <EnlaceSede fila={f} />
                      <p className="text-body-sm text-text-secondary">
                        {f.codigo} · {f.operador ?? "Sin operador"}
                      </p>
                    </div>
                    <ul className="flex flex-col divide-y divide-border">
                      {servicios.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                          <span className="text-body text-text-primary">{s.nombre}</span>
                          <Celda fila={f} servicio={s} disabled={!hydrated} onClick={() => abrir(f, s)} />
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      {proximos.length > 0 ? (
        <p className="mt-6 text-body-sm text-text-secondary">
          <span className="font-medium text-text-primary">Llegarán más adelante:</span> {proximos.join(", ")}. Todavía no
          se pueden habilitar en ninguna sede.
        </p>
      ) : null}

      {cambio ? (
        <DialogoDeServicio
          key={`${cambio.fila.id}-${cambio.servicio.id}`}
          fila={cambio.fila}
          servicio={cambio.servicio}
          onCerrar={() => setCambio(null)}
          onHecho={(m) => {
            setCambio(null);
            setHecho(m);
          }}
        />
      ) : null}
    </>
  );
}

function Celda({
  fila,
  servicio,
  disabled,
  onClick,
}: {
  fila: FilaDeServicios;
  servicio: Servicio;
  disabled: boolean;
  onClick: () => void;
}): React.JSX.Element {
  const on = fila.servicios.includes(servicio.id);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={`${servicio.nombre} en ${fila.nombre}: ${on ? "habilitado" : "no habilitado"}. Cambiar`}
      className={cn(
        "inline-flex min-h-control-sm items-center gap-1.5 rounded-control border px-3 text-label font-medium outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed",
        on
          ? "border-success-border bg-success-subtle text-success-foreground hover:brightness-95"
          : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
      )}
    >
      {on ? <Check className="size-4" aria-hidden="true" /> : <Minus className="size-4" aria-hidden="true" />}
      {on ? "Habilitado" : "No habilitado"}
    </button>
  );
}

function DialogoDeServicio({
  fila,
  servicio,
  onCerrar,
  onHecho,
}: {
  fila: FilaDeServicios;
  servicio: Servicio;
  onCerrar: () => void;
  onHecho: (mensaje: string) => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoServicio, FormData>(cambiarServicioAction, null);
  const habilitar = !fila.servicios.includes(servicio.id);
  const ultimo = !habilitar && fila.activa && fila.servicios.length === 1;
  const esCambio = servicio.id === "cambio-moneda";
  const MOTIVO: FieldSpec = {
    id: "servicio-motivo",
    label: "Motivo",
    required: true,
    description: "Al menos 10 caracteres. Queda en la auditoría con tu nombre.",
  };

  React.useEffect(() => {
    if (estado?.ok) onHecho(estado.mensaje);
  }, [estado, onHecho]);

  return (
    <Dialog open onOpenChange={(v) => (v ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            {habilitar ? "Habilitar" : "Deshabilitar"} {servicio.nombre} en {fila.nombre}
          </DialogTitle>
          <DialogDescription>
            {/* Sin punto final propio: muchos nombres de empresa ya acaban en «S.A.» o «S.R.L.». */}
            {fila.operador ? `Sede de ${fila.operador.replace(/\.$/, "")}.` : "Sede sin operador."}
          </DialogDescription>
        </DialogHeader>
        {ultimo ? (
          <>
            <DialogBody>
              <Alert variant="error" title="Es el único servicio de esta sede">
                Una sede activa necesita ofrecer al menos un servicio. Habilita otro antes de quitar este, o suspende la sede
                desde su ficha si tiene que dejar de operar.
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Entendido</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={enviarSinReiniciar(accion)} noValidate>
            <input type="hidden" name="sede" value={fila.id} />
            <input type="hidden" name="servicio" value={servicio.id} />
            <input type="hidden" name="habilitar" value={habilitar ? "1" : "0"} />
            <DialogBody className="flex flex-col gap-4">
              {estado && !estado.ok ? (
                <Alert variant="error" title="No se pudo cambiar">
                  {estado.error}
                </Alert>
              ) : null}
              <Alert variant={habilitar ? "info" : "warning"} title="Qué cambia">
                <ul className="list-disc space-y-1 pl-5">
                  {habilitar ? (
                    <li>Aparece en el catálogo de las cajas de la sede y en su kiosco de autoservicio, y se puede iniciar desde ya.</li>
                  ) : (
                    <li>Deja de aparecer en el catálogo de las cajas de la sede y en su kiosco de autoservicio, y no se puede iniciar.</li>
                  )}
                  {esCambio && habilitar ? (
                    <li>Su operador podrá fijar las tasas de compra y venta de sus monedas, dentro de los rangos de PuntoCash.</li>
                  ) : null}
                  {esCambio && !habilitar ? (
                    <li>
                      Sus tasas dejan de mostrarse en el tablero y de poder cotizarse de inmediato. Se conservan, y vuelven si se
                      habilita de nuevo. Su lista de monedas no cambia: la siguen necesitando remesas y giros.
                    </li>
                  ) : null}
                  {!habilitar ? <li>Las operaciones ya hechas no cambian.</li> : null}
                </ul>
              </Alert>
              {!habilitar ? (
                <Field {...MOTIVO}>
                  <Input {...fieldAria(MOTIVO)} name="motivo" disabled={enviando} autoFocus />
                </Field>
              ) : null}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" variant={habilitar ? "primary" : "destructive"} loading={enviando}>
                {habilitar ? "Habilitar" : "Deshabilitar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EnlaceSede({ fila }: { fila: FilaDeServicios }): React.JSX.Element {
  return (
    <Link href={`/super-admin/sedes/${fila.id}` as Route} className="font-medium text-text-primary underline-offset-4 hover:underline">
      {fila.nombre}
    </Link>
  );
}
