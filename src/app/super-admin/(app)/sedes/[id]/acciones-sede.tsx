"use client";

import * as React from "react";
import { Ban, Link2, Link2Off, PauseCircle, PlayCircle, SlidersHorizontal } from "lucide-react";

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
  Input,
  type FieldSpec,
} from "@/components/ui";
import { useHydrated } from "@/lib/use-hydrated";
import { enviarSinReiniciar } from "@/lib/enviar-sin-reiniciar";
import {
  asignarSedeAction,
  cerrarSedeAction,
  fijarServiciosAction,
  reactivarSedeAction,
  revocarAsignacionAction,
  suspenderSedeAction,
  type ResultadoAccionSede,
} from "../_actions";

/**
 * Las acciones de la ficha de una sede, cada una en su diálogo.
 *
 * Todas vuelven a la ficha al terminar (`?hecho=`), que es quien dice qué ha
 * pasado: tras asignar, el botón «Asignar» deja de existir, y un mensaje de
 * éxito dentro de su diálogo desaparecería con él.
 *
 * Revocar y cerrar **no se ofrecen** con jornadas abiertas: el diálogo lo dice
 * y las enumera, en vez de dejar escribir un motivo para luego rechazarlo.
 */

export interface JornadaAbierta {
  id: string;
  caja: string;
  trabajador: string;
  desde: string;
}

const MOTIVO: FieldSpec = {
  id: "sede-accion-motivo",
  label: "Motivo",
  required: true,
  description: "Al menos 10 caracteres. Queda en la auditoría con tu nombre.",
};
const OPERADOR: FieldSpec = { id: "sede-accion-operador", label: "Operador", required: true };

const SELECT =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle";

/* -------------------------------------------------------------------------
 * Servicios
 * ---------------------------------------------------------------------- */

export function CambiarServicios({
  sedeId,
  servicios,
  habilitados,
}: {
  sedeId: string;
  servicios: readonly { id: string; nombre: string }[];
  habilitados: readonly string[];
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [abierto, setAbierto] = React.useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" disabled={!hydrated} onClick={() => setAbierto(true)}>
        <SlidersHorizontal aria-hidden="true" />
        Cambiar servicios
      </Button>
      {abierto ? (
        <DialogoServicios sedeId={sedeId} servicios={servicios} habilitados={habilitados} onCerrar={() => setAbierto(false)} />
      ) : null}
    </>
  );
}

