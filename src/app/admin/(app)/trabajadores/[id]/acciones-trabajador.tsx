"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Building2, KeyRound, LifeBuoy, Pencil, UserCheck, UserX } from "lucide-react";

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
import { useHydrated } from "@/lib/use-hydrated";
import {
  desactivarTrabajadorAction,
  reactivarTrabajadorAction,
  reasignarTrabajadorAction,
  regenerarCredencialAction,
  type ResultadoAccionTrabajador,
  type ResultadoCredencial,
} from "../_actions";
import { enviarSinReiniciar } from "@/lib/enviar-sin-reiniciar";

/**
 * Lo que la ficha permite hacer — **FR-AD-TRAB-12** a **FR-AD-TRAB-15**.
 *
 * Ni desactivar ni reasignar es posible con una jornada abierta
 * (**FR-AD-TRAB-13**, **FR-AD-TRAB-14**). La ficha lo sabe antes de abrir el
 * diálogo, así que el diálogo lo dice en lugar de ofrecer un botón que el
 * dominio rechazaría, y lleva a esa jornada. El dominio lo revalida igual al
 * confirmar: la jornada pudo abrirse mientras el diálogo estaba abierto.
 *
 * Los botones están cerrados hasta que React se engancha, como el resto de
 * los controles del producto: lo que abren es un diálogo, y un diálogo que no
 * se abre al pulsarlo es peor que un botón que todavía no invita a pulsarse.
 */

const MOTIVO: FieldSpec = {
  id: "trabajador-motivo",
  label: "Motivo de la desactivación",
  description: "Queda registrado en la auditoría junto a tu nombre y la fecha.",
  required: true,
};

const SEDE_DESTINO: FieldSpec = {
  id: "trabajador-sede-destino",
  label: "Nueva sede",
  description: "Solo aparecen las sedes que administras.",
  required: true,
};

const SELECT_CLASS =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle";

type Abierto = "desactivar" | "reactivar" | "reasignar" | "credencial" | null;

