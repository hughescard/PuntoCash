"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Alert } from "@/components/ui";
import { AVISO_USUARIOS_LEIDO } from "./aviso-cookie";

/**
 * El aviso de que Usuarios es solo del principal — **FR-AD-USR-4** y
 * **FR-AD-USR-11** juntos, porque por separado engañan: «todos pueden lo
 * mismo» sin la excepción hace creer que cualquiera puede dar de alta
 * usuarios, y la excepción sola hace creer que hay perfiles que ajustar.
 *
 * Se puede cerrar: una vez leído no hace falta repetirlo en cada visita. Se
 * recuerda en una cookie para que el servidor no vuelva a pintarlo y no
 * aparezca un instante antes de esconderse.
 */
export function AvisoSoloTuya(): React.JSX.Element | null {
  const [visible, setVisible] = React.useState(true);
  if (!visible) return null;

  const cerrar = () => {
    document.cookie = `${AVISO_USUARIOS_LEIDO}=1; path=/admin; samesite=lax; max-age=${60 * 60 * 24 * 365}`;
    setVisible(false);
  };

  return (
    <Alert
      variant="info"
      title="Esta pantalla es solo tuya"
      className="mb-12"
      action={
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar este aviso"
          className="grid size-11 place-items-center rounded-control text-text-secondary outline-none hover:bg-black/5 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-primary"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      }
    >
      Eres el administrador principal: nadie más de tu empresa ve esta sección ni puede dar de alta,
      editar o desactivar usuarios administradores.
    </Alert>
  );
}
