"use client";

import * as React from "react";
import Link from "next/link";
import { Camera, CameraOff, CheckCircle2, KeyRound, MonitorSmartphone, QrCode, RotateCcw } from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CodeInput,
  Field,
  fieldAria,
  type FieldSpec,
} from "@/components/ui";
import { useHydrated } from "@/lib/use-hydrated";
import type { RetoPresentado, TerminalKind } from "@/features/network/devices";
import {
  identificarRetoAction,
  vincularEquipoAction,
  type ResultadoVinculacion,
} from "../_actions";

/**
 * El acto de vincular — **FR-AD-EQ-17 a FR-AD-EQ-24**.
 *
 * Dos pasos, y el orden no es estético: la pantalla **no puede pedir el
 * objeto antes de saber qué está vinculando** (**FR-AD-EQ-18**), porque una
 * caja necesita sede y caja y un kiosco solo sede. Así que primero se
 * identifica el equipo y solo después se le pregunta a qué se ata.
 *
 * Las **dos vías conviven** en el primer paso, sin obligar a elegir
 * (**FR-AD-EQ-17**): la cámara y el código de seis cifras. Si no hay cámara o
 * se deniega el permiso, la del código sigue ahí mismo (**FR-AD-EQ-19**) — la
 * degradación no manda a nadie a otra pantalla.
 *
 * El código vive en el estado de este componente, así que un error lo
 * conserva y se puede reintentar sin volver a teclearlo (**FR-AD-EQ-21**). El
 * campo es el `CodeInput` del sistema, que es el mismo de la verificación en
 * dos pasos: un `<input>` real sobre seis casillas, con la agrupación 3+3 que
 * el documento pide y que el terminal muestra.
 *
 * Esta consola **no muestra ninguna credencial de dispositivo**
 * (**FR-AD-EQ-25**): la emite y la revoca el sistema, y aquí no hay nada que
 * copiar ni exportar.
 */

export interface SedeParaVincular {
  id: string;
  name: string;
  suspendida: boolean;
  cajas: readonly { id: string; name: string; equipoId: string | null }[];
}

export interface RetoDeDemostracion {
  deviceId: string;
  kind: TerminalKind;
  /** Agrupado de tres en tres, como lo muestra el terminal. */
  codigo: string;
}

const CODIGO: FieldSpec = {
  id: "vincular-codigo",
  label: "Código de seis cifras",
  description: "El que muestra la pantalla del equipo.",
  required: true,
};

const SEDE: FieldSpec = {
  id: "vincular-sede",
  label: "Sede",
  description: "Solo aparecen las sedes que administras.",
  required: true,
};

const CAJA: FieldSpec = {
  id: "vincular-caja",
  label: "Caja",
  description: "Una caja admite un solo equipo a la vez.",
  required: true,
};

const CLASE: Record<TerminalKind, string> = {
  caja: "Equipo de caja",
  kiosco: "Kiosco de autoservicio",
};

const SELECT_CLASS =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle";

type Paso =
  | { nombre: "identificar" }
  | {
      nombre: "objeto";
      reto: RetoPresentado;
      kind: TerminalKind;
      deviceId: string;
      /** Hora local a la que vence el reto, ya formateada. */
      caducaA: string;
    }
  | { nombre: "listo"; resultado: Extract<ResultadoVinculacion, { ok: true }> };

