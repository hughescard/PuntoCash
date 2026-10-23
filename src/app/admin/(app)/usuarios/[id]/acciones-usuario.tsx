"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Crown, KeyRound, Mail, Pencil, UserCheck, UserX } from "lucide-react";

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
import {
  cambiarCorreoUsuarioAction,
  desactivarUsuarioAction,
  reactivarUsuarioAction,
  regenerarCredencialUsuarioAction,
  transferirPrincipalAction,
  type ResultadoAccionUsuario,
  type ResultadoCredencialUsuario,
} from "../_actions";

/**
 * Lo que la ficha de un usuario permite hacer — **FR-AD-USR-6** a
 * **FR-AD-USR-9**.
 *
 * ── La ausencia es el requisito ────────────────────────────────
 * **Al administrador principal no lo desactiva nadie** (**FR-AD-USR-13**), y
 * eso incluye a sí mismo. El botón **no está**, con la razón a la vista, en
 * vez de estar y rechazar: uno que existe y falla enseña a pulsar y a leer un
 * error; uno que no está, acompañado de por qué, se entiende a la primera.
 *
 * Como solo el principal llega hasta aquí, mirar la propia ficha y mirar la
 * del principal son **el mismo caso**: por eso hay un solo mensaje y no dos.
 *
 * La guarda vive **también** en el dominio, y eso no es duplicar: que la
 * pantalla no ofrezca el control es comodidad; que el dominio lo rechace es el
 * control de verdad.
 */

const CORREO: FieldSpec = {
  id: "usuario-correo-nuevo",
  label: "Correo de verificación",
  required: true,
};

const DESTINO: FieldSpec = {
  id: "usuario-destino-principal",
  label: "Quién pasa a administrar los usuarios",
  required: true,
  description: "Solo aparecen los usuarios activos de tu empresa.",
};

const SELECT_CLASS =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle";

type Abierto = "correo" | "credencial" | "desactivar" | "reactivar" | "traspasar" | null;

