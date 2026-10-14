"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, CircleCheck, KeyRound, Mail, RotateCcw, User } from "lucide-react";

import {
  Alert,
  Button,
  CodeInput,
  Field,
  fieldAria,
  Input,
  PasswordInput,
  type FieldSpec,
} from "@/components/ui";
import { useHydrated } from "@/lib/use-hydrated";
import {
  abandonarRecuperacion,
  fijarContrasena,
  LARGO_MINIMO,
  reenviarCodigo,
  solicitarRecuperacion,
  verificarCodigo,
  type RecoveryChallengeView,
} from "@/features/auth/password-recovery";

/**
 * «¿Olvidaste tu contraseña?» — el flujo completo, en tres pasos, **compartido
 * por las dos consolas** (Worker FRD §2.13, Admin FRD **FR-AD-ACC-8**).
 *
 * Nació dentro de `/worker` y se extrajo aquí al llegar `/admin`, por lo mismo
 * que el formulario del segundo factor: el trámite es idéntico y sus matices
 * —no decir a dónde fue el código, responder igual exista la cuenta o no, no
 * abrir sesión al terminar— no deben poder separarse entre productos. Lo
 * único propio de cada una es a dónde se vuelve y a quién se le pide ayuda.
 *
 * ── Por qué un solo componente y no tres rutas ───────────────────────
 * El reto vive en memoria del navegador, igual que el del segundo factor, así
 * que cada navegación de verdad lo mataría. Los tres pasos son estado de esta
 * pantalla; recargarla cancela la recuperación, y eso se dice en vez de
 * fingirse.
 *
 * ── Lo que esta pantalla no dice, y es deliberado ───────────────────
 * **No enseña a qué correo fue el código**, ni enmascarado. La verificación
 * del acceso sí lo hace y FR-2FA-5 lo justifica: allí se llega con una
 * contraseña acertada. Aquí se llega escribiendo un identificador, que
 * cualquiera puede teclear, así que enseñarlo convertiría esta pantalla en un
 * buscador de correos ajenos.
 *
 * Por lo mismo, **el paso dos se ve igual exista la cuenta o no**. Quien
 * teclee el identificador de otro no averigua si existe: ve la misma pantalla
 * y agota los tres intentos.
 *
 * ── Y lo que no hace al terminar ─────────────────────────────────
 * **No abre sesión.** Un código verificado aquí demuestra el correo, no
 * cierra el acceso: al fijar la contraseña se vuelve al inicio de sesión y se
 * pasa por los dos pasos de siempre **[R13]**.
 */

type Paso = "identificador" | "codigo" | "contrasena" | "listo";

/**
 * **El encabezado vive aquí dentro, no en la página.** Es lo mismo que hace la
 * verificación con `TwoFactorHeading`, y por el mismo motivo: un título fijo en
 * el servidor acabaría diciendo «te enviamos un código para que elijas una
 * nueva» encima del mensaje de que la contraseña **ya está cambiada**. El
 * encabezado es parte del paso, no del marco.
 */
const ENCABEZADO: Record<Paso, { titulo: string; entrada: string }> = {
  identificador: {
    titulo: "¿Olvidaste tu contraseña?",
    entrada: "Te enviamos un código a tu correo registrado para que puedas elegir una nueva.",
  },
  codigo: {
    titulo: "Revisa tu correo",
    entrada: "Escribe el código que acabamos de enviarte.",
  },
  contrasena: {
    titulo: "Elige tu contraseña nueva",
    entrada: "Es la que usarás a partir de ahora para iniciar sesión.",
  },
  listo: {
    titulo: "Todo listo",
    entrada: "Ya puedes volver a entrar.",
  },
};

const IDENTIFICADOR: FieldSpec = {
  id: "recuperar-identificador",
  label: "Usuario o correo electrónico",
};

const CODIGO: FieldSpec = {
  id: "recuperar-codigo",
  label: "Código de verificación",
};

const NUEVA: FieldSpec = {
  id: "recuperar-nueva",
  label: "Contraseña nueva",
  description: `Al menos ${LARGO_MINIMO} caracteres.`,
};

