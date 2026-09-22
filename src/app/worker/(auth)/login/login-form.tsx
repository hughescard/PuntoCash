"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, User } from "lucide-react";

import { Alert, Button, Field, fieldAria, Input, PasswordInput, type FieldSpec } from "@/components/ui";
import { authenticate, type LoginResult } from "@/features/auth/mock-auth";

/**
 * Worker login form — first of the two steps that make up access.
 *
 * State lives here and the screen renders from it, so wiring a real backend
 * means replacing the `authenticate` call — the `LoginResult` union already
 * describes every outcome the UI knows how to present.
 *
 * There is no successful *login* outcome here: the best case is a verification
 * challenge, and the session only exists once `/worker/verificacion` confirms
 * the code [R13].
 */

const IDENTIFIER: FieldSpec = {
  id: "login-identifier",
  label: "Usuario o correo electrónico",
};

const PASSWORD: FieldSpec = {
  id: "login-password",
  label: "Contraseña",
};

type Status = "idle" | "submitting" | "challenge-sent";

interface FieldErrors {
  identifier?: string;
  password?: string;
}

/**
 * Form-level outcomes. Microcopy follows §5: say what happened and what the
 * next step is — never "Algo salió mal".
 */
const FAILURES = {
  "invalid-credentials": {
    title: "No se pudo iniciar sesión",
    message:
      "El usuario o la contraseña no son correctos. Verifica los datos e intenta nuevamente.",
  },
  "account-blocked": {
    title: "Cuenta bloqueada",
    message:
      "Tu cuenta está bloqueada por seguridad. Solicita asistencia al administrador de tu sede para reactivarla.",
  },
  "network-error": {
    title: "No se pudo conectar con PuntoCash",
    message:
      "Revisa tu conexión e intenta nuevamente. Si el problema continúa, solicita asistencia.",
  },
} as const satisfies Record<string, { title: string; message: string }>;

type FailureKind = keyof typeof FAILURES;

/**
 * Correct credentials do not open a session: every PuntoCash product requires a
 * second factor, so the next screen is the verification challenge, not Inicio
 * [R13].
 */
const AFTER_LOGIN = "/worker/verificacion" as const;

export function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const [status, setStatus] = React.useState<Status>("idle");
  const [failure, setFailure] = React.useState<FailureKind | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});

  const identifierRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  const submitting = status === "submitting";
  // A blocked account cannot be resolved by retrying, so the form is closed.
  const locked = status === "challenge-sent" || failure === "account-blocked";
  const disabled = submitting || locked;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;

    const data = new FormData(event.currentTarget);
    const identifier = String(data.get("identifier") ?? "").trim();
    const password = String(data.get("password") ?? "");

    // Validate before submitting (§9 "Prevención de errores"). Messages are
    // specific and attached to their own field (§20).
    const errors: FieldErrors = {};
    if (!identifier) errors.identifier = "Introduce tu usuario o correo electrónico.";
    if (!password) errors.password = "Introduce tu contraseña.";

    setFailure(null);

    if (errors.identifier || errors.password) {
      setFieldErrors(errors);
      // Move focus to the first field needing attention.
      (errors.identifier ? identifierRef : passwordRef).current?.focus();
      return;
    }

    setFieldErrors({});
    setStatus("submitting");

    const result: LoginResult = await authenticate({ identifier, password });

    if (result.status === "challenge-required") {
      // Stays locked while the destination loads, so the form cannot be
      // submitted twice during navigation — and so a second submit cannot
      // open a second challenge and invalidate the code just sent.
      setStatus("challenge-sent");
      router.push(AFTER_LOGIN);
      return;
    }

    setStatus("idle");
    setFailure(result.status);

    if (result.status === "invalid-credentials") {
      identifierRef.current?.focus();
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Form-level outcome. Failures carry no inline retry action: the form's
          own submit button sits just below and stays enabled, so a second
          button would duplicate the one primary action the context allows
          (§9 "Jerarquía"). */}
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
          placeholder="Ingresa tu usuario o correo"
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

      {/* The primary action is separated from the fields so it reads as the
          conclusion of the form rather than another row in it. */}
      <div className="flex flex-col gap-3 pt-2">
        <Button type="submit" size="md" block loading={submitting} disabled={locked}>
          {submitting ? "Verificando…" : "Iniciar sesión"}
        </Button>

        {/* Tertiary action — "sin fondo; texto navy" (§14). Lighter than a
            button label and underlined on hover so it reads as a link. */}
        <Button
          variant="tertiary"
          size="sm"
          asChild
          className="self-center font-medium hover:underline hover:underline-offset-4"
        >
          <Link href="/worker/recuperar-acceso">¿Olvidaste tu contraseña?</Link>
        </Button>
      </div>
    </form>
  );
}