export function AccionesUsuario({
  usuario,
  esYo,
  candidatos,
}: {
  usuario: { id: string; nombre: string; correo: string; activo: boolean; esPrincipal: boolean };
  esYo: boolean;
  /** Activos de la empresa, salvo uno mismo: a quién se puede traspasar. */
  candidatos: readonly { id: string; nombre: string }[];
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [abierto, setAbierto] = React.useState<Abierto>(null);

  /* El orden es el de §7: lo de todos los días primero, el cambio de estado
     el último, y el mismo sitio esté activo o desactivado. */
  return (
    <>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <Button variant="secondary" asChild>
          <Link href={`/admin/usuarios/${usuario.id}/editar` as Route}>
            <Pencil aria-hidden="true" />
            Editar datos
          </Link>
        </Button>

        <Button variant="secondary" disabled={!hydrated} onClick={() => setAbierto("correo")}>
          <Mail aria-hidden="true" />
          Cambiar correo
        </Button>

        <Button variant="secondary" disabled={!hydrated} onClick={() => setAbierto("credencial")}>
          <KeyRound aria-hidden="true" />
          Regenerar credencial
        </Button>

        {/* **FR-AD-USR-12**: el traspaso se ofrece en la ficha **del principal**
            —la propia— y no en la de cada candidato: es un acto sobre uno
            mismo «dejo de serlo», no sobre el otro. */}
        {usuario.esPrincipal && candidatos.length > 0 ? (
          <Button variant="secondary" disabled={!hydrated} onClick={() => setAbierto("traspasar")}>
            <Crown aria-hidden="true" />
            Traspasar la administración de usuarios
          </Button>
        ) : null}

        {usuario.activo ? (
          usuario.esPrincipal ? null : (
            <Button
              variant="destructive"
              disabled={!hydrated}
              onClick={() => setAbierto("desactivar")}
            >
              <UserX aria-hidden="true" />
              Desactivar
            </Button>
          )
        ) : (
          <Button disabled={!hydrated} onClick={() => setAbierto("reactivar")}>
            <UserCheck aria-hidden="true" />
            Reactivar
          </Button>
        )}
      </div>

      {/* La razón de la ausencia, donde estaría el botón. */}
      {usuario.activo && usuario.esPrincipal ? (
        <Alert
          variant="info"
          title="Al administrador principal no lo desactiva nadie"
          className="mt-4"
        >
          Es lo que garantiza que la empresa nunca se quede sin quien pueda dar de alta a otro.
          {candidatos.length > 0
            ? " Si vas a dejar la empresa, traspasa primero la administración de usuarios; a partir de ahí tu usuario se podrá desactivar como cualquier otro."
            : " Para poder traspasarla antes tiene que haber otro usuario activo."}
        </Alert>
      ) : null}

      {abierto === "correo" ? (
        <CambiarCorreo usuario={usuario} esYo={esYo} onCerrar={() => setAbierto(null)} />
      ) : null}
      {abierto === "credencial" ? (
        <Credencial usuario={usuario} esYo={esYo} onCerrar={() => setAbierto(null)} />
      ) : null}
      {abierto === "desactivar" ? (
        <Desactivar usuario={usuario} onCerrar={() => setAbierto(null)} />
      ) : null}
      {abierto === "reactivar" ? (
        <Reactivar usuario={usuario} onCerrar={() => setAbierto(null)} />
      ) : null}
      {abierto === "traspasar" ? (
        <Traspasar
          usuario={usuario}
          candidatos={candidatos}
          onCerrar={() => setAbierto(null)}
        />
      ) : null}
    </>
  );
}

/**
 * Cambiar el correo de verificación.
 *
 * Aparte de la edición de datos porque **no es un dato de contacto**: de él
 * depende que esa persona pueda entrar **[R13]**, y también que pueda
 * recuperar su contraseña, porque ese código va al mismo sitio.
 *
 * Aquí el correo se muestra **entero**, al contrario que en el listado y en la
 * ficha: lo que se viene a hacer es corregirlo, y enmascarado no se ve la
 * errata. Es la misma decisión que en la asistencia de acceso de §7.
 */
function CambiarCorreo({
  usuario,
  esYo,
  onCerrar,
}: {
  usuario: { id: string; nombre: string; correo: string };
  esYo: boolean;
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccionUsuario, FormData>(
    cambiarCorreoUsuarioAction,
    null,
  );
  const hecho = estado?.ok === true;

  return (
    <Dialog open onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            {esYo ? "Cambiar tu correo de verificación" : `Cambiar el correo de ${usuario.nombre}`}
          </DialogTitle>
          <DialogDescription>
            Es la dirección a la que llega el código en cada inicio de sesión.
          </DialogDescription>
        </DialogHeader>

        {hecho ? (
          <>
            <DialogBody>
              <Alert variant="success" title="Correo cambiado">
                {estado.mensaje}
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form action={accion} noValidate>
            <input type="hidden" name="usuario" value={usuario.id} />

            <DialogBody className="flex flex-col gap-4">
              {estado && !estado.ok ? (
                <Alert variant="error" title="No se pudo cambiar el correo">
                  {estado.error}
                </Alert>
              ) : null}

              {esYo ? (
                <Alert variant="warning" title="Asegúrate de poder entrar en ese correo">
                  El próximo código irá ahí. Si te equivocas al escribirlo no podrás entrar, y solo
                  PuntoCash podrá ayudarte: nadie más en tu empresa puede cambiar tu correo.
                </Alert>
              ) : null}

              <Field {...CORREO}>
                <Input
                  {...fieldAria(CORREO)}
                  name="correo"
                  type="email"
                  inputMode="email"
                  disabled={enviando}
                  defaultValue={usuario.correo}
                  autoFocus
                />
              </Field>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" loading={enviando}>
                Guardar el correo
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Regenerar la credencial — **FR-AD-USR-5**, con el tratamiento de §7. */
function Credencial({
  usuario,
  esYo,
  onCerrar,
}: {
  usuario: { id: string; nombre: string };
  esYo: boolean;
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoCredencialUsuario, FormData>(
    regenerarCredencialUsuarioAction,
    null,
  );
  const hecho = estado?.ok === true;

  return (
    <Dialog open onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            {esYo ? "Regenerar tu credencial" : `Regenerar la credencial de ${usuario.nombre}`}
          </DialogTitle>
          <DialogDescription>
            {hecho
              ? esYo
                ? "Cópiala ahora. La anterior ya no sirve."
                : `Cópiala ahora y entrégasela a ${usuario.nombre}. La anterior ya no sirve.`
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

                <p className="mt-4 text-caption uppercase text-text-secondary">Credencial nueva</p>
                <p className="pc-numeric mt-1 text-screen-title tracking-wide text-text-primary">
                  {estado.credencial}
                </p>
              </div>

              <Alert variant="warning" title="No se podrá volver a consultar">
                Si se pierde habrá que regenerarla otra vez — nadie, ni tú, puede volver a leer
                esta.
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form action={accion}>
            <input type="hidden" name="usuario" value={usuario.id} />

            <DialogBody className="flex flex-col gap-4">
              {estado && !estado.ok ? (
                <Alert variant="error" title="No se pudo regenerar">
                  {estado.error}
                </Alert>
              ) : null}

              <Alert
                variant="warning"
                title={
                  esYo
                    ? "Tu contraseña actual dejará de servir"
                    : "Quien use la anterior dejará de poder entrar"
                }
              >
                {esYo
                  ? "Tu sesión abierta sigue, pero la próxima vez que entres tendrás que usar la credencial nueva. Cópiala antes de cerrar."
                  : `Hazlo cuando vayas a entregársela, no antes. La sesión que ${usuario.nombre} tenga abierta sigue, pero su siguiente inicio de sesión le pedirá la nueva.`}
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

/**
 * Desactivar — **FR-AD-USR-6**.
 *
 * **No pide motivo**, y es la diferencia deliberada con §7. Desactivar a un
 * trabajador es un acto laboral que alguien revisará meses después; desactivar
 * a un usuario de tu propia empresa lo hace quien comparte oficina con él, y
 * el evento de auditoría ya guarda quién y cuándo. Pedir un motivo aquí sería
 * ceremonia.
 */
function Desactivar({
  usuario,
  onCerrar,
}: {
  usuario: { id: string; nombre: string };
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccionUsuario, FormData>(
    desactivarUsuarioAction,
    null,
  );
  const hecho = estado?.ok === true;

  return (
    <Dialog open onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Desactivar a {usuario.nombre}</DialogTitle>
          <DialogDescription>
            Dejará de poder entrar en esta consola. Nada de lo que hizo se borra ni se altera.
          </DialogDescription>
        </DialogHeader>

        {hecho ? (
          <>
            <DialogBody>
              <Alert variant="success" title="Usuario desactivado">
                {estado.mensaje}
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form action={accion}>
            <input type="hidden" name="usuario" value={usuario.id} />

            <DialogBody className="flex flex-col gap-4">
              {estado && !estado.ok ? (
                <Alert variant="error" title="No se pudo desactivar">
                  {estado.error}
                </Alert>
              ) : null}

              <Alert variant="info" title="Se puede deshacer">
                Puedes reactivarlo desde su ficha cuando quieras, con el mismo identificador y la
                misma contraseña.
              </Alert>
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

/** Reactivar — **FR-AD-USR-9**. */
function Reactivar({
  usuario,
  onCerrar,
}: {
  usuario: { id: string; nombre: string };
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccionUsuario, FormData>(
    reactivarUsuarioAction,
    null,
  );
  const hecho = estado?.ok === true;

  return (
    <Dialog open onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Reactivar a {usuario.nombre}</DialogTitle>
          <DialogDescription>
            Volverá a entrar con su identificador y su contraseña de siempre.
          </DialogDescription>
        </DialogHeader>

        {hecho ? (
          <>
            <DialogBody>
              <Alert variant="success" title="Usuario reactivado">
                {estado.mensaje}
              </Alert>
            </DialogBody>
            <DialogFooter>
              <Button onClick={onCerrar}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form action={accion}>
            <input type="hidden" name="usuario" value={usuario.id} />

            <DialogBody className="flex flex-col gap-4">
              {estado && !estado.ok ? (
                <Alert variant="error" title="No se pudo reactivar">
                  {estado.error}
                </Alert>
              ) : null}

              <Alert variant="warning" title="Recupera todas sus potestades">
                No hay reactivación parcial: desde que entre podrá operar todas tus sedes, igual que
                cualquier otro administrador de la empresa.
              </Alert>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" loading={enviando}>
                Reactivar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Traspasar el papel de administrador principal — **FR-AD-USR-12**.
 *
 * **Es un acto sobre uno mismo**, no sobre el otro, y la pantalla lo dice así:
 * lo que ocurre al confirmar es que **quien lo hace deja de ver esta sección**.
 * Por eso el diálogo no termina con un «hecho» y un botón de cerrar que
 * devuelve a una ficha que ya no se puede ver: al confirmar, la pantalla se
 * recarga y quien lo hizo acaba fuera de §8.
 *
 * El destino se elige de una lista de **usuarios activos**, no de un campo
 * libre: traspasar a alguien desactivado dejaría a la empresa sin nadie capaz
 * de entrar aquí, que es justo lo que este papel existe para evitar.
 */
function Traspasar({
  usuario,
  candidatos,
  onCerrar,
}: {
  usuario: { id: string; nombre: string };
  candidatos: readonly { id: string; nombre: string }[];
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccionUsuario, FormData>(
    transferirPrincipalAction,
    null,
  );
  const hecho = estado?.ok === true;

  /* Cerrar el diálogo después de un traspaso tampoco puede dejar la pantalla
     como estaba: quien lo cerró ya no gobierna esta sección. Se recarga, por
     el mismo motivo que el botón de abajo. */
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- recarga completa a propósito.
  const cerrar = hecho ? () => window.location.assign("/admin/inicio") : onCerrar;

  return (
    <Dialog open onOpenChange={(valor) => (valor ? undefined : cerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Traspasar la administración de usuarios</DialogTitle>
          <DialogDescription>
            {hecho
              ? "Ya no gobiernas esta sección."
              : "Desde que confirmes, otra persona pasa a ser el administrador principal y tú dejas de serlo."}
          </DialogDescription>
        </DialogHeader>

        {hecho ? (
          <>
            <DialogBody>
              <Alert variant="success" title="Traspaso hecho">
                {estado.mensaje}
              </Alert>
            </DialogBody>
            <DialogFooter>
              {/* **Navegación completa, no `Link`**, y es deliberado. Al
                  traspasar, el menú de la izquierda tiene que perder
                  «Usuarios»; con una navegación de cliente el shell se reutiliza
                  y la entrada se queda ahí, llevando a un 404. Y no se puede
                  revalidar desde la acción, porque eso reharía esta misma
                  página —que ya no se puede ver— y borraría la confirmación
                  antes de leerla. Una recarga de verdad resuelve las dos
                  cosas, y ocurre **una vez en la vida** de una empresa. */}
              <Button asChild>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- recarga completa a propósito, ver arriba. */}
                <a href="/admin/inicio">Ir a Inicio</a>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form action={accion}>
            <input type="hidden" name="usuario" value={usuario.id} />

            <DialogBody className="flex flex-col gap-4">
              {estado && !estado.ok ? (
                <Alert variant="error" title="No se pudo traspasar">
                  {estado.error}
                </Alert>
              ) : null}

              <Alert variant="warning" title="Dejarás de ver la sección de Usuarios">
                No hay dos administradores principales. Al confirmar pierdes el acceso a esta
                sección —seguirás pudiendo todo lo demás— y solo quien la reciba podrá
                devolvértela.
              </Alert>

              <Field {...DESTINO}>
                <select
                  {...fieldAria(DESTINO)}
                  name="destino"
                  defaultValue=""
                  disabled={enviando}
                  className={SELECT_CLASS}
                >
                  <option value="" disabled>
                    Elige a quién
                  </option>
                  {candidatos.map((candidato) => (
                    <option key={candidato.id} value={candidato.id}>
                      {candidato.nombre}
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
                <Crown aria-hidden="true" />
                Traspasar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
