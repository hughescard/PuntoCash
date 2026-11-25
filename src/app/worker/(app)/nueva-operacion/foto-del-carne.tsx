"use client";

import * as React from "react";
import { CircleCheck, ExternalLink, IdCard, PenLine, RefreshCw, Smartphone } from "lucide-react";

import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { CARAS_DEL_CARNE, NOMBRE_DE_CARA, type EstadoDeCaptura, type MotivoDeCaptura } from "@/features/network/fotos-del-carne";
import { abrirFotoDelCarneAction, actualizarLoQueRecibeAction, estadoFotoDelCarneAction, type CapturaAbierta } from "../../_foto-del-carne-actions";

/** Cada cuánto pregunta la caja si llegaron las fotos. */
const SONDEO_MS = 2000;

/**
 * La foto del carné de quien cobra, en la confirmación de una remesa o de un
 * giro cobrado (`features/network/fotos-del-carne.ts`).
 *
 * La caja no tiene cámara: enseña un QR que el trabajador escanea con su
 * móvil, y allí hace las dos fotos y le pasa el móvil al beneficiario para que
 * firme la frase con lo que recibe. Esta tarjeta pregunta cada dos segundos
 * hasta que llegan y las enseña, para que el trabajador compruebe que se leen
 * antes de confirmar. Sin las dos fotos y la firma, la entrega no se confirma.
 *
 * Si cambia lo que se entrega (`motivo.recibe`) con el código ya abierto, la
 * frase cambia y la firma anterior deja de valer: hay que volver a firmar.
 *
 * La captura la guarda quien usa la tarjeta (`captura`, `onCaptura`): volver a
 * los billetes y regresar no obliga a repetir las fotos.
 */
