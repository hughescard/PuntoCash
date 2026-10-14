"use client";

import * as React from "react";

import { Alert } from "@/components/ui";
import { DevicePairingPanel, SimulatorLink } from "@/components/patterns/device-pairing-panel";
import { findBranchById } from "@/features/branches/branches";
import { ensurePairingChallenge, pairingQrPayload, useKioskDevice } from "@/features/kiosk/device-session";

/**
 * What an unlinked kiosk shows instead of the catalog (Autoservicio FRD §1.1).
 *
 * Nothing a client can do here: no catalog, no "Inicio", no way around the
 * link. Until an admin links it, this terminal cannot prepare a request.
 */
export function KioskPairingScreen(): React.JSX.Element {
  /* Lee el equipo ella misma, como su gemela de Worker: el servidor puede
     decidir que esta pantalla es la correcta antes de que el navegador haya
     podido consultar `localStorage`, así que la copia se pinta de inmediato y
     el panel del reto aparece en cuanto el equipo lo ha generado. */
  const device = useKioskDevice();
  const unlinked = device?.status === "unlinked" ? device : null;

  const previousBranch = findBranchById(unlinked?.unlinkedFrom?.branchId);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center py-8 text-center">
      <p className="text-overline uppercase text-text-secondary">PuntoCash · Autoservicio</p>
      <h1 className="mt-3 text-screen-title text-text-primary">Vincula este kiosco a su sede</h1>
      <p className="mt-3 max-w-2xl text-body text-text-secondary">
        Este kiosco todavía no pertenece a ninguna sede. El administrador de la sede debe vincularlo
        desde su panel web, en <span className="font-semibold text-text-primary">Kioscos de autoservicio</span>,
        con cualquiera de estas dos opciones.
      </p>

      {previousBranch ? (
        <Alert variant="warning" title="Este kiosco fue desvinculado" className="mt-8 w-full text-left">
          El administrador lo desvinculó de {previousBranch.name}. Para volver a usarlo, debe vincularlo de
          nuevo.
        </Alert>
      ) : null}

      {unlinked ? (
        <DevicePairingPanel
          className="mt-8 w-full"
          device={unlinked}
          qrPayload={pairingQrPayload(unlinked)}
          onExpired={ensurePairingChallenge}
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
  );
}
