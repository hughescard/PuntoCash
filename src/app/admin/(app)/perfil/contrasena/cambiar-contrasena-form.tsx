"use client";

import * as React from "react";

import { CambiarContrasenaForm as Formulario } from "@/components/patterns/cambiar-contrasena-form";
import { cambiarContrasenaAction } from "../_actions";

/** Cambiar la propia contraseña — **FR-AD-PERF-5** a **FR-AD-PERF-8**. El formulario es el compartido con la consola de PuntoCash. */
export function CambiarContrasenaForm(): React.JSX.Element {
  return <Formulario accionDelServidor={cambiarContrasenaAction} cancelarHref="/admin/perfil" />;
}
