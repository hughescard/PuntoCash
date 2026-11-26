"use client";

import * as React from "react";

import { Alert, Button } from "@/components/ui";
import { DevicePairingPanel, type EquipoPorVincular } from "@/components/patterns/device-pairing-panel";
import { prepararKiosco, usarKioscoDeDemostracion } from "./_actions";

export interface KioscoDeDemostracion {
  id: string;
  label: string;
  sede: string;
}

/**
 * Lo que muestra un kiosco sin vincular en lugar del catálogo.
 *
 * Nada que un cliente pueda hacer aquí: ni catálogo, ni «Inicio», ni forma de
 * saltarse el vínculo. El código lo genera el propio kiosco y es el que teclea
 * el administrador en `/admin/equipos/vincular`; en cuanto lo vincula, el
 * vigilante del layout lo nota y el kiosco pasa al catálogo de su sede.
 */
export function KioskPairingScreen({
  desvinculadoDe,
  kioscosDemo,
}: {
  desvinculadoDe: string | null;
  kioscosDemo: readonly KioscoDeDemostracion[];
}): React.JSX.Element {
  const [equipo, setEquipo] = React.useState<EquipoPorVincular | null>(null);

  const anunciar = React.useCallback(() => {
    void prepararKiosco().then((estado) => {
      if (!estado.vinculado) {
        setEquipo({ codigo: estado.codigo });
      }
    });
  }, []);

  React.useEffect(() => {
    anunciar();
  }, [anunciar]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center py-8 text-center">
      <p className="text-overline uppercase text-text-secondary">PuntoCash · Autoservicio</p>
      <h1 className="mt-3 text-screen-title text-text-primary">Vincula este kiosco a su sede</h1>
      <p className="mt-3 max-w-2xl text-body text-text-secondary">
        Este kiosco {desvinculadoDe ? "ya no" : "todavía no"} pertenece a ninguna sede. El administrador de la sede
        debe vincularlo desde su panel web, en <span className="font-semibold text-text-primary">Equipos</span>, con
        cualquiera de estas dos opciones.
      </p>

      {desvinculadoDe ? (
        <Alert variant="warning" title="Este kiosco fue desvinculado" className="mt-8 w-full text-left">
          El administrador lo desvinculó de {desvinculadoDe}. Para volver a usarlo, debe vincularlo de nuevo.
        </Alert>
      ) : null}

      {equipo ? (
        <DevicePairingPanel
          className="mt-8 w-full"
          device={equipo}
          qrPayload={`puntocash:kiosco-link:v1:${equipo.codigo}`}
          demoNote={
            <>
              Versión de demostración: el QR es ilustrativo y no se puede escanear. Para vincular, entra en la
              consola de administración de la sede y teclea el código en Equipos → Vincular equipo.
            </>
          }
        />
      ) : null}

      {kioscosDemo.length > 0 ? (
        <section
          aria-labelledby="kioscos-demo"
          className="mt-8 w-full rounded-card border border-dashed border-border p-6 text-left"
        >
          <h2 id="kioscos-demo" className="text-label font-semibold text-text-primary">
            Demostración · usar un kiosco ya vinculado
          </h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            En la demostración, este navegador puede hacerse pasar por uno de los kioscos que las sedes ya tienen
            vinculados. En el producto, el kiosco es la máquina de la sala y no se elige.
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {kioscosDemo.map((k) => (
              <li key={k.id}>
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => void usarKioscoDeDemostracion(k.id)}
                >
                  {k.label}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
