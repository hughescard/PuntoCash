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
  cambiarCorreoUsuarioSuperAdminAction,
  desactivarUsuarioSuperAdminAction,
  reactivarUsuarioSuperAdminAction,
  regenerarCredencialUsuarioSuperAdminAction,
  transferirPrincipalSuperAdminAction,
  type ResultadoAccionSuperAdmin,
  type ResultadoCredencialSuperAdmin,
} from "../_actions";

/**
 * Lo que la ficha de un usuario permite hacer (FR-SA-USR).
 *
 * Al principal no lo desactiva nadie, ni él mismo: el botón no está, con la
 * razón a la vista. Y la guarda vive también en el dominio, que es la que cuenta.
 *
 * Desactivar y reactivar piden **motivo** (FR-SA-STATE-2), a diferencia de Admin.
 */

const CORREO: FieldSpec = { id: "sa-usuario-correo-nuevo", label: "Correo de verificación", required: true };
const MOTIVO: FieldSpec = {
  id: "sa-usuario-motivo",
  label: "Motivo",
  required: true,
  description: "Mínimo 10 caracteres. Queda en la auditoría con tu nombre.",
};
const DESTINO: FieldSpec = {
  id: "sa-usuario-destino-principal",
  label: "Quién pasa a administrar las cuentas",
  required: true,
  description: "Solo aparecen los usuarios activos de la consola.",
};

const SELECT_CLASS =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle";

type Abierto = "correo" | "credencial" | "desactivar" | "reactivar" | "traspasar" | null;

