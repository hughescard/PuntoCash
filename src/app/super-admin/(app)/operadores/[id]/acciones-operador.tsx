"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Ban, KeyRound, Link2, PauseCircle, PlayCircle } from "lucide-react";

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
  asignarSedeAOperadorAction,
  darDeBajaOperadorAction,
  reactivarOperadorAction,
  restablecerAccesoAction,
  suspenderOperadorAction,
  type ResultadoAccionOperador,
  type ResultadoRestablecer,
} from "../_actions";

/**
 * Las acciones de la ficha de un operador, cada una en su diálogo.
 *
 * Todas vuelven a la ficha con `?hecho=` salvo restablecer el acceso, que
 * tiene que enseñar una credencial una sola vez en su propio diálogo.
 */

const MOTIVO: FieldSpec = {
  id: "operador-accion-motivo",
  label: "Motivo",
  required: true,
  description: "Al menos 10 caracteres. Queda en la auditoría con tu nombre.",
};

const SELECT =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle";

export interface JornadaAbiertaDeOperador {
  id: string;
  sede: string;
  caja: string;
  trabajador: string;
  desde: string;
}

/* -------------------------------------------------------------------------
 * Asignar una sede
 * ---------------------------------------------------------------------- */

export function AsignarSede({
  operadorId,
  operadorNombre,
  sedes,
  hoy,
}: {
  operadorId: string;
  operadorNombre: string;
  /** Las sedes sin operador, no cerradas. */
  sedes: readonly { id: string; nombre: string; codigo: string }[];
  hoy: string;
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [abierto, setAbierto] = React.useState(false);
  return (
    <>
      <Button size="sm" disabled={!hydrated} onClick={() => setAbierto(true)}>
        <Link2 aria-hidden="true" />
        Asignar una sede
      </Button>
      {abierto ? (
        <DialogoAsignar operadorId={operadorId} operadorNombre={operadorNombre} sedes={sedes} hoy={hoy} onCerrar={() => setAbierto(false)} />
      ) : null}
    </>
  );
}

function DialogoAsignar({
  operadorId,
  operadorNombre,
  sedes,
  hoy,
  onCerrar,
}: {
  operadorId: string;
  operadorNombre: string;
  sedes: readonly { id: string; nombre: string; codigo: string }[];
  hoy: string;
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccionOperador, FormData>(asignarSedeAOperadorAction, null);
  const [sede, setSede] = React.useState("");
  const elegida = sedes.find((s) => s.id === sede);
  const SEDE: FieldSpec = { id: "operador-asignar-sede", label: "Sede", required: true, description: "Solo aparecen las sedes sin operador." };

  return (
    <Dialog open onOpenChange={(v) => (v ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Asignar una sede a {operadorNombre}</DialogTitle>
          <DialogDescription>Entregarle una sede sin operador para que la ponga en marcha.</DialogDescription>
        </DialogHeader>
        {sedes.length === 0 ? (
          <>
            <DialogBody>
              <Alert variant="info" title="No hay sedes sin operador">
                Para entregarle una sede que ya tiene otro operador, revócala primero desde su ficha. O crea una sede nueva.
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button variant="secondary" asChild>
                <Link href="/super-admin/sedes/nueva">Crear una sede</Link>
              </Button>
              <Button onClick={onCerrar}>Entendido</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={enviarSinReiniciar(accion)} noValidate>
            <input type="hidden" name="operador" value={operadorId} />
            <DialogBody className="flex flex-col gap-4">
              {estado ? (
                <Alert variant="error" title="No se pudo asignar">
                  {estado.error}
                </Alert>
              ) : null}
              <Field {...SEDE}>
                <select {...fieldAria(SEDE)} name="sede" value={sede} disabled={enviando} onChange={(e) => setSede(e.currentTarget.value)} className={SELECT}>
                  <option value="" disabled>
                    Elige una sede
                  </option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.codigo} — {s.nombre}
                    </option>
                  ))}
                </select>
              </Field>
              <CampoMotivo disabled={enviando} />
              {elegida ? (
                <dl className="grid gap-2 rounded-card border border-border bg-surface-subtle p-4 text-body-sm">
                  <Resumen etiqueta="Sede" valor={elegida.nombre} />
                  <Resumen etiqueta="Operador" valor={operadorNombre} />
                  <Resumen etiqueta="Desde" valor={hoy} />
                </dl>
              ) : null}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" loading={enviando} disabled={!elegida}>
                Asignar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------
 * Restablecer el acceso del principal
 * ---------------------------------------------------------------------- */

export function RestablecerAcceso({
  operadorId,
  principal,
}: {
  operadorId: string;
  principal: { nombre: string; correo: string };
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [abierto, setAbierto] = React.useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" disabled={!hydrated} onClick={() => setAbierto(true)}>
        <KeyRound aria-hidden="true" />
        Restablecer el acceso del principal
      </Button>
      {abierto ? <DialogoRestablecer operadorId={operadorId} principal={principal} onCerrar={() => setAbierto(false)} /> : null}
    </>
  );
}

function DialogoRestablecer({
  operadorId,
  principal,
  onCerrar,
}: {
  operadorId: string;
  principal: { nombre: string; correo: string };
  onCerrar: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const [estado, accion, enviando] = React.useActionState<ResultadoRestablecer, FormData>(restablecerAccesoAction, null);
  const CORREO: FieldSpec = {
    id: "operador-restablecer-correo",
    label: "Correo de verificación",
    required: true,
    description: "Cámbialo si ha perdido el acceso a este correo. Ahí recibirá su código en cada inicio de sesión.",
  };
  /* Al cerrar tras restablecer, la ficha se vuelve a leer: el correo del
     principal puede haber cambiado. */
  const cerrar = () => {
    if (estado?.ok) router.refresh();
    onCerrar();
  };

  return (
    <Dialog open onOpenChange={(v) => (v ? undefined : cerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Restablecer el acceso de {principal.nombre}</DialogTitle>
          <DialogDescription>
            El administrador principal es el único de su empresa que puede gestionar usuarios. Si pierde el acceso, nadie
            más de su empresa puede arreglarlo.
          </DialogDescription>
        </DialogHeader>
        {estado?.ok ? (
          <>
            <DialogBody className="flex flex-col gap-4">
              <div className="rounded-control border border-border bg-surface-subtle px-4 py-4">
                <p className="text-caption uppercase text-text-secondary">Identificador de acceso</p>
                <p className="pc-numeric mt-1 text-body text-text-primary">{estado.identificador}</p>
                <p className="mt-4 text-caption uppercase text-text-secondary">Credencial nueva</p>
                <p className="pc-numeric mt-1 text-screen-title tracking-wide text-text-primary">{estado.credencial}</p>
                <p className="mt-4 text-caption uppercase text-text-secondary">Correo de verificación</p>
                <p className="mt-1 text-body text-text-primary">{estado.correo}</p>
              </div>
              <Alert variant="warning" title="Cópiala ahora: no se podrá volver a consultar">
                Entrégasela a {estado.nombre} en persona. La anterior deja de servir.
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={cerrar}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={enviarSinReiniciar(accion)} noValidate>
            <input type="hidden" name="operador" value={operadorId} />
            <DialogBody className="flex flex-col gap-4">
              {estado ? (
                <Alert variant="error" title="No se pudo restablecer">
                  {estado.error}
                </Alert>
              ) : null}
              <Field {...CORREO}>
                <Input {...fieldAria(CORREO)} name="correo" type="email" inputMode="email" defaultValue={principal.correo} disabled={enviando} />
              </Field>
              <CampoMotivo disabled={enviando} />
              <p className="text-body-sm text-text-secondary">
                No crea ningún usuario ni cambia quién es el principal. Solo le da una credencial nueva y, si hace falta, otro
                correo.
              </p>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" loading={enviando}>
                Restablecer
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------
 * Estado: suspender, reactivar, dar de baja
 * ---------------------------------------------------------------------- */

export function AccionesDeEstadoOperador({
  operadorId,
  operadorNombre,
  suspendido,
  alcance,
  jornadasAbiertas,
  sedes,
}: {
  operadorId: string;
  operadorNombre: string;
  suspendido: boolean;
  alcance: { sedes: number; administradores: number; trabajadores: number };
  jornadasAbiertas: readonly JornadaAbiertaDeOperador[];
  /** Sus sedes vigentes: dar de baja exige que no tenga ninguna. */
  sedes: readonly { id: string; nombre: string }[];
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [abierto, setAbierto] = React.useState<"suspender" | "reactivar" | "baja" | null>(null);
  const cerrar = () => setAbierto(null);

  return (
    <>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {suspendido ? (
          <Button disabled={!hydrated} onClick={() => setAbierto("reactivar")}>
            <PlayCircle aria-hidden="true" />
            Reactivar el operador
          </Button>
        ) : (
          <Button variant="secondary" disabled={!hydrated} onClick={() => setAbierto("suspender")}>
            <PauseCircle aria-hidden="true" />
            Suspender el operador
          </Button>
        )}
        <Button variant="destructive" disabled={!hydrated} onClick={() => setAbierto("baja")}>
          <Ban aria-hidden="true" />
          Dar de baja
        </Button>
      </div>

      {abierto === "suspender" ? (
        <DialogoConMotivo
          titulo={`Suspender ${operadorNombre}`}
          descripcion="La medida de mayor alcance de esta consola. Se revierte reactivándolo."
          accionDelServidor={suspenderOperadorAction}
          operadorId={operadorId}
          confirmar="Suspender"
          destructiva
          onCerrar={cerrar}
        >
          <Alert variant="warning" title="A quién afecta">
            Ni sus <strong>{alcance.administradores}</strong> {alcance.administradores === 1 ? "administrador" : "administradores"}{" "}
            ni los <strong>{alcance.trabajadores}</strong> {alcance.trabajadores === 1 ? "trabajador" : "trabajadores"} de sus{" "}
            <strong>{alcance.sedes}</strong> {alcance.sedes === 1 ? "sede" : "sedes"} podrán iniciar sesión.
          </Alert>
          {jornadasAbiertas.length > 0 ? (
            <Alert variant="error" title="Estas jornadas quedarán abiertas sin poder cerrarse">
              <p>Mientras dure la suspensión nadie podrá iniciar sesión para cerrarlas:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {jornadasAbiertas.map((j) => (
                  <li key={j.id}>
                    {j.sede} · {j.caja} · {j.trabajador} · desde el {j.desde}
                  </li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <p className="text-body-sm text-text-secondary">
            No cierra jornadas, no desvincula equipos, no retira cajas y no desactiva a nadie. Todo vuelve a estar disponible al
            reactivar.
          </p>
        </DialogoConMotivo>
      ) : null}

      {abierto === "reactivar" ? (
        <DialogoConMotivo
          titulo={`Reactivar ${operadorNombre}`}
          descripcion="Sus administradores y los trabajadores de sus sedes vuelven a poder iniciar sesión de inmediato."
          accionDelServidor={reactivarOperadorAction}
          operadorId={operadorId}
          confirmar="Reactivar"
          onCerrar={cerrar}
        />
      ) : null}

      {abierto === "baja" ? (
        <DialogoConMotivo
          titulo={`Dar de baja ${operadorNombre}`}
          descripcion="Es definitivo. El operador no se elimina: todo su historial sigue disponible."
          accionDelServidor={darDeBajaOperadorAction}
          operadorId={operadorId}
          confirmar="Dar de baja"
          destructiva
          bloqueo={
            sedes.length > 0 ? (
              <Alert variant="error" title={`Este operador administra ${sedes.length} ${sedes.length === 1 ? "sede" : "sedes"}`}>
                <p>Revoca esas asignaciones antes de darlo de baja:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {sedes.map((s) => (
                    <li key={s.id}>
                      <Link href={`/super-admin/sedes/${s.id}` as Route} className="underline underline-offset-4">
                        {s.nombre}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Alert>
            ) : null
          }
          onCerrar={cerrar}
        >
          <Alert variant="warning" title="Qué pasa al darlo de baja">
            Sus administradores dejan de poder iniciar sesión para siempre. No se le pueden asignar sedes nuevas.
          </Alert>
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
  operadorId,
  confirmar,
  destructiva,
  bloqueo,
  onCerrar,
  children,
}: {
  titulo: string;
  descripcion: string;
  accionDelServidor: (p: ResultadoAccionOperador, f: FormData) => Promise<ResultadoAccionOperador>;
  operadorId: string;
  confirmar: string;
  destructiva?: boolean;
  bloqueo?: React.ReactNode;
  onCerrar: () => void;
  children?: React.ReactNode;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccionOperador, FormData>(accionDelServidor, null);
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
            <input type="hidden" name="operador" value={operadorId} />
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

function Resumen({ etiqueta, valor }: { etiqueta: string; valor: string }): React.JSX.Element {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-secondary">{etiqueta}</dt>
      <dd className="text-right font-medium text-text-primary">{valor}</dd>
    </div>
  );
}
