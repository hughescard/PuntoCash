"use client";

import * as React from "react";

import { CambiarContrasenaForm } from "@/components/patterns/cambiar-contrasena-form";
import { cambiarContrasenaTrabajadorAction } from "../_actions";

/** El mismo formulario que Admin y PuntoCash: mismos campos, mismas reglas. */
export function CambiarContrasenaTrabajadorForm(): React.JSX.Element {
  return <CambiarContrasenaForm accionDelServidor={cambiarContrasenaTrabajadorAction} cancelarHref="/worker/perfil" />;
}