export function VincularFlow({
  sedes,
  retosDemo,
}: {
  sedes: readonly SedeParaVincular[];
  retosDemo: readonly RetoDeDemostracion[];
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [paso, setPaso] = React.useState<Paso>({ nombre: "identificar" });
  const [codigo, setCodigo] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);

  function volverAEmpezar() {
    setPaso({ nombre: "identificar" });
    setError(null);
  }

  async function identificar(code: string) {
    if (enviando) return;
    if (code.length === 0) {
      setError("Escribe el código que muestra el equipo.");
      return;
    }

    setError(null);
    setEnviando(true);
    const resultado = await identificarRetoAction({ method: "codigo", code });
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }

    setPaso({
      nombre: "objeto",
      reto: { method: "codigo", code },
      kind: resultado.reto.kind,
      deviceId: resultado.reto.deviceId,
      caducaA: new Date(resultado.reto.expiresAt).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }

  async function onObjeto(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando || paso.nombre !== "objeto") return;

    const data = new FormData(event.currentTarget);
    const branchId = String(data.get("sede") ?? "");
    const registerId = String(data.get("caja") ?? "");

    if (!branchId) {
      setError("Elige la sede a la que pertenece este equipo.");
      return;
    }
    if (paso.kind === "caja" && !registerId) {
      setError("Elige la caja a la que pertenece este equipo.");
      return;
    }

    setError(null);
    setEnviando(true);
    const resultado = await vincularEquipoAction({
      reto: paso.reto,
      branchId,
      ...(paso.kind === "caja" ? { registerId } : {}),
    });
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }

    setCodigo("");
    setPaso({ nombre: "listo", resultado });
  }

  if (paso.nombre === "listo") {
    return <Vinculado resultado={paso.resultado} onOtro={volverAEmpezar} />;
  }

  if (paso.nombre === "objeto") {
    return (
      <ElegirObjeto
        paso={paso}
        sedes={sedes}
        error={error}
        enviando={enviando}
        hydrated={hydrated}
        onSubmit={onObjeto}
        onVolver={volverAEmpezar}
      />
    );
  }

  return (
    <Identificar
      codigo={codigo}
      error={error}
      enviando={enviando}
      hydrated={hydrated}
      retosDemo={retosDemo}
      onCodigo={(next) => {
        setCodigo(next);
        if (error) setError(null);
      }}
      onEnviar={identificar}
    />
  );
}

/* -------------------------------------------------------------------------
 * Paso 1 — qué equipo
 * ---------------------------------------------------------------------- */

function Identificar({
  codigo,
  error,
  enviando,
  hydrated,
  retosDemo,
  onCodigo,
  onEnviar,
}: {
  codigo: string;
  error: string | null;
  enviando: boolean;
  hydrated: boolean;
  retosDemo: readonly RetoDeDemostracion[];
  onCodigo: (valor: string) => void;
  onEnviar: (codigo: string) => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <Alert variant="error" title="No pudimos identificar el equipo">
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-6 wide:grid-cols-2">
        <Escanear disabled={enviando} />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-control bg-primary-subtle text-primary"
              >
                <KeyRound className="size-[18px]" />
              </span>
              <CardTitle>Escribir el código</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                onEnviar(codigo);
              }}
              className="flex flex-col gap-6"
            >
              <Field {...CODIGO} className="items-center text-center">
                <CodeInput
                  {...fieldAria(CODIGO)}
                  value={codigo}
                  onChange={onCodigo}
                  onComplete={onEnviar}
                  disabled={enviando}
                  invalid={Boolean(error)}
                  aria-invalid={error ? true : undefined}
                />
              </Field>

              <div className="flex justify-end">
                <Button type="submit" loading={enviando} disabled={!hydrated}>
                  Identificar el equipo
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {retosDemo.length > 0 ? <NotaDeDemostracion retos={retosDemo} /> : null}
    </div>
  );
}

/**
 * La vía de la cámara. Pide el permiso **después de explicar para qué**
 * (**FR-AD-EQ-19**) y, si no hay cámara o se deniega, lo dice aquí mismo y
 * deja la vía del código intacta a su lado.
 *
 * El QR **no se descodifica**, y es deliberado: en esta demostración el
 * terminal tampoco genera uno escaneable —su propio panel lo advierte—, así
 * que leerlo exigiría una biblioteca de visión por un gesto que el
 * desarrollador implementará contra el equipo real. Lo que esta pantalla
 * establece es dónde va la cámara, qué se le explica al administrador antes
 * de encenderla, y cómo se degrada cuando no hay.
 */
