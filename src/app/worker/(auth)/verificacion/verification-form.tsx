"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MailCheck, RotateCcw, ShieldCheck } from "lucide-react";

import { Alert, Button, CodeInput, Field, fieldAria, type FieldSpec } from "@/components/ui";
import {
  discardChallenge,
  peekChallenge,
  resendCode,
  verifyCode,
  type TwoFactorChallengeView,
} from "@/features/auth/two-factor";

/**
 * Verificación en dos pasos del Worker.
 *
 * El estado vive aquí y la pantalla se representa a partir de él, igual que en
 * el inicio de sesión: cambiar el mock por el backend real es sustituir
 * `verifyCode` y `resendCode` — las uniones `VerifyResult` y `ResendResult` ya
 * describen todos los desenlaces que esta pantalla sabe presentar.
 *
 * Reglas que esta pantalla hace cumplir:
 *   · No hay sesión hasta que el código se verifica [R13].
 *   · El código nunca se muestra, ni se precarga, ni se sugiere.
 *   · Un reto agotado no se reintenta desde aquí: se vuelve al inicio de sesión.
 */

const CODE: FieldSpec = {
  id: "verification-code",
  label: "Código de verificación",
};

/** Donde entra un trabajador ya verificado (manual §21). */
const AFTER_VERIFICATION = "/worker/inicio" as const;

type Status = "idle" | "verifying" | "resending" | "verified";

type Notice =
  | { kind: "invalid-code"; attemptsRemaining: number }
  | { kind: "code-expired" }
  | { kind: "locked-attempts" }
  | { kind: "locked-sends" }
  | { kind: "resent" }
  | { kind: "too-soon" }
  | { kind: "network-error" };

/** `4:37` — cuenta atrás de vigencia. */
function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** `false` on the server and during hydration, `true` once mounted in the browser. */
function subscribeNever(): () => void {
  return () => {};
}

function useHydrated(): boolean {
  return React.useSyncExternalStore(subscribeNever, () => true, () => false);
}

export function VerificationForm(): React.JSX.Element | null {
  // El reto vive en memoria del cliente (mock), así que solo se conoce tras
  // montar. Hasta entonces no se representa nada, para no mostrar un estado
  // que se contradice medio segundo después.
  const hydrated = useHydrated();
  return hydrated ? <VerificationFormBody /> : null;
}

