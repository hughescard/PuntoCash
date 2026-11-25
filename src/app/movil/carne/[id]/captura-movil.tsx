"use client";

import * as React from "react";
import {
  Camera,
  CircleCheck,
  Clock,
  IdCard,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";

import { Alert, Button, Card, CardContent } from "@/components/ui";
import {
  CARAS_DEL_CARNE,
  NOMBRE_DE_CARA,
  type CapturaParaElMovil,
  type CaraDelCarne,
  type EnlaceInservible,
  type FirmaRechazada,
  type FotoRechazada,
} from "@/features/network/fotos-del-carne";
import { useHydrated } from "@/lib/use-hydrated";
import { subirFirmaAction, subirFotoDelCarneAction } from "../_actions";
import { PanelDeFirma } from "./panel-de-firma";

/** Lado mayor de la foto que se sube: el texto del carné se lee y la subida es corta con datos móviles. */
const LADO_MAXIMO = 1600;

const QUE_CARA: Readonly<Record<CaraDelCarne, string>> = {
  anverso: "La cara con la foto de la persona.",
  reverso: "La otra cara del carné.",
};

const ENTREGA: Readonly<Record<CapturaParaElMovil["servicio"], string>> = {
  Remesa: "Entrega de remesa",
  Giros: "Pago de giro",
};

const MENSAJE_DE_RECHAZO: Readonly<Record<FotoRechazada, string>> = {
  "no-existe":
    "Este enlace no corresponde a ninguna entrega. Vuelve a escanear el código de la caja.",
  vencido:
    "El enlace venció. En la caja, pide otro código y vuelve a escanearlo.",
  usado:
    "Esta entrega ya se confirmó en la caja. No hace falta subir nada más.",
  "formato-invalido": "No se pudo leer la imagen. Vuelve a hacer la foto.",
  "demasiado-grande": "La foto es demasiado grande. Vuelve a hacerla.",
};

const MENSAJE_DE_FIRMA: Readonly<
  Record<Exclude<FirmaRechazada, EnlaceInservible>, string>
> = {
  "formato-invalido": "No se pudo leer la firma. Bórrala y vuelve a firmar.",
  "demasiado-grande":
    "La firma es demasiado grande. Bórrala y vuelve a firmar.",
  "faltan-fotos": "Antes de firmar faltan las fotos del carné.",
  "frase-cambio":
    "En la caja cambió lo que se entrega. Vuelve a cargar la página para firmar lo nuevo.",
};

type EstadoDeFirma =
  | { tipo: "pendiente" }
  | { tipo: "enviando" }
  | { tipo: "hecha"; vista: string | null }
  | { tipo: "error"; mensaje: string; recargar?: boolean };

type EstadoDeCara =
  | { tipo: "pendiente" }
  | { tipo: "subiendo"; vista: string }
  | { tipo: "hecha"; vista: string | null }
  | { tipo: "error"; mensaje: string };

export function CapturaMovil({
  id,
  captura,
}: {
  id: string;
  captura: CapturaParaElMovil;
}): React.JSX.Element {
  const [caras, setCaras] = React.useState<Record<CaraDelCarne, EstadoDeCara>>(
    () => ({
      anverso: captura.tomadas.includes("anverso")
        ? { tipo: "hecha", vista: null }
        : { tipo: "pendiente" },
      reverso: captura.tomadas.includes("reverso")
        ? { tipo: "hecha", vista: null }
        : { tipo: "pendiente" },
    }),
  );
  /** Si el enlace dejó de valer mientras se usaba, se dice y no se ofrece nada más. */
  const [inservible, setInservible] = React.useState<EnlaceInservible | null>(
    null,
  );
  const [firma, setFirma] = React.useState<EstadoDeFirma>(() =>
    captura.firmada ? { tipo: "hecha", vista: null } : { tipo: "pendiente" },
  );

  const fotosListas = CARAS_DEL_CARNE.every((c) => caras[c].tipo === "hecha");
  /** El paso de la firma: al terminar la segunda foto, la vista baja hasta él para pasarle el móvil al beneficiario. */
  const pasoDeFirma = React.useRef<HTMLDivElement>(null);
  const listas = fotosListas && firma.tipo === "hecha";

  async function firmar(dataUrl: string) {
    setFirma({ tipo: "enviando" });
    let r: Awaited<ReturnType<typeof subirFirmaAction>>;
    try {
      r = await subirFirmaAction(id, captura.frase, dataUrl);
    } catch {
      setFirma({
        tipo: "error",
        mensaje:
          "No se pudo enviar la firma. Comprueba la conexión del móvil y vuelve a intentarlo.",
      });
      return;
    }
    if (!r.ok) {
      if (
        r.reason === "no-existe" ||
        r.reason === "vencido" ||
        r.reason === "usado"
      ) {
        setInservible(r.reason);
        return;
      }
      setFirma({
        tipo: "error",
        mensaje: MENSAJE_DE_FIRMA[r.reason],
        recargar: r.reason === "frase-cambio",
      });
      return;
    }
    setFirma({ tipo: "hecha", vista: dataUrl });
  }

  async function subir(cara: CaraDelCarne, archivo: File) {
    let dataUrl: string;
    try {
      dataUrl = await reducir(archivo);
    } catch {
      setCaras((x) => ({
        ...x,
        [cara]: {
          tipo: "error",
          mensaje: MENSAJE_DE_RECHAZO["formato-invalido"],
        },
      }));
      return;
    }
    setCaras((x) => ({ ...x, [cara]: { tipo: "subiendo", vista: dataUrl } }));
    let r: Awaited<ReturnType<typeof subirFotoDelCarneAction>>;
    try {
      r = await subirFotoDelCarneAction(id, cara, dataUrl);
    } catch {
      setCaras((x) => ({
        ...x,
        [cara]: {
          tipo: "error",
          mensaje:
            "No se pudo enviar la foto. Comprueba la conexión del móvil y vuelve a intentarlo.",
        },
      }));
      return;
    }
    if (!r.ok) {
      if (
        r.reason === "no-existe" ||
        r.reason === "vencido" ||
        r.reason === "usado"
      ) {
        setInservible(r.reason);
        return;
      }
      setCaras((x) => ({
        ...x,
        [cara]: { tipo: "error", mensaje: MENSAJE_DE_RECHAZO[r.reason] },
      }));
      return;
    }
    const otra = CARAS_DEL_CARNE.find((c) => c !== cara);
    const conEsta = otra !== undefined && caras[otra].tipo === "hecha";
    setCaras((x) => ({ ...x, [cara]: { tipo: "hecha", vista: dataUrl } }));
    if (conEsta && firma.tipo !== "hecha")
      requestAnimationFrame(() =>
        pasoDeFirma.current?.scrollIntoView({ block: "start" }),
      );
  }

  if (inservible) return <EnlaceInservibleView motivo={inservible} />;

  return (
    <>
      <div>
        <p className="text-caption uppercase tracking-wide text-text-secondary">
          {ENTREGA[captura.servicio]}
        </p>
        <h1 className="mt-1 text-screen-title text-text-primary">
          Carné y firma
        </h1>
        <p className="mt-2 text-body text-text-secondary">
          Haz una foto de cada cara del carné de{" "}
          <span className="font-semibold text-text-primary">
            {captura.beneficiario}
          </span>
          , sin reflejos y con el texto legible. Después, pásale el móvil para
          que firme.
        </p>
        <p className="mt-2 text-body-sm text-text-secondary">
          <span className="pc-numeric">{captura.referencia}</span>
        </p>
      </div>

      {CARAS_DEL_CARNE.map((cara, i) => (
        <PasoDeCara
          key={cara}
          numero={i + 1}
          cara={cara}
          estado={caras[cara]}
          onFoto={(f) => void subir(cara, f)}
        />
      ))}

      <div ref={pasoDeFirma} className="scroll-mt-4">
        <PasoDeFirma
          numero={CARAS_DEL_CARNE.length + 1}
          frase={captura.frase}
          beneficiario={captura.beneficiario}
          disponible={fotosListas}
          estado={firma}
          onFirma={(d) => void firmar(d)}
          onRepetir={() => setFirma({ tipo: "pendiente" })}
        />
      </div>

      {listas ? (
        <Alert
          variant="success"
          title="Listo: las fotos y la firma ya están en la caja"
        >
          Vuelve a la caja para confirmar la entrega. Puedes cerrar esta página.
        </Alert>
      ) : (
        <p className="flex items-center gap-2 text-body-sm text-text-secondary">
          <Clock className="size-4 shrink-0" aria-hidden="true" />
          Este enlace vence a las {hora(captura.vigenteHasta)} si no se
          completan las fotos y la firma.
        </p>
      )}
    </>
  );
}

function PasoDeCara({
  numero,
  cara,
  estado,
  onFoto,
}: {
  numero: number;
  cara: CaraDelCarne;
  estado: EstadoDeCara;
  onFoto: (archivo: File) => void;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  /* Antes de hidratar, el botón no abriría la cámara: no se ofrece. */
  const hidratado = useHydrated();
  const hecha = estado.tipo === "hecha";
  const nombre = NOMBRE_DE_CARA[cara].toLowerCase();

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-5">
        <div className="flex items-start gap-3">
          <span
            className={
              hecha
                ? "grid size-8 shrink-0 place-items-center rounded-pill bg-success-subtle text-success"
                : "grid size-8 shrink-0 place-items-center rounded-pill bg-primary-subtle text-label font-semibold text-primary"
            }
          >
            {hecha ? (
              <CircleCheck className="size-5" aria-hidden="true" />
            ) : (
              numero
            )}
          </span>
          <div className="min-w-0">
            <h2 className="text-section-title text-text-primary">
              {NOMBRE_DE_CARA[cara]}
            </h2>
            <p className="text-body-sm text-text-secondary">
              {hecha ? "Foto recibida en la caja." : QUE_CARA[cara]}
            </p>
          </div>
        </div>

        {estado.tipo === "subiendo" ||
        (estado.tipo === "hecha" && estado.vista) ? (
          // eslint-disable-next-line @next/next/no-img-element -- una foto recién hecha, en memoria: no hay nada que optimizar.
          <img
            src={estado.vista ?? undefined}
            alt={`${NOMBRE_DE_CARA[cara]} del carné`}
            className="w-full rounded-control border border-border object-contain"
          />
        ) : null}

        {estado.tipo === "error" ? (
          <Alert variant="error" title={estado.mensaje} />
        ) : null}

        <input
          ref={input}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          data-cara={cara}
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            e.target.value = "";
            if (archivo) onFoto(archivo);
          }}
        />
        <Button
          size="lg"
          block
          variant={hecha ? "secondary" : "primary"}
          loading={estado.tipo === "subiendo"}
          disabled={!hidratado}
          onClick={() => input.current?.click()}
        >
          {estado.tipo === "subiendo" ? (
            "Enviando…"
          ) : hecha ? (
            <>
              <RotateCcw aria-hidden="true" />
              Repetir foto del {nombre}
            </>
          ) : (
            <>
              <Camera aria-hidden="true" />
              Hacer foto del {nombre}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function PasoDeFirma({
  numero,
  frase,
  beneficiario,
  disponible,
  estado,
  onFirma,
  onRepetir,
}: {
  numero: number;
  frase: string;
  beneficiario: string;
  disponible: boolean;
  estado: EstadoDeFirma;
  onFirma: (dataUrl: string) => void;
  onRepetir: () => void;
}) {
  const hecha = estado.tipo === "hecha";
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-5">
        <div className="flex items-start gap-3">
          <span
            className={
              hecha
                ? "grid size-8 shrink-0 place-items-center rounded-pill bg-success-subtle text-success"
                : "grid size-8 shrink-0 place-items-center rounded-pill bg-primary-subtle text-label font-semibold text-primary"
            }
          >
            {hecha ? (
              <CircleCheck className="size-5" aria-hidden="true" />
            ) : (
              numero
            )}
          </span>
          <div className="min-w-0">
            <h2 className="text-section-title text-text-primary">
              Firma de {beneficiario}
            </h2>
            <p className="text-body-sm text-text-secondary">
              {hecha
                ? "Firma recibida en la caja."
                : disponible
                  ? "Pásale el móvil para que firme con el dedo."
                  : "Primero, las dos fotos del carné."}
            </p>
          </div>
        </div>

        {disponible ? (
          <>
            <p
              className="rounded-control bg-surface-subtle px-4 py-3 text-body font-medium text-text-primary"
              data-frase-de-firma
            >
              {frase}
            </p>
            {hecha ? (
              <>
                {estado.vista ? (
                  // eslint-disable-next-line @next/next/no-img-element -- la firma recién hecha, en memoria.
                  <img
                    src={estado.vista}
                    alt={`Firma de ${beneficiario}`}
                    className="w-full rounded-control border border-border bg-white"
                  />
                ) : null}
                <Button size="lg" block variant="secondary" onClick={onRepetir}>
                  <RotateCcw aria-hidden="true" />
                  Repetir la firma
                </Button>
              </>
            ) : (
              <>
                <PanelDeFirma
                  etiqueta={`Panel para que firme ${beneficiario}`}
                  enviando={estado.tipo === "enviando"}
                  onFirma={onFirma}
                />
                {estado.tipo === "error" ? (
                  <div className="flex flex-col gap-3">
                    <Alert variant="error" title={estado.mensaje} />
                    {estado.recargar ? (
                      <Button
                        variant="secondary"
                        onClick={() => window.location.reload()}
                      >
                        <RefreshCw aria-hidden="true" />
                        Volver a cargar
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

const TITULO_INSERVIBLE: Readonly<Record<EnlaceInservible, string>> = {
  "no-existe": "Enlace no válido",
  vencido: "El enlace venció",
  usado: "Entrega ya confirmada",
};

export function EnlaceInservibleView({
  motivo,
}: {
  motivo: EnlaceInservible;
}): React.JSX.Element {
  const Icono = motivo === "usado" ? IdCard : XCircle;
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <span
          className={
            motivo === "usado"
              ? "grid size-12 place-items-center rounded-pill bg-primary-subtle text-primary"
              : "grid size-12 place-items-center rounded-pill bg-error-subtle text-error-foreground"
          }
        >
          <Icono className="size-6" aria-hidden="true" />
        </span>
        <h1 className="text-section-title text-text-primary">
          {TITULO_INSERVIBLE[motivo]}
        </h1>
        <p className="text-body text-text-secondary">
          {MENSAJE_DE_RECHAZO[motivo]}
        </p>
      </CardContent>
    </Card>
  );
}

function hora(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** La foto del móvil, girada como se ve y reducida a JPEG: unas decenas o cientos de KB en vez de varios MB. */
async function reducir(archivo: File): Promise<string> {
  const bitmap = await createImageBitmap(archivo, {
    imageOrientation: "from-image",
  });
  const escala = Math.min(
    1,
    LADO_MAXIMO / Math.max(bitmap.width, bitmap.height),
  );
  const w = Math.max(1, Math.round(bitmap.width * escala));
  const h = Math.max(1, Math.round(bitmap.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("sin-canvas");
  g.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}