function Escanear({ disabled }: { disabled: boolean }): React.JSX.Element {
  const [estado, setEstado] = React.useState<"explicando" | "pidiendo" | "viendo" | "sin-camara">(
    "explicando",
  );
  const video = React.useRef<HTMLVideoElement>(null);
  const stream = React.useRef<MediaStream | null>(null);

  React.useEffect(
    () => () => {
      stream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  async function encender() {
    setEstado("pidiendo");
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      stream.current = media;
      setEstado("viendo");
      if (video.current) {
        video.current.srcObject = media;
        await video.current.play().catch(() => undefined);
      }
    } catch {
      /* Sin cámara, permiso denegado, o un navegador que no lo ofrece: los
         tres se leen igual desde aquí y los tres tienen la misma salida. */
      setEstado("sin-camara");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-control bg-primary-subtle text-primary"
          >
            <QrCode className="size-[18px]" />
          </span>
          <CardTitle>Escanear el QR</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-0">
        {estado === "viendo" ? (
          <>
            <div className="relative overflow-hidden rounded-control border border-border bg-surface-subtle">
              <video ref={video} muted playsInline className="aspect-video w-full object-cover" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-6 rounded-control border-2 border-primary/70"
              />
            </div>
            <p className="text-body-sm text-text-secondary">
              Encuadra el QR que muestra el equipo. En esta demostración ese QR es ilustrativo
              todavía: usa el campo del código para continuar.
            </p>
          </>
        ) : (
          <>
            <p className="text-body text-text-secondary">
              Usamos la cámara de este dispositivo solo para leer el QR que el equipo tiene en
              pantalla. No se graba nada ni se envía ninguna imagen.
            </p>

            {estado === "sin-camara" ? (
              <Alert variant="warning" title="No pudimos usar la cámara">
                No hay cámara disponible o se denegó el permiso. Puedes vincular el equipo
                escribiendo su código de seis cifras.
              </Alert>
            ) : null}

            <div className="flex justify-end">
              <Button
                variant="secondary"
                type="button"
                loading={estado === "pidiendo"}
                disabled={disabled || estado === "sin-camara"}
                onClick={encender}
              >
                {estado === "sin-camara" ? (
                  <CameraOff aria-hidden="true" />
                ) : (
                  <Camera aria-hidden="true" />
                )}
                Usar la cámara
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * De dónde salen los códigos mientras el terminal no pregunte al servidor
 * quién es (**FR-AD-EQ-26**). Es andamio de la demostración y lo dice: sin
 * esto no habría ningún código que teclear y la pantalla no se podría
 * recorrer.
 */
function NotaDeDemostracion({
  retos,
}: {
  retos: readonly RetoDeDemostracion[];
}): React.JSX.Element {
  return (
    <Alert variant="info" title="Versión de demostración">
      <p>
        En el producto, estas seis cifras se leen de la pantalla del equipo que tienes delante.
        Aquí hay dos equipos esperando, para que puedas recorrer las dos ramas: una caja pide sede
        y caja, un kiosco solo sede.
      </p>
      <ul className="mt-3 flex flex-col gap-1">
        {retos.map((reto) => (
          <li key={reto.deviceId} className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-text-primary">{CLASE[reto.kind]}</span>
            <span className="pc-numeric text-text-secondary">{reto.deviceId}</span>
            <span aria-hidden="true" className="text-text-secondary">
              ·
            </span>
            <span className="pc-numeric font-semibold text-text-primary">{reto.codigo}</span>
          </li>
        ))}
      </ul>
    </Alert>
  );
}

/* -------------------------------------------------------------------------
 * Paso 2 — a qué objeto
 * ---------------------------------------------------------------------- */

function ElegirObjeto({
  paso,
  sedes,
  error,
  enviando,
  hydrated,
  onSubmit,
  onVolver,
}: {
  paso: Extract<Paso, { nombre: "objeto" }>;
  sedes: readonly SedeParaVincular[];
  error: string | null;
  enviando: boolean;
  hydrated: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onVolver: () => void;
}): React.JSX.Element {
  const unica = sedes.length === 1 ? sedes[0] : undefined;
  const [sedeId, setSedeId] = React.useState<string>(unica?.id ?? "");
  const sede = sedes.find((opcion) => opcion.id === sedeId);

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-control bg-primary-subtle text-primary"
              >
                <MonitorSmartphone className="size-[18px]" />
              </span>
              <div>
                <CardTitle>{CLASE[paso.kind]}</CardTitle>
                <p className="pc-numeric mt-0.5 text-caption text-text-secondary">
                  {paso.deviceId}
                </p>
              </div>
            </div>
            <Badge variant="info">El código caduca a las {paso.caducaA}</Badge>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6 pt-0">
          {error ? (
            <Alert variant="error" title="No se pudo vincular">
              {error}
            </Alert>
          ) : null}

          {unica ? (
            <>
              <input type="hidden" name="sede" value={unica.id} />
              <div>
                <p className="text-label font-medium text-text-primary">Sede</p>
                <p className="mt-1 text-body text-text-secondary">{unica.name}</p>
              </div>
            </>
          ) : (
            <Field {...SEDE}>
              <select
                {...fieldAria(SEDE)}
                name="sede"
                value={sedeId}
                disabled={enviando}
                onChange={(event) => setSedeId(event.target.value)}
                className={SELECT_CLASS}
              >
                <option value="" disabled>
                  Elige una sede
                </option>
                {sedes.map((opcion) => (
                  <option key={opcion.id} value={opcion.id}>
                    {opcion.name}
                    {opcion.suspendida ? " · suspendida" : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {paso.kind === "caja" ? (
            <Field {...CAJA}>
              <select
                {...fieldAria(CAJA)}
                name="caja"
                defaultValue=""
                disabled={enviando || !sede}
                className={SELECT_CLASS}
              >
                <option value="" disabled>
                  {sede ? "Elige una caja" : "Elige primero la sede"}
                </option>
                {/* Una caja que ya tiene equipo se ofrece **inhabilitada y
                    diciendo cuál** (**FR-AD-EQ-8**): ocultarla dejaría al
                    administrador buscando una caja que sí existe. */}
                {(sede?.cajas ?? []).map((caja) => (
                  <option key={caja.id} value={caja.id} disabled={caja.equipoId !== null}>
                    {caja.name}
                    {caja.equipoId ? ` · ya tiene ${caja.equipoId}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <p className="text-body-sm text-text-secondary">
              Un kiosco pertenece a la sede, no a una caja. Una sede puede tener varios kioscos a
              la vez.
            </p>
          )}
        </CardContent>
      </Card>

      {/* La misma geometría que `DialogFooter`, que es la pareja de acciones
          del sistema: apiladas a todo lo ancho en estrecho —`/admin` se usa
          desde 360px—, y en fila a la derecha a partir de `sm`. Dejarlas
          envolver cada una con su ancho las escalona contra el borde. */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="secondary" type="button" disabled={enviando} onClick={onVolver}>
          <RotateCcw aria-hidden="true" />
          Empezar de nuevo
        </Button>
        <Button type="submit" loading={enviando} disabled={!hydrated}>
          Vincular el equipo
        </Button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------
 * Paso 3 — qué quedó vinculado a qué
 * ---------------------------------------------------------------------- */

/**
 * **FR-AD-EQ-24**: dice qué quedó vinculado a qué con todas sus letras, y
 * advierte de lo que el administrador **no** tiene que ir a hacer — el equipo
 * cambia solo.
 */
function Vinculado({
  resultado,
  onOtro,
}: {
  resultado: Extract<ResultadoVinculacion, { ok: true }>;
  onOtro: () => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <span
            aria-hidden="true"
            className="grid size-12 place-items-center rounded-control bg-success-subtle text-success-foreground"
          >
            <CheckCircle2 className="size-6" />
          </span>
          <h2 className="mt-2 text-section-title text-text-primary">Equipo vinculado</h2>
          <p className="max-w-2xl text-body text-text-secondary">
            Este equipo es ahora{" "}
            <span className="font-semibold text-text-primary">
              {resultado.kind === "caja" ? `la ${resultado.objeto}` : "un kiosco"} de{" "}
              {resultado.sede}
            </span>
            .
          </p>
          <p className="pc-numeric text-caption text-text-secondary">{resultado.equipo}</p>
          <p className="mt-2 max-w-2xl text-body-sm text-text-secondary">
            No hace falta tocar el equipo: cambia solo. En unos segundos dejará su pantalla de
            vinculación y mostrará{" "}
            {resultado.kind === "caja"
              ? "el inicio de sesión del trabajador"
              : "la bienvenida del autoservicio"}
            .
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="secondary" type="button" onClick={onOtro}>
          Vincular otro equipo
        </Button>
        <Button asChild>
          <Link href="/admin/equipos">Volver a Equipos</Link>
        </Button>
      </div>
    </div>
  );
}
