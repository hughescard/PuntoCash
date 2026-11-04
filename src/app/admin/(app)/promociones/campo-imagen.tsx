"use client";

import * as React from "react";
import { ImagePlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui";

/**
 * La imagen opcional de una promoción — **FR-AD-PROM-12**. La usan las dos
 * consolas, la del mercante y la de PuntoCash, porque lo que se sube y cómo se
 * guarda es lo mismo.
 *
 * Lleva su propio estado y viaja con el formulario como campos ocultos: la
 * imagen nueva ya reducida (`imagen`) o la orden de quitar la que había
 * (`quitar-imagen`). Sin tocar nada, no viaja nada y la acción conserva la que
 * tenga. Quien lo usa solo necesita la `vista`, para su vista previa.
 */
export function CampoImagen({
  inicialUrl,
  maxBytes,
  deshabilitado,
  error,
  onVista,
}: {
  /** La dirección de la imagen actual, si la promoción ya tiene. */
  inicialUrl: string | null;
  maxBytes: number;
  deshabilitado: boolean;
  /** El rechazo del servidor, si lo hubo. */
  error?: string | undefined;
  onVista: (vista: string | null) => void;
}): React.JSX.Element {
  const [vista, setVista] = React.useState<string | null>(inicialUrl);
  const [nueva, setNueva] = React.useState<string | null>(null);
  const [quitada, setQuitada] = React.useState(false);
  const [errorLocal, setErrorLocal] = React.useState<string | null>(null);
  const [procesando, setProcesando] = React.useState(false);
  const archivoRef = React.useRef<HTMLInputElement>(null);

  function cambiar(v: string | null) {
    setVista(v);
    onVista(v);
  }

  async function elegir(archivo: File | undefined) {
    setErrorLocal(null);
    if (!archivo) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
      setErrorLocal("La imagen tiene que ser JPG, PNG o WebP.");
      return;
    }
    setProcesando(true);
    try {
      const reducida = await reducirImagen(archivo);
      if (reducida.length > maxBytes * 1.37) {
        setErrorLocal("La imagen pesa demasiado. Prueba con una más pequeña.");
        return;
      }
      cambiar(reducida);
      setNueva(reducida);
      setQuitada(false);
    } catch {
      setErrorLocal("No se pudo leer la imagen. Prueba con otra.");
    } finally {
      setProcesando(false);
      if (archivoRef.current) archivoRef.current.value = "";
    }
  }

  function quitar() {
    cambiar(null);
    setNueva(null);
    setQuitada(Boolean(inicialUrl));
    setErrorLocal(null);
  }

  const mensaje = errorLocal ?? error;

  return (
    <div>
      <p className="text-label font-medium text-text-primary">Imagen (opcional)</p>
      <p id="promo-imagen-ayuda" className="mt-1 text-body-sm text-text-secondary">
        JPG, PNG o WebP. Se muestra entera, junto al título y el texto.
      </p>
      {nueva ? <input type="hidden" name="imagen" value={nueva} /> : null}
      {quitada ? <input type="hidden" name="quitar-imagen" value="1" /> : null}
      <input
        ref={archivoRef}
        id="promo-imagen"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-describedby="promo-imagen-ayuda"
        disabled={deshabilitado || procesando}
        onChange={(e) => void elegir(e.target.files?.[0])}
      />
      {vista ? (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- vista previa de la imagen elegida */}
          <img src={vista} alt="Imagen de la promoción" className="h-32 w-auto max-w-full rounded-control border border-border object-contain" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" size="sm" disabled={deshabilitado || procesando} onClick={() => archivoRef.current?.click()}>
              <ImagePlus aria-hidden="true" />
              Cambiar imagen
            </Button>
            <Button type="button" variant="tertiary" size="sm" disabled={deshabilitado || procesando} onClick={quitar}>
              <Trash2 aria-hidden="true" />
              Quitar imagen
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          loading={procesando}
          disabled={deshabilitado}
          onClick={() => archivoRef.current?.click()}
        >
          <ImagePlus aria-hidden="true" />
          Añadir imagen
        </Button>
      )}
      {mensaje ? (
        <p role="alert" className="mt-2 text-body-sm font-semibold text-error">
          {mensaje}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Reduce la imagen en el navegador antes de enviarla: como mucho 1920 px por
 * su lado mayor, que es una pantalla Full HD entera, y en WebP, que conserva la
 * transparencia de un PNG. Una foto de móvil de 6 MB queda en unos cientos de KB.
 */
async function reducirImagen(archivo: File): Promise<string> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const escala = Math.min(1, 1920 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const webp = canvas.toDataURL("image/webp", 0.85);
    return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