function VerificationFormBody(): React.JSX.Element {
  const router = useRouter();

  // Solo se monta en el navegador (ver `VerificationForm`), así que el reto
  // en memoria ya se puede leer al inicializar el estado.
  const [challenge, setChallenge] = React.useState<TwoFactorChallengeView | null>(() => peekChallenge());

  const [code, setCode] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [fieldError, setFieldError] = React.useState<string | undefined>();
  const [now, setNow] = React.useState(() => Date.now());

  const codeRef = React.useRef<HTMLInputElement>(null);
  /* El envío automático al sexto dígito y el `submit` del formulario pueden
     coincidir en el mismo tick, y el estado de React todavía no lo refleja: el
     testigo es una ref para que solo una verificación salga. */
  const inFlight = React.useRef(false);

  // Un único intervalo alimenta las dos cuentas atrás — vigencia y espera de
  // reenvío — para no encadenar temporizadores por cada una.
  React.useEffect(() => {
    if (!challenge) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [challenge]);

  const locked = notice?.kind === "locked-attempts" || notice?.kind === "locked-sends";
  const verified = status === "verified";
  const busy = status === "verifying" || status === "resending";

  const msLeft = challenge ? challenge.expiresAt - now : 0;
  const expired = Boolean(challenge) && msLeft <= 0;
  const resendIn = challenge ? Math.ceil((challenge.resendAvailableAt - now) / 1000) : 0;
  const resendsLeft = challenge?.resendsRemaining ?? 0;
  const canResend = !busy && !locked && !verified && resendIn <= 0 && resendsLeft > 0;

  const complete = challenge ? code.length === challenge.codeLength : false;
  const fieldClosed = busy || locked || verified || expired;

  /* Un código rechazado se cuenta en el aviso del formulario, no en el campo,
     pero el campo debe quedar marcado como inválido de todos modos: el estado
     no puede comunicarse solo con el borde rojo (FR-A11Y-2). */
  const invalidField = Boolean(fieldError) || notice?.kind === "invalid-code";

  const description =
    expired || locked || verified ? undefined : `El código vence en ${formatCountdown(msLeft)}.`;

  const describedBy = [
    fieldError ? `${CODE.id}-error` : description ? `${CODE.id}-description` : null,
    "verification-destination",
  ]
    .filter(Boolean)
    .join(" ");

  async function submit(value: string) {
    if (inFlight.current || busy || locked || verified || !challenge) return;

    if (value.length !== challenge.codeLength) {
      setFieldError(`Introduce los ${challenge.codeLength} dígitos del código.`);
      codeRef.current?.focus();
      return;
    }

    setFieldError(undefined);
    setNotice(null);
    setStatus("verifying");
    inFlight.current = true;

    const result = await verifyCode(value);
    inFlight.current = false;

    if (result.status === "verified") {
      // Queda bloqueado mientras carga el destino, de modo que no pueda
      // enviarse dos veces durante la navegación.
      setStatus("verified");
      router.push(AFTER_VERIFICATION);
      return;
    }

    setStatus("idle");
    setCode("");

    switch (result.status) {
      case "invalid-code":
        setChallenge(result.challenge);
        setNotice({ kind: "invalid-code", attemptsRemaining: result.challenge.attemptsRemaining });
        codeRef.current?.focus();
        break;
      case "code-expired":
        setChallenge(result.challenge);
        setNotice({ kind: "code-expired" });
        break;
      case "challenge-locked":
        setNotice(result.reason === "attempts" ? { kind: "locked-attempts" } : { kind: "locked-sends" });
        break;
      case "network-error":
        setNotice({ kind: "network-error" });
        codeRef.current?.focus();
        break;
      case "challenge-not-found":
        setChallenge(null);
        break;
    }
  }

  async function handleResend() {
    if (!canResend) return;

    setFieldError(undefined);
    setNotice(null);
    setStatus("resending");

    const result = await resendCode();
    setStatus("idle");

    switch (result.status) {
      case "sent":
        setChallenge(result.challenge);
        setCode("");
        setNotice({ kind: "resent" });
        codeRef.current?.focus();
        break;
      case "too-soon":
        setChallenge(result.challenge);
        setNotice({ kind: "too-soon" });
        break;
      case "challenge-locked":
        setNotice({ kind: "locked-sends" });
        break;
      case "network-error":
        setNotice({ kind: "network-error" });
        break;
      case "challenge-not-found":
        setChallenge(null);
        break;
    }
  }

  function useAnotherAccount() {
    discardChallenge();
    router.push("/worker/login");
  }


  /* Sin reto vigente no hay nada que verificar. Es lo que ocurre al recargar la
     pantalla o al llegar por enlace directo, y se dice tal cual en vez de
     redirigir en silencio a una pantalla que el trabajador no pidió. */
  if (!challenge) {
    return (
      <div className="flex flex-col gap-6">
        <Alert variant="warning" title="La verificación ya no está activa">
          Por seguridad, la verificación caduca al recargar o al abandonar esta pantalla. Vuelve a
          iniciar sesión para recibir un código nuevo.
        </Alert>

        <Button size="md" block asChild>
          <Link href="/worker/login">
            <ArrowLeft aria-hidden="true" />
            Volver a iniciar sesión
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Desenlace a nivel de formulario. Los fallos no llevan reintento
          incorporado: la acción primaria de la pantalla está justo debajo
          (§9 "Jerarquía"). */}
      {verified ? (
        <Alert variant="success" title="Verificación completada">
          Bienvenido a PuntoCash. Tu jornada está lista para comenzar.
        </Alert>
      ) : locked ? (
        <FormNotice notice={notice!} />
      ) : expired ? (
        /* La caducidad manda sobre cualquier aviso anterior: si el código
           venció mientras se leía un "código incorrecto", lo que hay que hacer
           ya no es corregirlo sino pedir uno nuevo. */
        <Alert variant="warning" title="El código caducó">
          Por seguridad los códigos duran poco tiempo. Solicita uno nuevo para continuar.
        </Alert>
      ) : notice ? (
        <FormNotice notice={notice} />
      ) : null}

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit(code);
        }}
        className="flex flex-col gap-6"
      >
        <Field {...CODE} error={fieldError} description={description} className="items-center text-center">
          <CodeInput
            ref={codeRef}
            {...fieldAria({ ...CODE, error: fieldError })}
            /* La descripción propia del campo — cuando existe — se acompaña
               del párrafo que dice a qué correo fue el código, para que el
               control se anuncie con su destino y no solo con su etiqueta.
               Solo se referencian elementos que realmente se representan. */
            aria-describedby={describedBy}
            value={code}
            onChange={(next) => {
              setCode(next);
              if (fieldError) setFieldError(undefined);
            }}
            onComplete={(next) => void submit(next)}
            length={challenge.codeLength}
            aria-invalid={invalidField || undefined}
            disabled={fieldClosed}
            invalid={invalidField}
            autoFocus
          />
        </Field>

        <div className="flex flex-col gap-3 pt-1">
          {locked ? (
            <Button size="md" block asChild>
              <Link href="/worker/login">
                <ArrowLeft aria-hidden="true" />
                Volver a iniciar sesión
              </Link>
            </Button>
          ) : (
            <Button
              type="submit"
              size="md"
              block
              loading={status === "verifying"}
              disabled={verified || expired || !complete}
            >
              {status === "verifying" ? "Verificando…" : "Verificar e iniciar sesión"}
            </Button>
          )}

          {locked || verified ? null : (
            <Button
              type="button"
              variant="secondary"
              size="md"
              block
              onClick={() => void handleResend()}
              loading={status === "resending"}
              disabled={!canResend}
            >
              <RotateCcw aria-hidden="true" />
              {status === "resending"
                ? "Enviando…"
                : resendsLeft <= 0
                  ? "Sin reenvíos disponibles"
                  : resendIn > 0
                    ? `Reenviar código en ${resendIn} s`
                    : "Reenviar código"}
            </Button>
          )}
        </div>
      </form>

      {/* Ayuda y salida. El trabajador nunca queda sin vía: o reenvía, o
          cambia de cuenta, o sabe a quién pedir asistencia. */}
      <div className="flex flex-col items-center gap-3 border-t border-border pt-6">
        <p className="max-w-[24rem] text-center text-caption text-text-secondary">
          {resendsLeft > 0
            ? "Si el código no llega, revisa la carpeta de correo no deseado antes de reenviarlo."
            : "Si el código no llega, solicita asistencia al administrador de tu sede."}
        </p>

        {verified ? null : (
          <Button
            type="button"
            variant="tertiary"
            size="sm"
            onClick={useAnotherAccount}
            className="font-medium hover:underline hover:underline-offset-4"
          >
            Usar otra cuenta
          </Button>
        )}
      </div>
    </div>
  );
}

