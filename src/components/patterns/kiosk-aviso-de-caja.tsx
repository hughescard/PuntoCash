import * as React from "react";
import { Info } from "lucide-react";

/**
 * Lo que el kiosco no puede saber: qué billetes tiene la caja. Va en todo
 * servicio en que el cliente se lleva dinero (cambio, remesa, cobro de giro),
 * y se dice antes de generar el código, no después, para que nadie llegue al
 * mostrador esperando una cifra que la caja no puede pagar exacta.
 */
export function KioskAvisoDeCaja(): React.JSX.Element {
  return (
    <p className="flex items-start gap-3 rounded-control border border-border bg-surface px-5 py-4 text-body-sm text-text-secondary">
      <Info className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
      <span>
        La cifra que recibes la confirma la caja al entregarte el dinero. Si no tiene los billetes exactos, puede
        redondearla hacia abajo o pagarte una parte en pesos cubanos (CUP).
      </span>
    </p>
  );
}
