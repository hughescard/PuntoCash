"use client";

import * as React from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";

import {
  Alert,
  Button,
  Card,
  CardContent,
  Field,
  fieldAria,
  PasswordInput,
  type FieldSpec,
} from "@/components/ui";
import type { Route } from "next";
import { LARGO_MINIMO } from "@/features/auth/password-recovery";

export type CampoContrasena = "actual" | "nueva" | "repetida";

export type ResultadoCambioContrasena =
  | { ok: false; error: string; campo?: CampoContrasena }
  | null;

/**
 * Cambiar la propia contraseña — **FR-AD-PERF-5** a **FR-AD-PERF-8**, y su
 * equivalente en la consola de PuntoCash. Cada consola aporta su acción y a
 * dónde vuelve «Cancelar»; los campos y las reglas son los mismos.
 *
 * Los mismos campos y las mismas reglas que el último paso de la recuperación
 * (`password-recovery-form.tsx`), más **la contraseña actual**, que allí la
 * sustituye el código del correo. Aquí no hay código porque ya hay sesión; lo
 * que la actual protege es esa sesión de quien se la encuentre abierta.
 *
 * Campos **controlados**, a diferencia del resto de formularios de la consola:
 * React vacía los no controlados al terminar la acción, y con una contraseña
 * actual mal tecleada eso obligaría a escribir las tres otra vez.
 */

const ACTUAL: FieldSpec = { id: "perfil-contrasena-actual", label: "Contraseña actual" };
const NUEVA: FieldSpec = {
  id: "perfil-contrasena-nueva",
  label: "Contraseña nueva",
  description: `Al menos ${LARGO_MINIMO} caracteres.`,
};
const REPETIDA: FieldSpec = {
  id: "perfil-contrasena-repetida",
  label: "Repite la contraseña nueva",
};

export function CambiarContrasenaForm({
  accionDelServidor,
  cancelarHref,
}: {
  accionDelServidor: (previo: ResultadoCambioContrasena, formData: FormData) => Promise<ResultadoCambioContrasena>;
  cancelarHref: Route;
}): React.JSX.Element {
  const [estado, accion, enviando] = React.useActionState<ResultadoCambioContrasena, FormData>(
    accionDelServidor,
    null,
  );

  const [valores, setValores] = React.useState<Record<CampoContrasena, string>>({
    actual: "",
    nueva: "",
    repetida: "",
  });

  /* El error de un campo se retira en cuanto se corrige ese campo, no al
     volver a enviar: un mensaje que sigue ahí después de arreglarlo se lee
     como que el arreglo no ha servido. */
  /* Se guarda junto al resultado al que responde: un envío nuevo trae otro
     resultado, y con él la corrección anterior deja de aplicarse sola. */
  const [corregido, setCorregido] = React.useState<{
    resultado: ResultadoCambioContrasena;
    campo: CampoContrasena;
  } | null>(null);

  const errorDe = (campo: CampoContrasena) =>
    estado &&
    !estado.ok &&
    estado.campo === campo &&
    !(corregido?.resultado === estado && corregido.campo === campo)
      ? estado.error
      : undefined;

  const cambiar = (campo: CampoContrasena) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const valor = event.target.value;
    setValores((v) => ({ ...v, [campo]: valor }));
    setCorregido({ resultado: estado, campo });
  };

  return (
    <form action={accion} className="max-w-form-max">
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          {estado && !estado.ok && !estado.campo ? (
            <Alert variant="error" title="No se pudo cambiar">
              {estado.error}
            </Alert>
          ) : null}

          <Field {...ACTUAL} error={errorDe("actual")}>
            <PasswordInput
              {...fieldAria({ ...ACTUAL, error: errorDe("actual") })}
              name="actual"
              value={valores.actual}
              onChange={cambiar("actual")}
              autoComplete="current-password"
              autoFocus
              disabled={enviando}
              invalid={Boolean(errorDe("actual"))}
            />
          </Field>

          <Field {...NUEVA} error={errorDe("nueva")}>
            <PasswordInput
              {...fieldAria({ ...NUEVA, error: errorDe("nueva") })}
              name="nueva"
              value={valores.nueva}
              onChange={cambiar("nueva")}
              autoComplete="new-password"
              disabled={enviando}
              invalid={Boolean(errorDe("nueva"))}
            />
          </Field>

          <Field {...REPETIDA} error={errorDe("repetida")}>
            <PasswordInput
              {...fieldAria({ ...REPETIDA, error: errorDe("repetida") })}
              name="repetida"
              value={valores.repetida}
              onChange={cambiar("repetida")}
              autoComplete="new-password"
              disabled={enviando}
              invalid={Boolean(errorDe("repetida"))}
            />
          </Field>

          <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="secondary" asChild>
              <Link href={cancelarHref}>Cancelar</Link>
            </Button>
            <Button type="submit" loading={enviando}>
              <KeyRound aria-hidden="true" />
              Cambiar contraseña
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