/** Mensajes de desenlace — §5: qué pasó y cuál es el paso siguiente. */
function FormNotice({ notice }: { notice: Notice }): React.JSX.Element {
  switch (notice.kind) {
    case "invalid-code":
      return (
        <Alert variant="error" title="Código incorrecto">
          Revisa el último correo recibido e introduce el código nuevamente. Te{" "}
          {notice.attemptsRemaining === 1 ? "queda 1 intento" : `quedan ${notice.attemptsRemaining} intentos`}{" "}
          antes de tener que iniciar sesión otra vez.
        </Alert>
      );
    case "code-expired":
      return (
        <Alert variant="warning" title="El código caducó">
          Por seguridad los códigos duran poco tiempo. Solicita uno nuevo para continuar.
        </Alert>
      );
    case "locked-attempts":
      return (
        <Alert variant="error" title="Verificación cancelada">
          Se agotaron los intentos de este código. Vuelve a iniciar sesión para recibir uno nuevo.
          Si no reconoces estos intentos, avisa al administrador de tu sede.
        </Alert>
      );
    case "locked-sends":
      return (
        <Alert variant="error" title="Sin más envíos disponibles">
          Se alcanzó el número máximo de envíos para este inicio de sesión. Vuelve a iniciar sesión
          o solicita asistencia al administrador de tu sede.
        </Alert>
      );
    case "resent":
      return (
        <Alert variant="success" title="Código reenviado">
          Enviamos un código nuevo. El anterior ya no es válido.
        </Alert>
      );
    case "too-soon":
      return (
        <Alert variant="warning" title="Espera unos segundos">
          Ya enviamos un código hace muy poco. Espera a que termine la cuenta atrás antes de pedir
          otro.
        </Alert>
      );
    case "network-error":
      return (
        <Alert variant="error" title="No se pudo conectar con PuntoCash">
          Revisa tu conexión e intenta nuevamente. El código sigue siendo válido mientras no
          caduque.
        </Alert>
      );
  }
}

/**
 * Cabecera de la pantalla: a dónde fue el código.
 *
 * Vive junto al formulario porque lee el mismo reto en memoria, y el correo
 * enmascarado es lo único que revela — nunca la dirección completa.
 */
export function VerificationHeading(): React.JSX.Element {
  // Vacío en el servidor y durante la hidratación; el reto solo existe en el navegador.
  const hydrated = useHydrated();
  const maskedEmail = hydrated ? (peekChallenge()?.maskedEmail ?? null) : null;

  return (
    <header className="mb-10 flex flex-col items-center text-center">
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-card border border-border bg-surface text-primary shadow-card"
      >
        <ShieldCheck className="size-6" />
      </span>

      <h1 className="mt-6 text-screen-title text-text-primary">Verifica que eres tú</h1>

      <p
        id="verification-destination"
        className="mx-auto mt-3 max-w-[24rem] text-body text-text-secondary"
      >
        {maskedEmail ? (
          <>
            Enviamos un código de 6 dígitos a{" "}
            <span className="inline-flex items-center gap-1.5 font-medium text-text-primary">
              <MailCheck className="size-4 text-primary" aria-hidden="true" />
              <span>{maskedEmail}</span>
            </span>
          </>
        ) : (
          "Enviamos un código de 6 dígitos al correo registrado de tu cuenta."
        )}
      </p>
    </header>
  );
}
