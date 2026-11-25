"use client";

import * as React from "react";
import { Eraser, PenLine } from "lucide-react";

import { Button } from "@/components/ui";

/** Por debajo de este recorrido, el trazo no es una firma: un toque o un roce. */
const TRAZO_MINIMO_PX = 80;
/** Ancho de exportación: la firma se lee y la subida es corta. */
const ANCHO_EXPORTADO = 900;

/**
 * El panel en blanco donde firma el beneficiario con el dedo. Dibuja con
 * eventos de puntero (dedo, lápiz o ratón), no deja que el gesto desplace la
 * página, y entrega la firma como PNG sobre fondo blanco.
 */
export function PanelDeFirma({
  etiqueta,
  enviando,
  onFirma,
}: {
  etiqueta: string;
  enviando: boolean;
  onFirma: (dataUrl: string) => void;
}): React.JSX.Element {
  const lienzo = React.useRef<HTMLCanvasElement>(null);
  const ultimo = React.useRef<{ x: number; y: number } | null>(null);
  const [recorrido, setRecorrido] = React.useState(0);

  /* El lienzo se dimensiona a su tamaño en pantalla y a la densidad del móvil, para que el trazo no salga borroso. */
  const preparar = React.useCallback(() => {
    const c = lienzo.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    const g = c.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#FFFFFF";
    g.fillRect(0, 0, r.width, r.height);
    g.lineWidth = 2.5;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = "#0B132B";
    setRecorrido(0);
  }, []);

  React.useEffect(() => {
    preparar();
  }, [preparar]);

  function punto(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function empezar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (enviando) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = punto(e);
    ultimo.current = p;
    const g = e.currentTarget.getContext("2d");
    g?.beginPath();
    g?.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
    g?.fill();
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    const desde = ultimo.current;
    if (!desde) return;
    const p = punto(e);
    const g = e.currentTarget.getContext("2d");
    if (!g) return;
    g.beginPath();
    g.moveTo(desde.x, desde.y);
    g.lineTo(p.x, p.y);
    g.stroke();
    setRecorrido((n) => n + Math.hypot(p.x - desde.x, p.y - desde.y));
    ultimo.current = p;
  }

  function terminar() {
    ultimo.current = null;
  }

  function guardar() {
    const c = lienzo.current;
    if (!c) return;
    const escala = Math.min(1, ANCHO_EXPORTADO / c.width);
    const salida = document.createElement("canvas");
    salida.width = Math.round(c.width * escala);
    salida.height = Math.round(c.height * escala);
    const g = salida.getContext("2d");
    if (!g) return;
    g.fillStyle = "#FFFFFF";
    g.fillRect(0, 0, salida.width, salida.height);
    g.drawImage(c, 0, 0, salida.width, salida.height);
    onFirma(salida.toDataURL("image/png"));
  }

  const suficiente = recorrido >= TRAZO_MINIMO_PX;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <canvas
          ref={lienzo}
          role="img"
          aria-label={etiqueta}
          data-panel-de-firma
          className="block h-48 w-full touch-none rounded-control border-2 border-dashed border-border-strong bg-white"
          onPointerDown={empezar}
          onPointerMove={mover}
          onPointerUp={terminar}
          onPointerCancel={terminar}
          onPointerLeave={terminar}
        />
        {recorrido === 0 ? (
          <span className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-body-sm text-text-secondary">
            Firme aquí
          </span>
        ) : null}
      </div>
      <div className="pc-botonera">
        <Button variant="secondary" disabled={recorrido === 0 || enviando} onClick={preparar}>
          <Eraser aria-hidden="true" />
          Borrar
        </Button>
        <Button disabled={!suficiente} loading={enviando} onClick={guardar}>
          <PenLine aria-hidden="true" />
          {enviando ? "Enviando…" : "Guardar firma"}
        </Button>
      </div>
    </div>
  );
}
