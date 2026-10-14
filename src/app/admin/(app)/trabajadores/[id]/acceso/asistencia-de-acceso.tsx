"use client";

import * as React from "react";
import { Mail } from "lucide-react";

import {
  Alert,
  Button,
  Card,
  CardContent,
  Field,
  fieldAria,
  Input,
  type FieldSpec,
} from "@/components/ui";
import { Section } from "@/components/shell/app-shell";
import { cambiarCorreoAction, type ResultadoAsistencia } from "../../_actions";

/**
 * Asistencia de acceso — **FR-AD-TRAB-10**, con **FR-AD-TRAB-11** encima.
 *
 * ── El aviso va arriba del todo, y no al final ────────────────────────────
 * **FR-AD-TRAB-11** exige que la interfaz diga que esto **no da acceso a la
 * cuenta ni muestra el código**. Va antes de cualquier control, porque es
 * justo la expectativa equivocada con la que se llega: alguien que viene de
 * oír «no me llega el código» espera que el administrador pueda leérselo. Si
 * la frase estuviera abajo, la leería después de haberlo buscado.
 *
 * ── Dos remedios, no uno, porque las causas son dos ───────────────────────
 * El código no llega **porque va a la dirección equivocada**, y entonces hay
 * que corregirla —y vale también para la recuperación de contraseña de Worker,
 * que manda su código al mismo sitio—, o **porque el reto se bloqueó** tras
 * agotar intentos o reenvíos, y entonces solo hay que dejarle volver a
 * empezar. Mezclarlas en un botón llevaría a cambiar correos que estaban bien.
 *
 * Las dos piden motivo escrito: las dos tocan el acceso de una persona y
 * quedan en auditoría.
 */

const CORREO: FieldSpec = {
  id: "asistencia-correo",
  label: "Correo de verificación",
  required: true,
};

const MOTIVO_CORREO: FieldSpec = {
  id: "asistencia-motivo-correo",
  label: "Por qué lo cambias",
  required: true,
  description: "Queda registrado en la auditoría junto a tu nombre y la fecha.",
};


export function AsistenciaDeAcceso({
  trabajador,
}: {
  trabajador: { id: string; nombre: string; primerNombre: string; correo: string };
}): React.JSX.Element {
  return (
    <>
      {/* **FR-AD-TRAB-11**, y lo primero que se lee: es justo la expectativa
          equivocada con la que se llega, porque quien oye «no me llega el
          código» supone que el administrador puede leérselo.

          El `mb-12` no es un retoque suelto: `Section` del shell lleva su
          separación **abajo** (`mb-12`) y ninguna arriba, así que lo que se
          ponga antes de la primera sección queda pegado a su título. Se le da
          aquí la misma medida que separa dos secciones, para que la página
          tenga un solo ritmo. */}
      <Alert variant="warning" title="Esto no te da acceso a su cuenta" className="mb-12">
        No te muestra su código ni lo genera, y no inicia sesión por él. El código sigue llegando
        solo a su correo: lo único que puedes hacer desde aquí es arreglar a dónde llega.
      </Alert>

      <Section title="Corregir el correo">
        <CambiarCorreo trabajador={trabajador} />
      </Section>
    </>
  );
}

/**
 * **El correo se enseña entero**, al contrario que en el listado y en la
 * ficha. Lo que se viene a hacer aquí es encontrar la errata, y un correo
 * enmascarado esconde justo eso (**FR-AD-TRAB-10**).
 */
function CambiarCorreo({
  trabajador,
}: {
  trabajador: { id: string; primerNombre: string; correo: string };
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoAsistencia, FormData>(
    cambiarCorreoAction,
    null,
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={accion} className="flex flex-col gap-5">
          <input type="hidden" name="trabajador" value={trabajador.id} />

          {estado?.ok ? (
            <Alert variant="success" title="Correo cambiado">
              {estado.mensaje}
            </Alert>
          ) : null}
          {estado && !estado.ok ? (
            <Alert variant="error" title="No se pudo cambiar el correo">
              {estado.error}
            </Alert>
          ) : null}

          <p className="text-body-sm text-text-secondary">
            Si el código no le llega, lo primero es comprobar que esta dirección es la suya y está
            bien escrita. De ella depende también la recuperación de su contraseña, que manda su
            código al mismo sitio.
          </p>

          <Field {...CORREO}>
            <Input
              {...fieldAria(CORREO)}
              name="correo"
              type="email"
              inputMode="email"
              disabled={enviando}
              defaultValue={trabajador.correo}
              key={estado?.ok ? "guardado" : "edicion"}
            />
          </Field>

          <Field {...MOTIVO_CORREO}>
            <Input
              {...fieldAria(MOTIVO_CORREO)}
              name="motivo"
              disabled={enviando}
              placeholder="El dominio estaba mal escrito"
            />
          </Field>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button type="submit" loading={enviando}>
              <Mail aria-hidden="true" />
              Guardar el correo
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
