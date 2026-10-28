"use client";

import * as React from "react";

import { CambiarContrasenaForm } from "@/components/patterns/cambiar-contrasena-form";
import { cambiarContrasenaSuperAdminAction } from "../_actions";

export function CambiarContrasenaSuperAdmin(): React.JSX.Element {
  return <CambiarContrasenaForm accionDelServidor={cambiarContrasenaSuperAdminAction} cancelarHref="/super-admin/perfil" />;
}