export function AccionesUsuarioSA({
  usuario,
  esYo,
  candidatos,
}: {
  usuario: { id: string; nombre: string; correo: string; activo: boolean; esPrincipal: boolean };
  esYo: boolean;
  candidatos: readonly { id: string; nombre: string }[];
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [abierto, setAbierto] = React.useState<Abierto>(null);
  const cerrar = () => setAbierto(null);

  return (
    <>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button variant="secondary" asChild>
          <Link href={`/super-admin/usuarios/${usuario.id}/editar` as Route}>
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

        {usuario.esPrincipal && candidatos.length > 0 ? (
          <Button variant="secondary" disabled={!hydrated} onClick={() => setAbierto("traspasar")}>
            <Crown aria-hidden="true" />
            Traspasar la administración de cuentas
          </Button>
        ) : null}

        {usuario.activo ? (
          usuario.esPrincipal ? null : (
            <Button variant="destructive" disabled={!hydrated} onClick={() => setAbierto("desactivar")}>
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

      {usuario.activo && usuario.esPrincipal ? (
        <Alert variant="info" title="Al principal no lo desactiva nadie" className="mt-4">
          Es lo que garantiza que la consola nunca se quede sin quien pueda dar de alta a otro.
          {candidatos.length > 0
            ? " Si vas a dejar el puesto, traspasa primero la administración de cuentas; a partir de ahí tu usuario se podrá desactivar como cualquier otro."
            : " Para poder traspasarla antes tiene que haber otro usuario activo."}
        </Alert>
      ) : null}

      {abierto === "correo" ? <CambiarCorreoSA usuario={usuario} esYo={esYo} onCerrar={cerrar} /> : null}
      {abierto === "credencial" ? <CredencialSA usuario={usuario} onCerrar={cerrar} /> : null}
      {abierto === "desactivar" ? <EstadoSA modo="desactivar" usuario={usuario} onCerrar={cerrar} /> : null}
      {abierto === "reactivar" ? <EstadoSA modo="reactivar" usuario={usuario} onCerrar={cerrar} /> : null}
      {abierto === "traspasar" ? <TraspasarSA candidatos={candidatos} onCerrar={cerrar} /> : null}
    </>
  );
}

function CambiarCorreoSA({
  usuario,
  esYo,
  onCerrar,
}: {
  usuario: { id: string; nombre: string; correo: string };
  esYo: boolean;
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccionSuperAdmin | null, FormData>(
    cambiarCorreoUsuarioSuperAdminAction,
    null,
  );
  const hecho = estado?.ok === true;

  return (
    <Dialog open onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{esYo ? "Cambiar tu correo de verificación" : `Cambiar el correo de ${usuario.nombre}`}</DialogTitle>
          <DialogDescription>Es la dirección a la que llega el código en cada inicio de sesión.</DialogDescription>
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
                  El próximo código irá ahí. Si te equivocas al escribirlo no podrás entrar, y nadie más puede cambiar tu correo.
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

function CredencialSA({
  usuario,
  onCerrar,
}: {
  usuario: { id: string; nombre: string };
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoCredencialSuperAdmin, FormData>(
    regenerarCredencialUsuarioSuperAdminAction,
    null,
  );

  return (
    <Dialog open onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Regenerar la credencial de {usuario.nombre}</DialogTitle>
          <DialogDescription>La credencial anterior deja de servir en cuanto se genere la nueva.</DialogDescription>
        </DialogHeader>

        {estado?.ok ? (
          <>
            <DialogBody className="flex flex-col gap-4">
              <div className="rounded-control border border-border bg-surface-subtle px-4 py-4">
                <p className="text-caption uppercase text-text-secondary">Identificador de acceso</p>
                <p className="pc-numeric mt-1 text-body text-text-primary">{estado.identificador}</p>
                <p className="mt-4 text-caption uppercase text-text-secondary">Credencial nueva</p>
                <p className="pc-numeric mt-1 text-screen-title tracking-wide text-text-primary">{estado.credencial}</p>
              </div>
              <Alert variant="warning" title="Cópiala ahora: no se podrá volver a consultar">
                Entrégasela en persona. Si se pierde, habrá que volver a regenerarla.
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
                <Alert variant="error" title="No se pudo regenerar">
                  {estado.error}
                </Alert>
              ) : null}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" loading={enviando}>
                Regenerar credencial
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Desactivar o reactivar: las dos piden motivo (FR-SA-STATE-2). */
function EstadoSA({
  modo,
  usuario,
  onCerrar,
}: {
  modo: "desactivar" | "reactivar";
  usuario: { id: string; nombre: string };
  onCerrar: () => void;
}): React.JSX.Element {
  const accionDelServidor = modo === "desactivar" ? desactivarUsuarioSuperAdminAction : reactivarUsuarioSuperAdminAction;
  const [estado, accion, enviando] = React.useActionState<ResultadoAccionSuperAdmin | null, FormData>(
    accionDelServidor,
    null,
  );
  const hecho = estado?.ok === true;
  const titulo = modo === "desactivar" ? `Desactivar a ${usuario.nombre}` : `Reactivar a ${usuario.nombre}`;

  return (
    <Dialog open onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {modo === "desactivar"
              ? "Deja de poder entrar en la consola. Lo que hizo no se borra."
              : "Vuelve a poder entrar en la consola con sus mismos permisos."}
          </DialogDescription>
        </DialogHeader>

        {hecho ? (
          <>
            <DialogBody>
              <Alert variant="success" title={modo === "desactivar" ? "Usuario desactivado" : "Usuario reactivado"}>
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
                <Alert variant="error" title="No se pudo completar">
                  {estado.error}
                </Alert>
              ) : null}
              <Field {...MOTIVO}>
                <Input {...fieldAria(MOTIVO)} name="motivo" disabled={enviando} autoFocus />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" variant={modo === "desactivar" ? "destructive" : "primary"} loading={enviando}>
                {modo === "desactivar" ? "Desactivar" : "Reactivar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Traspaso del principal. Quien lo traspasa pierde la sección al cerrar. La
 * confirmación no se revalida en servidor a propósito (ver `_actions.ts`); se
 * sale con un enlace a Inicio que vuelve a representar el menú.
 */
function TraspasarSA({
  candidatos,
  onCerrar,
}: {
  candidatos: readonly { id: string; nombre: string }[];
  onCerrar: () => void;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAccionSuperAdmin | null, FormData>(
    transferirPrincipalSuperAdminAction,
    null,
  );
  const hecho = estado?.ok === true;

  return (
    <Dialog open onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Traspasar la administración de cuentas</DialogTitle>
          <DialogDescription>Después, tú dejas de poder administrar las cuentas de la consola.</DialogDescription>
        </DialogHeader>

        {hecho ? (
          <>
            <DialogBody>
              <Alert variant="success" title="Traspaso hecho">
                {estado.mensaje}
              </Alert>
            </DialogBody>
            <DialogFooter>
              {/* Carga completa y no `Link`: la navegación en cliente conserva el
                  layout compartido, y el menú seguiría mostrando Usuarios. */}
              {/* eslint-disable-next-line @next/next/no-location-assign-relative-destination -- recarga completa a propósito: el menú lo calcula el servidor y el router conservaría el layout con Usuarios. */}
              <Button onClick={() => window.location.assign("/super-admin/inicio")}>Ir a Inicio</Button>
            </DialogFooter>
          </>
        ) : (
          <form action={accion} noValidate>
            <DialogBody className="flex flex-col gap-4">
              {estado && !estado.ok ? (
                <Alert variant="error" title="No se pudo traspasar">
                  {estado.error}
                </Alert>
              ) : null}
              <Field {...DESTINO}>
                <select {...fieldAria(DESTINO)} name="destino" required disabled={enviando} defaultValue="" className={SELECT_CLASS}>
                  <option value="" disabled>
                    Elige una persona
                  </option>
                  {candidatos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
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
                Traspasar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
