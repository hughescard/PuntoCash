"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, User } from "lucide-react";

import { Alert, Button, Field, fieldAria, Input, PasswordInput, type FieldSpec } from "@/components/ui";
import type { SuperAdminLoginResult } from "@/features/super-admin/auth";
import { openChallenge } from "@/features/auth/two-factor";
import { iniciarAccesoSuperAdmin } from "@/app/super-admin/_actions";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * Acceso a la consola de PuntoCash, paso 1 de 2. Es el formulario de Admin de
 * sede con otro destino: un solo mensaje para todos los rechazos
 * (FR-SA-ACC-4) y la sesión solo existe tras el código [R13].
 */

const IDENTIFIER: FieldSpec = {
  id: "sa-login-identifier",
  label: "Correo electrónico",
};

const PASSWORD: FieldSpec = {
  id: "sa-login-password",
  label: "Contraseña",
};

type Status = "idle" | "submitting" | "challenge-sent";

interface FieldErrors {
  identifier?: string;
  password?: string;
}

const FAILURES = {
  "invalid-credentials": {
    title: "Credenciales incorrectas",
    message:
      "Revisa el usuario y la contraseña e intenta nuevamente. Si el problema continúa, pide ayuda al área de sistemas de PuntoCash.",
  },
  "network-error": {
    title: "No se pudo conectar con PuntoCash",
    message: "Revisa tu conexión e intenta nuevamente. Si el problema continúa, solicita asistencia.",
  },
} as const satisfies Record<string, { title: string; message: string }>;

type FailureKind = keyof typeof FAILURES;

/** El acceso siempre pasa por el segundo factor (**FR-AD-ACC-1**) [R13]. */
const AFTER_LOGIN = "/super-admin/verificacion" as const;

export function SuperAdminLoginForm(): React.JSX.Element {
  const router = useRouter();
  const hydrated = useHydrated();
  const [status, setStatus] = React.useState<Status>("idle");
  const [failure, setFailure] = React.useState<FailureKind | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});

  const identifierRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  const submitting = status === "submitting";
  const locked = status === "challenge-sent";
  const disabled = submitting || locked;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;

    const data = new FormData(event.currentTarget);
    const identifier = String(data.get("identifier") ?? "").trim();
    const password = String(data.get("password") ?? "");

    // Validación previa al envío (§9 "Prevención de errores"), con el mensaje
    // pegado a su propio campo (§20).
    const errors: FieldErrors = {};
    if (!identifier) errors.identifier = "Introduce tu correo electrónico.";
    if (!password) errors.password = "Introduce tu contraseña.";

    setFailure(null);

    if (errors.identifier || errors.password) {
      setFieldErrors(errors);
      (errors.identifier ? identifierRef : passwordRef).current?.focus();
      return;
    }

    setFieldErrors({});
    setStatus("submitting");

    /* El paso 1 ocurre **en el servidor** (`iniciarAccesoSuperAdmin`): es quien
       comprueba la contraseña y quien se queda con la identidad de quien
       acertó. Lo que vuelve aquí no dice de quién es el reto. */
    const result: SuperAdminLoginResult = await iniciarAccesoSuperAdmin({ identifier, password });

    if (result.status === "challenge-required") {
      /* El reto de la pantalla —cuenta atrás, intentos, reenvío— se abre aquí,
         con el identificador que se acaba de escribir: es la experiencia del
         segundo factor y vive en el navegador. El reto que **decide** lo tiene
         el servidor, y la sesión solo se abre contra él (ver `_actions.ts`). */
      openChallenge(identifier);

      /* Queda cerrado mientras carga el destino: un segundo envío abriría un
         reto nuevo e invalidaría el código recién enviado. */
      setStatus("challenge-sent");
      router.push(AFTER_LOGIN);
      return;
    }

    setStatus("idle");
    setFailure(result.status);

    if (result.status === "invalid-credentials") identifierRef.current?.focus();
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      {status === "challenge-sent" ? (
        <Alert variant="success" title="Credenciales verificadas">
          Te enviamos un código de verificación a tu correo. Ya puedes continuar.
        </Alert>
      ) : failure ? (
        <Alert variant="error" title={FAILURES[failure].title}>
          {FAILURES[failure].message}
        </Alert>
      ) : null}

      <Field {...IDENTIFIER} error={fieldErrors.identifier}>
        <Input
          ref={identifierRef}
          {...fieldAria({ ...IDENTIFIER, error: fieldErrors.identifier })}
          name="identifier"
          type="text"
          inputMode="email"
          autoComplete="username"
          autoFocus
          disabled={disabled}
          invalid={Boolean(fieldErrors.identifier)}
          placeholder="Ingresa tu correo de PuntoCash"
          prefix={<User className="size-[18px]" aria-hidden="true" />}
        />
      </Field>

      <Field {...PASSWORD} error={fieldErrors.password}>
        <PasswordInput
          ref={passwordRef}
          {...fieldAria({ ...PASSWORD, error: fieldErrors.password })}
          name="password"
          autoComplete="current-password"
          disabled={disabled}
          invalid={Boolean(fieldErrors.password)}
          placeholder="Ingresa tu contraseña"
          prefix={<Lock className="size-[18px]" aria-hidden="true" />}
        />
      </Field>

      <div className="flex flex-col gap-3 pt-2">
        {/* Deshabilitado hasta que React se engancha al formulario: el marcado
            del servidor ya es un `submit` nativo y, sin `action`, pulsarlo
            antes de tiempo hace un GET a esta misma URL con el usuario y la
            contraseña en la barra de direcciones. */}
        <Button type="submit" size="md" block loading={submitting} disabled={locked || !hydrated}>
          {submitting ? "Verificando…" : "Iniciar sesión"}
        </Button>

        <Button
          variant="tertiary"
          size="sm"
          asChild
          className="self-center font-medium hover:underline hover:underline-offset-4"
        >
          <Link href="/super-admin/recuperar-acceso">¿Olvidaste tu contraseña?</Link>
        </Button>
      </div>
    </form>
  );
}