export function AccionesTrabajador({
  trabajador,
  sedes,
}: {
  trabajador: {
    id: string;
    nombre: string;
    sedeId: string;
    sedeName: string;
    activo: boolean;
    /** Su jornada abierta, si la tiene: bloquea desactivar y reasignar. */
    jornadaAbierta: JornadaAbiertaDeTrabajador | null;
  };
  sedes: readonly { id: string; name: string; suspendida: boolean }[];
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [abierto, setAbierto] = React.useState<Abierto>(null);

  const otrasSedes = sedes.filter((sede) => sede.id !== trabajador.sedeId);

  return (
    <>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        {/* **Editar** es una pantalla, no un diálogo: seis campos con teclados
            distintos no caben en un modal a 360px (**FR-AD-SHELL-15**). */}
        <Button variant="secondary" asChild>
          <Link href={`/admin/trabajadores/${trabajador.id}/editar` as Route}>
            <Pencil aria-hidden="true" />
            Editar datos
          </Link>
        </Button>

        {/* **FR-AD-TRAB-8**, segunda mitad: «si se pierde, se regenera». */}
        <Button variant="secondary" disabled={!hydrated} onClick={() => setAbierto("credencial")}>
          <KeyRound aria-hidden="true" />
          Regenerar credencial
        </Button>

        {/* **FR-AD-TRAB-10**: también una pantalla, porque son dos remedios
            con su motivo cada uno y el aviso de **FR-AD-TRAB-11** encima. */}
        <Button variant="secondary" asChild>
          <Link href={`/admin/trabajadores/${trabajador.id}/acceso` as Route}>
            <LifeBuoy aria-hidden="true" />
            Ayudar con el acceso
          </Link>
        </Button>

        {/* Sin otra sede en el alcance no hay nada que elegir, así que el
            control no se ofrece en vez de abrirse vacío. */}
        {otrasSedes.length > 0 ? (
          <Button variant="secondary" disabled={!hydrated} onClick={() => setAbierto("reasignar")}>
            <Building2 aria-hidden="true" />
            Reasignar a otra sede
          </Button>
        ) : null}

        {/* **El cambio de estado va el último**, después de todo lo que se hace
            a diario. Es lo que menos se usa y lo único que corta el acceso de
            alguien: encabezar la lista con él pone lo irreversible en el sitio
            donde cae el pulgar. El sitio es el mismo esté activo o no, para que
            no baile según el estado de la ficha que se esté mirando. */}
        {trabajador.activo ? (
          <Button variant="destructive" disabled={!hydrated} onClick={() => setAbierto("desactivar")}>
            <UserX aria-hidden="true" />
            Desactivar
          </Button>
        ) : (
          <Button disabled={!hydrated} onClick={() => setAbierto("reactivar")}>
            <UserCheck aria-hidden="true" />
            Reactivar
          </Button>
        )}
      </div>

      {abierto === "desactivar" ? (
        <Desactivar trabajador={trabajador} onCerrar={() => setAbierto(null)} />
      ) : null}
      {abierto === "reactivar" ? (
        <Reactivar trabajador={trabajador} onCerrar={() => setAbierto(null)} />
      ) : null}
      {abierto === "reasignar" ? (
        <Reasignar trabajador={trabajador} sedes={otrasSedes} onCerrar={() => setAbierto(null)} />
      ) : null}
      {abierto === "credencial" ? (
        <Credencial trabajador={trabajador} onCerrar={() => setAbierto(null)} />
      ) : null}
    </>
  );
}

export interface JornadaAbiertaDeTrabajador {
  id: string;
  caja: string;
  sede: string;
}

/**
 * **FR-AD-TRAB-13** y **FR-AD-TRAB-14**: con una jornada abierta, el diálogo no
 * ofrece la acción. Dice dónde está esa jornada y lleva a ella, donde se puede
 * forzar su cierre si nadie va a hacerlo.
 */
function Bloqueado({
  nombre,
  jornada,
  accion,
  onCerrar,
}: {
  nombre: string;
  jornada: JornadaAbiertaDeTrabajador;
  accion: string;
  onCerrar: () => void;
}): React.JSX.Element {
  return (
    <>
      <DialogBody>
        <Alert variant="warning" title="Tiene una jornada abierta">
          {nombre} tiene una jornada abierta en {jornada.caja} de {jornada.sede}. Hasta que se haga su
          cierre no se puede {accion}. Si nadie va a hacerlo, puedes forzar el cierre desde la jornada.
        </Alert>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button asChild>
          <Link href={`/admin/jornadas/${jornada.id}` as Route}>Ir a la jornada</Link>
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * **FR-AD-TRAB-12**: exige confirmación y motivo escrito, y dice lo que
 * **no** pasa — nada de lo que operó se borra ni se altera (**[A7]**). Esa
 * segunda mitad importa tanto como la primera: quien desactiva a alguien a
 * mitad de un mes necesita saber que sus operaciones siguen ahí.
 */
function Desactivar({
  trabajador,
  onCerrar,
}: {
  trabajador: { id: string; nombre: string; jornadaAbierta: JornadaAbiertaDeTrabajador | null };
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccionTrabajador, FormData>(
    desactivarTrabajadorAction,
    null,
  );
  const hecho = estado?.ok === true;

  return (
    <Dialog open onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Desactivar a {trabajador.nombre}</DialogTitle>
          <DialogDescription>
            No podrá volver a iniciar sesión en ninguna caja. Nada de lo que operó se borra ni se
            altera: sus jornadas, sus movimientos y sus operaciones siguen como están.
          </DialogDescription>
        </DialogHeader>

        {trabajador.jornadaAbierta && !hecho ? (
          <Bloqueado nombre={trabajador.nombre} jornada={trabajador.jornadaAbierta} accion="desactivarlo" onCerrar={onCerrar} />
        ) : hecho ? (
          <>
            <DialogBody>
              <Alert variant="success" title="Trabajador desactivado">
                {estado.mensaje}
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={enviarSinReiniciar(accion)}>
            <input type="hidden" name="trabajador" value={trabajador.id} />

            <DialogBody className="flex flex-col gap-4">
              {estado && !estado.ok ? (
                <Alert variant="error" title="No se pudo desactivar">
                  {estado.error}
                </Alert>
              ) : null}

              <Field {...MOTIVO}>
                <textarea
                  {...fieldAria(MOTIVO)}
                  name="motivo"
                  rows={3}
                  disabled={enviando}
                  maxLength={250}
                  className="w-full rounded-control border border-border bg-surface px-4 py-3 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle"
                  placeholder="Fin de contrato temporal acordado con el trabajador"
                />
              </Field>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" loading={enviando}>
                Desactivar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * **FR-AD-TRAB-15**: reactivar exige **confirmar su sede**, porque es donde
 * volverá a poder operar y puede no ser la que tenía en la cabeza quien
 * reactiva. Y no existe ningún caso en que esta consola no pueda reactivar a
 * alguien: PuntoCash no desactiva personas (**[A14]**).
 */
function Reactivar({
  trabajador,
  onCerrar,
}: {
  trabajador: { id: string; nombre: string; sedeName: string };
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccionTrabajador, FormData>(
    reactivarTrabajadorAction,
    null,
  );
  const hecho = estado?.ok === true;

  return (
    <Dialog open onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Reactivar a {trabajador.nombre}</DialogTitle>
          <DialogDescription>
            Volverá a poder iniciar sesión con su identificador y su contraseña de siempre.
          </DialogDescription>
        </DialogHeader>

        {hecho ? (
          <>
            <DialogBody>
              <Alert variant="success" title="Trabajador reactivado">
                {estado.mensaje}
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={enviarSinReiniciar(accion)}>
            <input type="hidden" name="trabajador" value={trabajador.id} />

            <DialogBody className="flex flex-col gap-4">
              {estado && !estado.ok ? (
                <Alert variant="error" title="No se pudo reactivar">
                  {estado.error}
                </Alert>
              ) : null}

              <Alert variant="info" title={`Operará en ${trabajador.sedeName}`}>
                Es la sede que tenía al desactivarlo. Si debe ir a otra, reactívalo y reasígnalo
                después.
              </Alert>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" loading={enviando}>
                Reactivar en {trabajador.sedeName}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * **FR-AD-TRAB-14**: la reasignación **tiene efecto inmediato sobre dónde
 * puede iniciar sesión**, y la confirmación debe advertirlo. No es un dato
 * administrativo: a partir de ese momento sus credenciales dejan de servir en
 * los equipos de su sede anterior (**FR-DEV-6**).
 */
function Reasignar({
  trabajador,
  sedes,
  onCerrar,
}: {
  trabajador: { id: string; nombre: string; sedeName: string; jornadaAbierta: JornadaAbiertaDeTrabajador | null };
  sedes: readonly { id: string; name: string; suspendida: boolean }[];
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccionTrabajador, FormData>(
    reasignarTrabajadorAction,
    null,
  );
  const hecho = estado?.ok === true;

  /* **La sede de partida se congela al abrir.** `trabajador.sedeName` viene del
     servidor y cambia en cuanto la reasignación se revalida, así que sin esto
     el diálogo terminaba diciendo «ahora está adscrito a Vedado» justo encima
     del mensaje que anuncia que **acaba de pasar** a Vedado. Quien lo lea tiene
     que poder comparar de dónde salió y adónde fue. */
  const [sedeAlAbrir] = React.useState(trabajador.sedeName);

  return (
    <Dialog open onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Reasignar a {trabajador.nombre}</DialogTitle>
          <DialogDescription>
            {hecho ? `Estaba en ${sedeAlAbrir}.` : `Ahora está adscrito a ${sedeAlAbrir}.`}
          </DialogDescription>
        </DialogHeader>

        {trabajador.jornadaAbierta && !hecho ? (
          <Bloqueado nombre={trabajador.nombre} jornada={trabajador.jornadaAbierta} accion="reasignarlo" onCerrar={onCerrar} />
        ) : hecho ? (
          <>
            <DialogBody>
              <Alert variant="success" title="Trabajador reasignado">
                {estado.mensaje}
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={enviarSinReiniciar(accion)}>
            <input type="hidden" name="trabajador" value={trabajador.id} />

            <DialogBody className="flex flex-col gap-4">
              {estado && !estado.ok ? (
                <Alert variant="error" title="No se pudo reasignar">
                  {estado.error}
                </Alert>
              ) : null}

              <Alert variant="warning" title="El cambio tiene efecto inmediato">
                Desde que confirmes, solo podrá iniciar sesión en equipos de su sede nueva. Si
                ahora mismo está operando en una caja de {sedeAlAbrir}, su siguiente inicio de
                sesión allí será rechazado.
              </Alert>

              <Field {...SEDE_DESTINO}>
                <select
                  {...fieldAria(SEDE_DESTINO)}
                  name="sede"
                  defaultValue=""
                  disabled={enviando}
                  className={SELECT_CLASS}
                >
                  <option value="" disabled>
                    Elige una sede
                  </option>
                  {sedes.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {sede.name}
                      {sede.suspendida ? " · suspendida" : ""}
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
                Reasignar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Regenerar la credencial — **FR-AD-TRAB-8**, segunda mitad.
 *
 * Pide confirmación antes de hacer nada, porque **regenerar invalida la
 * credencial anterior**: quien no se haya aprendido la nueva se queda fuera.
 * Es la misma clase de acto que el alta —se emite algo que solo se ve una vez
 * y que hay que entregar en mano— y por eso la pantalla de desenlace dice lo
 * mismo con las mismas palabras.
 */
function Credencial({
  trabajador,
  onCerrar,
}: {
  trabajador: { id: string; nombre: string };
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoCredencial, FormData>(
    regenerarCredencialAction,
    null,
  );
  const hecho = estado?.ok === true;

  return (
    <Dialog open onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Regenerar la credencial de {trabajador.nombre}</DialogTitle>
          <DialogDescription>
            {hecho
              ? "Entrégasela en persona. La anterior ya no sirve."
              : "Se emite una credencial nueva y la anterior deja de servir en ese mismo momento."}
          </DialogDescription>
        </DialogHeader>

        {hecho ? (
          <>
            <DialogBody className="flex flex-col gap-4">
              <div className="rounded-control border border-border bg-surface-subtle px-4 py-4">
                <p className="text-caption uppercase text-text-secondary">
                  Identificador de acceso
                </p>
                <p className="pc-numeric mt-1 text-body text-text-primary">
                  {estado.identificador}
                </p>

                <p className="mt-4 text-caption uppercase text-text-secondary">
                  Credencial nueva
                </p>
                <p className="pc-numeric mt-1 text-screen-title tracking-wide text-text-primary">
                  {estado.credencial}
                </p>
              </div>

              <Alert variant="warning" title="Cópiala ahora: no se podrá volver a consultar">
                Si se pierde habrá que regenerarla otra vez — nadie, ni tú, puede volver a leer
                esta.
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={enviarSinReiniciar(accion)}>
            <input type="hidden" name="trabajador" value={trabajador.id} />

            <DialogBody className="flex flex-col gap-4">
              {estado && !estado.ok ? (
                <Alert variant="error" title="No se pudo regenerar">
                  {estado.error}
                </Alert>
              ) : null}

              <Alert variant="warning" title="Quien use la anterior dejará de poder entrar">
                Sustituye a la credencial anterior y a cualquier contraseña que {trabajador.nombre}
                haya elegido después. Hazlo cuando vayas a entregarle la nueva, no antes. Si está
                operando ahora mismo, su sesión abierta sigue, pero el siguiente inicio de sesión le
                pedirá la credencial nueva.
              </Alert>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" loading={enviando}>
                Regenerar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