export function FotoDelCarne({
  motivo,
  captura,
  onCaptura,
  onLista,
}: {
  motivo: MotivoDeCaptura;
  captura: CapturaAbierta | null;
  onCaptura: (c: CapturaAbierta | null) => void;
  /** El identificador de la captura cuando tiene las dos fotos; `null` mientras no. */
  onLista: (id: string | null) => void;
}): React.JSX.Element {
  /* El estado leído lleva el código al que pertenece: el de un código anterior no vale para el nuevo. */
  const [leido, setLeido] = React.useState<(EstadoDeCaptura & { id: string }) | null>(null);
  const estado = captura && leido?.id === captura.id ? leido : null;
  const [error, setError] = React.useState<string | null>(null);
  /*
   * Lo que se entrega cambió con el código abierto (otros billetes al volver
   * atrás): la captura toma la frase nueva y la firma anterior deja de valer.
   * Al cambiar la captura, se vuelve a preguntar.
   */
  React.useEffect(() => {
    if (!captura || captura.recibe === motivo.recibe) return;
    let activo = true;
    onLista(null);
    void actualizarLoQueRecibeAction(captura.id, motivo.recibe).then(() => {
      if (activo) onCaptura({ ...captura, recibe: motivo.recibe });
    });
    return () => {
      activo = false;
    };
  }, [captura, motivo.recibe, onCaptura, onLista]);
  /* Sin captura, se abre una al llegar. Tras un fallo, se espera a que el trabajador lo reintente. */
  React.useEffect(() => {
    if (captura || error) return;
    let activo = true;
    abrirFotoDelCarneAction(motivo).then(
      (r) => {
        if (!activo) return;
        if (r.ok) onCaptura(r.value);
        else setError("Tu sesión terminó. Vuelve a entrar para continuar.");
      },
      () => {
        if (activo) setError("No se pudo preparar el código. Comprueba la conexión y vuelve a intentarlo.");
      },
    );
    return () => {
      activo = false;
    };
  }, [captura, error, motivo, onCaptura]);

  /** Otro código: lo anterior deja de contar para confirmar. */
  function otroCodigo() {
    onLista(null);
    onCaptura(null);
  }

  /* Se pregunta hasta que estén las dos fotos o venza el código. */
  React.useEffect(() => {
    if (!captura) return;
    let activo = true;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    async function preguntar() {
      if (!captura || captura.recibe !== motivo.recibe) return;
      let e: EstadoDeCaptura | null = null;
      try {
        e = await estadoFotoDelCarneAction(captura.id);
      } catch {
        /* Un fallo de red puntual: se vuelve a preguntar. */
      }
      if (!activo) return;
      if (e) {
        setLeido({ ...e, id: captura.id });
        onLista(e.completa ? captura.id : null);
        if (e.completa || e.vencida) return;
      }
      temporizador = setTimeout(() => void preguntar(), SONDEO_MS);
    }
    void preguntar();
    return () => {
      activo = false;
      if (temporizador) clearTimeout(temporizador);
    };
  }, [captura, motivo.recibe, onLista]);

  const completa = estado?.completa ?? false;
  const vencida = estado?.vencida ?? false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            className={
              completa
                ? "grid size-9 place-items-center rounded-control bg-success-subtle text-success"
                : "grid size-9 place-items-center rounded-control bg-primary-subtle text-primary"
            }
          >
            {completa ? <CircleCheck className="size-[18px]" aria-hidden="true" /> : <IdCard className="size-[18px]" aria-hidden="true" />}
          </span>
          <div>
            <CardTitle>Carné y firma del beneficiario</CardTitle>
            <p className="mt-1 text-body-sm text-text-secondary">
              {completa
                ? "Comprueba que las dos fotos se leen y son del carné que tienes delante, y que la firma está hecha."
                : "Sin las dos fotos del carné y la firma del beneficiario, no se puede confirmar la entrega."}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-0">
        {error ? (
          <div className="flex flex-col gap-3">
            <Alert variant="error" title={error} />
            <div>
              <Button variant="secondary" onClick={() => setError(null)}>
                <RefreshCw aria-hidden="true" />
                Volver a intentarlo
              </Button>
            </div>
          </div>
        ) : !captura ? (
          <p className="text-body-sm text-text-secondary" aria-live="polite">
            Preparando el código…
          </p>
        ) : vencida ? (
          <div className="flex flex-col gap-3">
            <Alert variant="warning" title="El código venció sin las fotos y la firma">
              Genera otro y vuelve a escanearlo con el móvil.
            </Alert>
            <div>
              <Button variant="secondary" onClick={otroCodigo}>
                <RefreshCw aria-hidden="true" />
                Generar otro código
              </Button>
            </div>
          </div>
        ) : completa ? null : (
          <div className="grid items-start gap-6 sm:grid-cols-[176px_minmax(0,1fr)]">
            <div
              className="size-44 rounded-control border border-border bg-white p-2 [&>svg]:size-full"
              role="img"
              aria-label="Código QR para hacer la foto del carné con el móvil"
              dangerouslySetInnerHTML={{ __html: captura.qr }}
            />
            <div className="flex flex-col gap-3">
              <ol className="flex flex-col gap-2 text-body text-text-primary">
                <li className="flex gap-2">
                  <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                  <span>Escanea el código con la cámara de tu móvil.</span>
                </li>
                <li className="pl-7">Haz la foto del anverso y la del reverso del carné.</li>
                <li className="pl-7">Pásale el móvil al beneficiario para que firme.</li>
                <li className="pl-7">Las fotos y la firma aparecerán aquí solas.</li>
              </ol>
              <p className="text-body-sm text-text-secondary">El código vence a las {hora(captura.vigenteHasta)}.</p>
              <a
                href={captura.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-1.5 text-body-sm font-medium text-primary underline underline-offset-4"
              >
                Abrir el enlace en este equipo (demostración)
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        )}

        {captura && !error && !vencida ? (
          <div className="grid gap-4 sm:grid-cols-2" aria-live="polite">
            {CARAS_DEL_CARNE.map((cara) => {
              const foto = estado?.fotos[cara];
              return (
                <figure key={cara} className="flex flex-col gap-2">
                  <figcaption className="flex items-center gap-2 text-label text-text-primary">
                    {foto ? <CircleCheck className="size-4 text-success" aria-hidden="true" /> : null}
                    {NOMBRE_DE_CARA[cara]}
                    {foto ? null : <span className="font-normal text-text-secondary">· esperando…</span>}
                  </figcaption>
                  {foto ? (
                    // eslint-disable-next-line @next/next/no-img-element -- foto en memoria del servidor de la demostración.
                    <img
                      src={foto.dataUrl}
                      alt={`${NOMBRE_DE_CARA[cara]} del carné del beneficiario`}
                      className="aspect-[3/2] w-full rounded-control border border-border bg-surface-subtle object-contain"
                    />
                  ) : (
                    <div className="grid h-24 w-full place-items-center rounded-control border border-dashed border-border bg-surface-subtle">
                      <IdCard className="size-7 text-text-secondary" aria-hidden="true" />
                    </div>
                  )}
                </figure>
              );
            })}
            <figure className="flex flex-col gap-2 sm:col-span-2">
              <figcaption className="flex items-center gap-2 text-label text-text-primary">
                {estado?.firma ? <CircleCheck className="size-4 text-success" aria-hidden="true" /> : null}
                Firma
                {estado?.firma ? null : <span className="font-normal text-text-secondary">· esperando…</span>}
              </figcaption>
              <p className="text-body-sm text-text-secondary" data-frase-en-caja>
                {estado?.frase ?? ""}
              </p>
              {estado?.firma ? (
                // eslint-disable-next-line @next/next/no-img-element -- firma en memoria del servidor de la demostración.
                <img
                  src={estado.firma.dataUrl}
                  alt="Firma del beneficiario"
                  className="h-28 w-full max-w-md rounded-control border border-border bg-white object-contain"
                />
              ) : (
                <div className="grid h-24 w-full max-w-md place-items-center rounded-control border border-dashed border-border bg-surface-subtle">
                  <PenLine className="size-7 text-text-secondary" aria-hidden="true" />
                </div>
              )}
            </figure>
          </div>
        ) : null}

        {completa ? (
          <div>
            <Button variant="secondary" onClick={otroCodigo}>
              <RefreshCw aria-hidden="true" />
              Repetir fotos y firma
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function hora(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