const REPETIR: FieldSpec = {
  id: "recuperar-repetir",
  label: "Repite la contraseña nueva",
};

function cuentaAtras(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export interface RecuperacionCopy {
  /** Inicio de sesión de esta consola: el punto al que se vuelve siempre. */
  loginHref: Route;
  /**
   * A quién se le pide ayuda cuando el correo registrado ya no sirve.
   *
   * **Lleva la preposición incluida** —«a tu administrador de sede», «al
   * administrador principal»— porque en español no se puede dejar fuera: con
   * un «a» fijo en la plantilla, la mitad de los textos salían como «a el
   * administrador».
   */
  asistencia: string;
}

export function PasswordRecoveryForm({
  copy,
  alGuardar,
}: {
  copy: RecuperacionCopy;
  /**
   * Se llama al fijar la contraseña, con la cuenta y la contraseña nuevas.
   *
   * Existe por una diferencia de los dos simuladores que no se ve hasta que
   * falla. El mock de Worker corre **en el navegador**, así que la contraseña
   * fijada queda en la misma memoria que luego la comprueba. El de `/admin`
   * corre **en el servidor** —a propósito: la identidad de quien acierta la
   * contraseña no debe cruzar al cliente—, así que lo que esta pantalla guarda
   * en el navegador no lo ve nadie, y el acceso seguía aceptando la contraseña
   * vieja. Con esto, cada consola lleva lo fijado a donde su acceso lo mira.
   */
  alGuardar?: (cuenta: string, contrasena: string) => void | Promise<void>;
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [paso, setPaso] = React.useState<Paso>("identificador");
  const [reto, setReto] = React.useState<RecoveryChallengeView | null>(null);
  const [enVuelo, setEnVuelo] = React.useState(false);

  /* Un reto agotado no se reabre: se empieza otra vez desde el identificador,
     y mientras tanto el paso del código deja de admitir nada. */
  const [agotado, setAgotado] = React.useState<"attempts" | "sends" | null>(null);

  const reiniciar = () => {
    abandonarRecuperacion();
    setReto(null);
    setAgotado(null);
    setPaso("identificador");
  };

  const encabezado = ENCABEZADO[paso];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-screen-title text-text-primary">{encabezado.titulo}</h1>
        <p className="mt-2 text-body text-text-secondary">{encabezado.entrada}</p>
      </div>

      {paso === "listo" ? <Listo copy={copy} /> : null}
      {paso === "identificador" ? (
        <PasoIdentificador
          copy={copy}
          hydrated={hydrated}
          enVuelo={enVuelo}
          setEnVuelo={setEnVuelo}
          alEmitir={(nuevo) => {
            setReto(nuevo);
            setAgotado(null);
            setPaso("codigo");
          }}
        />
      ) : null}

      {paso === "codigo" && reto ? (
        <PasoCodigo
          copy={copy}
          reto={reto}
          setReto={setReto}
          agotado={agotado}
          setAgotado={setAgotado}
          enVuelo={enVuelo}
          setEnVuelo={setEnVuelo}
          alVerificar={() => setPaso("contrasena")}
          alReiniciar={reiniciar}
        />
      ) : null}

      {paso === "contrasena" ? (
        <PasoContrasena
          alGuardar={alGuardar}
          hydrated={hydrated}
          enVuelo={enVuelo}
          setEnVuelo={setEnVuelo}
          alFijar={() => setPaso("listo")}
          alReiniciar={reiniciar}
        />
      ) : null}

      {/* En el paso de la contraseña nueva irse perdería un código ya
          verificado, y en el desenlace el botón principal ya lleva al mismo
          sitio: en los dos casos este enlace sobra. */}
      {paso !== "contrasena" && paso !== "listo" ? (
        <Button variant="ghost" size="sm" asChild className="self-center font-medium">
          <Link href={copy.loginHref}>
            <ArrowLeft aria-hidden="true" />
            Volver a iniciar sesión
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Paso 1 — el identificador
 * ---------------------------------------------------------------------- */

function PasoIdentificador({
  copy,
  hydrated,
  enVuelo,
  setEnVuelo,
  alEmitir,
}: {
  copy: RecuperacionCopy;
  hydrated: boolean;
  enVuelo: boolean;
  setEnVuelo: (v: boolean) => void;
  alEmitir: (reto: RecoveryChallengeView) => void;
}): React.JSX.Element {
  const [valor, setValor] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  const [fallo, setFallo] = React.useState(false);

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    if (!valor.trim()) {
      setError("Escribe tu usuario o tu correo.");
      return;
    }
    setError(undefined);
    setFallo(false);
    setEnVuelo(true);
    const resultado = await solicitarRecuperacion(valor);
    setEnVuelo(false);
    if (resultado.status === "network-error") {
      setFallo(true);
      return;
    }
    alEmitir(resultado.challenge);
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-6">
      {fallo ? (
        <Alert variant="error" title="No se pudo conectar con PuntoCash">
          Revisa la conexión e inténtalo otra vez. Si el problema continúa, pídele asistencia{" "}
          {copy.asistencia}.
        </Alert>
      ) : null}

      <Field {...IDENTIFICADOR} error={error}>
        <Input
          {...fieldAria({ ...IDENTIFICADOR, error })}
          value={valor}
          onChange={(event) => {
            setValor(event.target.value);
            if (error) setError(undefined);
          }}
          autoComplete="username"
          autoFocus
          disabled={enVuelo}
          invalid={Boolean(error)}
          leading={<User aria-hidden="true" />}
        />
      </Field>

      <Button type="submit" size="md" block loading={enVuelo} disabled={!hydrated}>
        <Mail aria-hidden="true" />
        Enviarme un código
      </Button>

      {/* Se dice **antes** de enviarlo, no después: quien no tenga acceso a su
          correo necesita saberlo aquí y no tras agotar tres intentos. */}
      <p className="text-body-sm text-text-secondary">
        El código llega a tu correo registrado. Si ya no puedes entrar en él, pídele{" "}
        {copy.asistencia} que lo corrija.
      </p>
    </form>
  );
}

/* -------------------------------------------------------------------------
 * Paso 2 — el código
 * ---------------------------------------------------------------------- */

function PasoCodigo({
  copy,
  reto,
  setReto,
  agotado,
  setAgotado,
  enVuelo,
  setEnVuelo,
  alVerificar,
  alReiniciar,
}: {
  copy: RecuperacionCopy;
  reto: RecoveryChallengeView;
  setReto: (r: RecoveryChallengeView) => void;
  agotado: "attempts" | "sends" | null;
  setAgotado: (v: "attempts" | "sends" | null) => void;
  enVuelo: boolean;
  setEnVuelo: (v: boolean) => void;
  alVerificar: () => void;
  alReiniciar: () => void;
}): React.JSX.Element {
  const [codigo, setCodigo] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  const [aviso, setAviso] = React.useState<{ titulo: string; texto: string } | null>(null);
  const [ahora, setAhora] = React.useState(() => Date.now());

  /* El envío automático al último dígito y el `submit` del formulario pueden
     caer en el mismo tick, y el estado de React todavía no lo refleja: el
     testigo es una ref para que solo salga una verificación. */
  const saliendo = React.useRef(false);

  React.useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const caducado = reto.expiresAt - ahora <= 0;
  const esperaReenvio = Math.max(0, reto.resendAvailableAt - ahora);
  const cerrado = Boolean(agotado) || enVuelo;

  async function comprobar(valor: string) {
    if (saliendo.current || agotado) return;
    if (valor.length < reto.codeLength) {
      setError(`El código tiene ${reto.codeLength} dígitos.`);
      return;
    }
    saliendo.current = true;
    setError(undefined);
    setAviso(null);
    setEnVuelo(true);
    const resultado = await verificarCodigo(valor);
    setEnVuelo(false);
    saliendo.current = false;

    switch (resultado.status) {
      case "verified":
        alVerificar();
        return;
      case "invalid-code":
        setReto(resultado.challenge);
        setCodigo("");
        setError(
          resultado.challenge.attemptsRemaining === 1
            ? "El código no es correcto. Te queda un intento."
            : `El código no es correcto. Te quedan ${resultado.challenge.attemptsRemaining} intentos.`,
        );
        return;
      case "code-expired":
        setReto(resultado.challenge);
        setCodigo("");
        setError("Ese código ya caducó. Pide uno nuevo.");
        return;
      case "network-error":
        setReto(resultado.challenge);
        setAviso({
          titulo: "No se pudo comprobar el código",
          texto: "Inténtalo otra vez: no se gastó ningún intento.",
        });
        return;
      case "challenge-locked":
        setAgotado(resultado.reason);
        return;
      case "challenge-not-found":
        setAgotado("sends");
        return;
    }
  }

  async function reenviar() {
    setError(undefined);
    setAviso(null);
    setEnVuelo(true);
    const resultado = await reenviarCodigo();
    setEnVuelo(false);

    if (resultado.status === "sent") {
      setReto(resultado.challenge);
      setCodigo("");
      setAviso({
        titulo: "Código reenviado",
        texto: "Te enviamos un código nuevo. El anterior ya no sirve.",
      });
      return;
    }
    if (resultado.status === "too-soon") {
      setReto(resultado.challenge);
      return;
    }
    setAgotado("sends");
  }

  if (agotado) {
    return (
      <div className="flex flex-col gap-6">
        <Alert
          variant="error"
          title={
            agotado === "attempts"
              ? "Demasiados intentos con un código incorrecto"
              : "Se agotaron los envíos de código"
          }
        >
          Por seguridad, esta recuperación se cerró. Puedes empezar otra, y si tampoco así entras,
          pídele asistencia {copy.asistencia}.
        </Alert>

        <Button size="md" block onClick={alReiniciar}>
          <RotateCcw aria-hidden="true" />
          Empezar de nuevo
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void comprobar(codigo);
      }}
      className="flex flex-col gap-6"
    >
      {/* **Esta frase es la de FR-REC-4**, y está escrita en condicional a
          propósito: quien teclee el identificador de otro no debe averiguar si
          existe. No se cambia por «te enviamos un código». */}
      <Alert variant="info" title="Si existe esa cuenta, el código ya salió">
        Le acabamos de enviar un código de {reto.codeLength} dígitos a su correo registrado.
      </Alert>

      {aviso ? (
        <Alert variant="info" title={aviso.titulo}>
          {aviso.texto}
        </Alert>
      ) : null}

      <Field {...CODIGO} error={error} className="items-center text-center">
        <CodeInput
          {...fieldAria({ ...CODIGO, error })}
          value={codigo}
          onChange={(siguiente) => {
            setCodigo(siguiente);
            if (error) setError(undefined);
          }}
          onComplete={(siguiente) => void comprobar(siguiente)}
          length={reto.codeLength}
          autoFocus
          disabled={cerrado}
          invalid={Boolean(error)}
          aria-invalid={Boolean(error) || undefined}
        />
      </Field>

      <p className="text-center text-body-sm text-text-secondary">
        {caducado ? "El código caducó." : `El código caduca en ${cuentaAtras(reto.expiresAt - ahora)}.`}
      </p>

      <Button type="submit" size="md" block loading={enVuelo} disabled={cerrado}>
        Comprobar código
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        block
        onClick={() => void reenviar()}
        disabled={cerrado || esperaReenvio > 0 || reto.resendsRemaining <= 0}
      >
        <RotateCcw aria-hidden="true" />
        {esperaReenvio > 0
          ? `Reenviar código en ${cuentaAtras(esperaReenvio)}`
          : "Enviarme otro código"}
      </Button>
    </form>
  );
}

/* -------------------------------------------------------------------------
 * Paso 3 — la contraseña nueva
 * ---------------------------------------------------------------------- */

function PasoContrasena({
  alGuardar,
  hydrated,
  enVuelo,
  setEnVuelo,
  alFijar,
  alReiniciar,
}: {
  alGuardar?: (cuenta: string, contrasena: string) => void | Promise<void>;
  hydrated: boolean;
  enVuelo: boolean;
  setEnVuelo: (v: boolean) => void;
  alFijar: () => void;
  alReiniciar: () => void;
}): React.JSX.Element {
  const [nueva, setNueva] = React.useState("");
  const [repetida, setRepetida] = React.useState("");
  const [errorNueva, setErrorNueva] = React.useState<string | undefined>();
  const [errorRepetida, setErrorRepetida] = React.useState<string | undefined>();
  const [caducada, setCaducada] = React.useState(false);

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    setErrorNueva(undefined);
    setErrorRepetida(undefined);
    setEnVuelo(true);
    const resultado = await fijarContrasena(nueva, repetida);
    setEnVuelo(false);

    switch (resultado.status) {
      case "ok":
        /* Antes de pasar al desenlace, se le entrega lo fijado a quien tenga
           que guardarlo donde su acceso lo mire (ver `alGuardar`). */
        await alGuardar?.(resultado.cuenta, nueva);
        alFijar();
        return;
      case "demasiado-corta":
        setErrorNueva(`La contraseña necesita al menos ${LARGO_MINIMO} caracteres.`);
        return;
      case "no-coinciden":
        setErrorRepetida("Las dos contraseñas no son iguales.");
        return;
      case "no-verificado":
        setCaducada(true);
        return;
    }
  }

  if (caducada) {
    return (
      <div className="flex flex-col gap-6">
        <Alert variant="warning" title="La recuperación ya no está activa">
          Caduca al recargar esta pantalla o al abandonarla. Empieza otra para recibir un código
          nuevo.
        </Alert>
        <Button size="md" block onClick={alReiniciar}>
          <RotateCcw aria-hidden="true" />
          Empezar de nuevo
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-6">
      <Alert variant="success" title="Código verificado">
        Elige tu contraseña nueva. La anterior dejará de servir en cuanto la guardes.
      </Alert>

      <Field {...NUEVA} error={errorNueva}>
        <PasswordInput
          {...fieldAria({ ...NUEVA, error: errorNueva })}
          value={nueva}
          onChange={(event) => {
            setNueva(event.target.value);
            if (errorNueva) setErrorNueva(undefined);
          }}
          autoComplete="new-password"
          autoFocus
          disabled={enVuelo}
          invalid={Boolean(errorNueva)}
        />
      </Field>

      <Field {...REPETIR} error={errorRepetida}>
        <PasswordInput
          {...fieldAria({ ...REPETIR, error: errorRepetida })}
          value={repetida}
          onChange={(event) => {
            setRepetida(event.target.value);
            if (errorRepetida) setErrorRepetida(undefined);
          }}
          autoComplete="new-password"
          disabled={enVuelo}
          invalid={Boolean(errorRepetida)}
        />
      </Field>

      <Button type="submit" size="md" block loading={enVuelo} disabled={!hydrated}>
        <KeyRound aria-hidden="true" />
        Guardar contraseña
      </Button>
    </form>
  );
}

/* -------------------------------------------------------------------------
 * Desenlace
 * ---------------------------------------------------------------------- */

/**
 * **No entra: devuelve al inicio de sesión.** Verificar un código aquí
 * demuestra el correo, y eso no es una sesión **[R13]**. Además esto corre en
 * el equipo de una caja, compartido: dejar la sesión abierta a quien acaba de
 * cambiar la contraseña sería dejarla abierta a quien pase después.
 */
function Listo({ copy }: { copy: RecuperacionCopy }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <Alert variant="success" title="Tu contraseña está cambiada">
        Inicia sesión con tu usuario y tu contraseña nueva. Como siempre, te pediremos después el
        código de verificación.
      </Alert>

      <Button size="md" block asChild>
        <Link href={copy.loginHref}>
          <CircleCheck aria-hidden="true" />
          Ir a iniciar sesión
        </Link>
      </Button>
    </div>
  );
}
