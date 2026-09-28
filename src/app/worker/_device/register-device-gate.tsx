"use client";

import * as React from "react";

import { Alert } from "@/components/ui";
import { Logo } from "@/components/brand/logo";
import { DevicePairingPanel, SimulatorLink } from "@/components/patterns/device-pairing-panel";
import { findBranchById, findRegisterById } from "@/features/branches/branches";
import {
  ensureRegisterPairingChallenge,
  registerPairingQrPayload,
  syncRegisterDeviceCookie,
  useRegisterDevice,
} from "@/features/worker/register-device";

/**
 * Elige entre la pantalla de vinculación y la aplicación (Worker FRD §2.1,
 * FR-DEV-1.1).
 *
 * Tiene dos fuentes y las usa en el momento en que cada una sirve:
 *
 *   · **Antes de hidratar**, la del servidor: `serverLinked`, leída de la
 *     cookie espejo. El navegador todavía no puede consultar
 *     `localStorage`, así que sin esto habría que pintar nada —y eso es
 *     justo lo que rompía el render de servidor, el 404 de una ruta
 *     inexistente y el primer pintado.
 *   · **Después**, la del propio equipo: `localStorage`, que es la fuente de
 *     verdad y la única que se entera al instante de que el administrador
 *     acaba de vincular o desvincular (FR-DEV-7).
 *
 * En la operación normal las dos coinciden y no ocurre nada: el árbol que
 * pintó el servidor es el que se queda. La discrepancia solo aparece en el
 * instante en que el administrador actúa desde su panel, y entonces el
 * cambio es inmediato porque lo decide este componente.
 *
 * **Deliberadamente no hay `router.refresh()`.** Un refresco volvería a
 * pedir el árbol al servidor y, a mitad de un flujo, arriesga el estado de
 * cliente que ese flujo lleva encima — los importes de un fondeo inicial, el
 * paso de una operación. Todo lo que hay que decidir aquí se decide con lo
 * que este componente ya tiene en la mano.
 */
export function RegisterDeviceGate({
  serverLinked,
  children,
}: {
  serverLinked: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const device = useRegisterDevice();

  React.useEffect(() => {
    // Primer arranque: crear el equipo y su primer reto de vinculación.
    if (device === null) {
      ensureRegisterPairingChallenge();
      return;
    }
    /* Un navegador ya vinculado antes de que el espejo existiera, o uno al
       que le limpiaron las cookies: reescribirlo para que la próxima carga
       no empiece mostrando la pantalla de vinculación. */
    if (device !== undefined) syncRegisterDeviceCookie();
  }, [device]);

  // Todavía sin hidratar, o el equipo se está creando: la respuesta buena es
  // la que ya tomó el servidor.
  if (device === undefined || device === null) {
    return serverLinked ? <>{children}</> : <RegisterPairingScreen />;
  }

  if (device.status === "unlinked") return <RegisterPairingScreen />;
  return <>{children}</>;
}

/**
 * A pantalla completa y fuera del shell, igual que el inicio de sesión
 * (FR-SHELL-3): hasta que el equipo no es una caja no hay sede, ni caja, ni
 * trabajador que mostrar.
 *
 * La copia se pinta de inmediato y el panel del reto aparece en cuanto el
 * equipo lo ha generado, para que quien está instalando lea para qué sirve
 * esta pantalla sin esperar a nada.
 */
export function RegisterPairingScreen(): React.JSX.Element {
  const device = useRegisterDevice();
  const unlinked = device?.status === "unlinked" ? device : null;

  const previousBranch = findBranchById(unlinked?.unlinkedFrom?.branchId);
  const previousRegister = findRegisterById(unlinked?.unlinkedFrom?.registerId);

  return (
    <main className="flex min-h-screen flex-col bg-canvas px-8 py-10">
      <div className="flex justify-center">
        <Logo size="md" showDescriptor />
      </div>

      <div className="mx-auto mt-10 flex w-full max-w-4xl flex-col items-center text-center">
        <p className="text-overline uppercase text-text-secondary">PuntoCash · Worker</p>
        <h1 className="mt-3 text-screen-title text-text-primary">Vincula este equipo como caja</h1>
        <p className="mt-3 max-w-2xl text-body text-text-secondary">
          Este equipo todavía no es la caja de ninguna sede. El administrador de la sede debe vincularlo desde
          su panel web, en <span className="font-semibold text-text-primary">Cajas</span>, eligiendo la sede y
          la caja. Se hace una sola vez: después, cada trabajador inicia sesión con su propia cuenta.
        </p>

        {previousBranch ? (
          <Alert variant="warning" title="Este equipo fue desvinculado" className="mt-8 w-full text-left">
            El administrador lo desvinculó de {previousRegister ? `${previousRegister.name} · ` : ""}
            {previousBranch.name} y se cerró la sesión del trabajador. Para volver a operar en este equipo,
            debe vincularlo de nuevo.
          </Alert>
        ) : null}

        {unlinked ? (
          <DevicePairingPanel
            className="mt-8 w-full"
            device={unlinked}
            qrPayload={registerPairingQrPayload(unlinked)}
            onExpired={ensureRegisterPairingChallenge}
            demoNote={
              <>
                Versión de demostración: el panel del administrador aún no existe. Para simular la
                vinculación, abre <SimulatorLink /> en otra pestaña. El QR es ilustrativo y no se puede
                escanear.
              </>
            }
          />
        ) : null}
      </div>
    </main>
  );
}