function DialogoServicios({
  sedeId,
  servicios,
  habilitados,
  onCerrar,
}: {
  sedeId: string;
  servicios: readonly { id: string; nombre: string }[];
  habilitados: readonly string[];
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccionSede, FormData>(fijarServiciosAction, null);
  const [marcados, setMarcados] = React.useState<Set<string>>(() => new Set(habilitados));
  const quita = habilitados.some((h) => !marcados.has(h));

  return (
    <Dialog open onOpenChange={(v) => (v ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Servicios de la sede</DialogTitle>
          <DialogDescription>Lo que la sede puede ofrecer. El cambio vale desde ahora.</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviarSinReiniciar(accion)} noValidate>
          <input type="hidden" name="sede" value={sedeId} />
          <DialogBody className="flex flex-col gap-4">
            {estado ? (
              <Alert variant="error" title="No se pudo guardar">
                {estado.error}
              </Alert>
            ) : null}
            <fieldset>
              <legend className="sr-only">Servicios habilitados</legend>
              <ul className="flex flex-col divide-y divide-border rounded-card border border-border">
                {servicios.map((s) => (
                  <li key={s.id}>
                    <label className="flex items-center gap-3 px-4 py-3 text-body text-text-primary">
                      <input
                        type="checkbox"
                        name="servicio"
                        value={s.id}
                        checked={marcados.has(s.id)}
                        disabled={enviando}
                        onChange={(e) => {
                          const sig = new Set(marcados);
                          if (e.currentTarget.checked) sig.add(s.id);
                          else sig.delete(s.id);
                          setMarcados(sig);
                        }}
                        className="size-5 shrink-0 accent-primary"
                      />
                      {s.nombre}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
            {quita ? (
              <>
                <Alert variant="warning" title="Quitas un servicio">
                  Desde ahora, ningún trabajador de la sede podrá prestarlo. Las operaciones ya hechas no cambian.
                </Alert>
                <CampoMotivo disabled={enviando} />
              </>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" loading={enviando}>
              Guardar servicios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------
 * Asignar y revocar
 * ---------------------------------------------------------------------- */

export function Asignar({
  sedeId,
  sedeNombre,
  operadores,
  hoy,
}: {
  sedeId: string;
  sedeNombre: string;
  operadores: readonly { id: string; nombre: string }[];
  /** Ya formateada en el servidor. */
  hoy: string;
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [abierto, setAbierto] = React.useState(false);
  return (
    <>
      <Button size="sm" disabled={!hydrated} onClick={() => setAbierto(true)}>
        <Link2 aria-hidden="true" />
        Asignar un operador
      </Button>
      {abierto ? (
        <DialogoAsignar sedeId={sedeId} sedeNombre={sedeNombre} operadores={operadores} hoy={hoy} onCerrar={() => setAbierto(false)} />
      ) : null}
    </>
  );
}

function DialogoAsignar({
  sedeId,
  sedeNombre,
  operadores,
  hoy,
  onCerrar,
}: {
  sedeId: string;
  sedeNombre: string;
  operadores: readonly { id: string; nombre: string }[];
  hoy: string;
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccionSede, FormData>(asignarSedeAction, null);
  const [operador, setOperador] = React.useState("");
  const elegido = operadores.find((o) => o.id === operador);

  return (
    <Dialog open onOpenChange={(v) => (v ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Asignar {sedeNombre}</DialogTitle>
          <DialogDescription>Entregar la sede a un operador para que la ponga en marcha.</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviarSinReiniciar(accion)} noValidate>
          <input type="hidden" name="sede" value={sedeId} />
          <DialogBody className="flex flex-col gap-4">
            {estado ? (
              <Alert variant="error" title="No se pudo asignar">
                {estado.error}
              </Alert>
            ) : null}
            {operadores.length === 0 ? (
              <Alert variant="warning" title="No hay operadores activos">
                Da de alta un operador antes de asignarle una sede.
              </Alert>
            ) : (
              <Field {...OPERADOR}>
                <select
                  {...fieldAria(OPERADOR)}
                  name="operador"
                  value={operador}
                  disabled={enviando}
                  onChange={(e) => setOperador(e.currentTarget.value)}
                  className={SELECT}
                >
                  <option value="" disabled>
                    Elige un operador activo
                  </option>
                  {operadores.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nombre}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <CampoMotivo disabled={enviando} />
            {elegido ? (
              <dl className="grid gap-2 rounded-card border border-border bg-surface-subtle p-4 text-body-sm">
                <Resumen etiqueta="Sede" valor={sedeNombre} />
                <Resumen etiqueta="Operador" valor={elegido.nombre} />
                <Resumen etiqueta="Desde" valor={hoy} />
              </dl>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" loading={enviando} disabled={!elegido}>
              Asignar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Revocar({
  sedeId,
  sedeNombre,
  operador,
  jornadasAbiertas,
}: {
  sedeId: string;
  sedeNombre: string;
  operador: string;
  jornadasAbiertas: readonly JornadaAbierta[];
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [abierto, setAbierto] = React.useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" disabled={!hydrated} onClick={() => setAbierto(true)}>
        <Link2Off aria-hidden="true" />
        Revocar
      </Button>
      {abierto ? (
        <DialogoConMotivo
          titulo={`Revocar ${sedeNombre} a ${operador}`}
          descripcion="Un cambio ordenado de operador, no una medida de urgencia: para eso está suspender."
          accionDelServidor={revocarAsignacionAction}
          sedeId={sedeId}
          confirmar="Revocar"
          destructiva
          bloqueo={jornadasAbiertas.length > 0 ? <Bloqueo jornadas={jornadasAbiertas} accion="revocar" /> : null}
          onCerrar={() => setAbierto(false)}
        >
          <Alert variant="warning" title="Qué pasa al revocar">
            <ul className="list-disc space-y-1 pl-5">
              <li>{operador} deja de ver la sede de inmediato.</li>
              <li>Sus trabajadores dejan de poder iniciar sesión.</li>
              <li>Nadie podrá crear cajas, vincular equipos ni fijar tasas hasta que se asigne otro operador.</li>
            </ul>
          </Alert>
          <p className="text-body-sm text-text-secondary">
            Las cajas y los equipos se quedan en la sede, y los trabajadores siguen adscritos: el próximo operador los
            encuentra tal cual y decide si los mantiene.
          </p>
        </DialogoConMotivo>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------
 * Estado: suspender, reactivar, cerrar
 * ---------------------------------------------------------------------- */

export function AccionesDeEstado({
  sedeId,
  sedeNombre,
  suspendida,
  jornadasAbiertas,
  cajas,
  equipos,
}: {
  sedeId: string;
  sedeNombre: string;
  suspendida: boolean;
  jornadasAbiertas: readonly JornadaAbierta[];
  cajas: number;
  equipos: number;
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [abierto, setAbierto] = React.useState<"suspender" | "reactivar" | "cerrar" | null>(null);
  const cerrar = () => setAbierto(null);

  return (
    <>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {suspendida ? (
          <Button disabled={!hydrated} onClick={() => setAbierto("reactivar")}>
            <PlayCircle aria-hidden="true" />
            Reactivar la sede
          </Button>
        ) : (
          <Button variant="secondary" disabled={!hydrated} onClick={() => setAbierto("suspender")}>
            <PauseCircle aria-hidden="true" />
            Suspender la sede
          </Button>
        )}
        <Button variant="destructive" disabled={!hydrated} onClick={() => setAbierto("cerrar")}>
          <Ban aria-hidden="true" />
          Cerrar la sede
        </Button>
      </div>

      {abierto === "suspender" ? (
        <DialogoConMotivo
          titulo={`Suspender ${sedeNombre}`}
          descripcion="La medida de urgencia de PuntoCash: corta el acceso a toda la sede, y se revierte reactivándola."
          accionDelServidor={suspenderSedeAction}
          sedeId={sedeId}
          confirmar="Suspender"
          destructiva
          onCerrar={cerrar}
        >
          <Alert variant="warning" title="Qué pasa al suspender">
            Ningún trabajador de la sede podrá iniciar sesión ni abrir jornadas nuevas. Sus administradores siguen
            viéndola, como suspendida.
          </Alert>
          {jornadasAbiertas.length > 0 ? (
            <Alert variant="error" title="Estas jornadas quedarán abiertas sin poder cerrarse">
              <p>Mientras dure la suspensión nadie podrá iniciar sesión para cerrarlas:</p>
              <ListaDeJornadas jornadas={jornadasAbiertas} />
            </Alert>
          ) : null}
          <p className="text-body-sm text-text-secondary">
            No cierra jornadas, no desvincula equipos, no retira cajas y no desactiva a nadie. Todo vuelve a estar
            disponible al reactivar.
          </p>
        </DialogoConMotivo>
      ) : null}

      {abierto === "reactivar" ? (
        <DialogoConMotivo
          titulo={`Reactivar ${sedeNombre}`}
          descripcion="Sus trabajadores vuelven a poder iniciar sesión de inmediato."
          accionDelServidor={reactivarSedeAction}
          sedeId={sedeId}
          confirmar="Reactivar"
          onCerrar={cerrar}
        />
      ) : null}

      {abierto === "cerrar" ? (
        <DialogoConMotivo
          titulo={`Cerrar ${sedeNombre}`}
          descripcion="Es definitivo: el final del ciclo de vida de la sucursal. No se puede deshacer."
          accionDelServidor={cerrarSedeAction}
          sedeId={sedeId}
          confirmar="Cerrar la sede"
          destructiva
          bloqueo={jornadasAbiertas.length > 0 ? <Bloqueo jornadas={jornadasAbiertas} accion="cerrar" /> : null}
          onCerrar={cerrar}
        >
          <Alert variant="warning" title="Qué pasa al cerrar">
            La sede deja de operar para siempre. No se elimina: su historial sigue disponible.
          </Alert>
          {cajas > 0 || equipos > 0 ? (
            <p className="text-body-sm text-text-secondary">
              Cerrarla no retira sus cajas ni desvincula sus equipos: eso lo hace su operador. Quedarán{" "}
              <strong className="text-text-primary">
                {cajas} {cajas === 1 ? "caja" : "cajas"} y {equipos} {equipos === 1 ? "equipo" : "equipos"}
              </strong>{" "}
              en una sede cerrada; pídele al operador que los libere.
            </p>
          ) : null}
        </DialogoConMotivo>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------
 * Piezas
 * ---------------------------------------------------------------------- */

function DialogoConMotivo({
  titulo,
  descripcion,
  accionDelServidor,
  sedeId,
  confirmar,
  destructiva,
  bloqueo,
  onCerrar,
  children,
}: {
  titulo: string;
  descripcion: string;
  accionDelServidor: (p: ResultadoAccionSede, f: FormData) => Promise<ResultadoAccionSede>;
  sedeId: string;
  confirmar: string;
  destructiva?: boolean;
  /** Si existe, la acción no se puede hacer: se dice por qué y no hay botón de confirmar. */
  bloqueo?: React.ReactNode;
  onCerrar: () => void;
  children?: React.ReactNode;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccionSede, FormData>(accionDelServidor, null);

  return (
    <Dialog open onOpenChange={(v) => (v ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        {bloqueo ? (
          <>
            <DialogBody>{bloqueo}</DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Entendido</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={enviarSinReiniciar(accion)} noValidate>
            <input type="hidden" name="sede" value={sedeId} />
            <DialogBody className="flex flex-col gap-4">
              {estado ? (
                <Alert variant="error" title="No se pudo completar">
                  {estado.error}
                </Alert>
              ) : null}
              {children}
              <CampoMotivo disabled={enviando} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" variant={destructiva ? "destructive" : "primary"} loading={enviando}>
                {confirmar}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CampoMotivo({ disabled }: { disabled: boolean }): React.JSX.Element {
  return (
    <Field {...MOTIVO}>
      <Input {...fieldAria(MOTIVO)} name="motivo" disabled={disabled} />
    </Field>
  );
}

function Bloqueo({ jornadas, accion }: { jornadas: readonly JornadaAbierta[]; accion: "revocar" | "cerrar" }): React.JSX.Element {
  return (
    <Alert variant="error" title="Esta sede tiene jornadas abiertas. Deben cerrarse antes.">
      <p>
        {accion === "revocar"
          ? "Traspasar una sucursal con la caja abierta dejaría un descuadre sin dueño."
          : "Una sucursal no se cierra dejando efectivo sin conciliar."}{" "}
        Pídele a su operador que las cierre:
      </p>
      <ListaDeJornadas jornadas={jornadas} />
    </Alert>
  );
}

function ListaDeJornadas({ jornadas }: { jornadas: readonly JornadaAbierta[] }): React.JSX.Element {
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5">
      {jornadas.map((j) => (
        <li key={j.id}>
          {j.caja} · {j.trabajador} · abierta desde el {j.desde}
        </li>
      ))}
    </ul>
  );
}

function Resumen({ etiqueta, valor }: { etiqueta: string; valor: string }): React.JSX.Element {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-secondary">{etiqueta}</dt>
      <dd className="text-right font-medium text-text-primary">{valor}</dd>
    </div>
  );
}
