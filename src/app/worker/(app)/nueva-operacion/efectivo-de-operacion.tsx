"use client";

import * as React from "react";
import { Banknote, CircleCheck, TriangleAlert } from "lucide-react";

import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { totalDe, type Billetes } from "@/features/caja/billetes";
import { useVistaDeCaja } from "@/features/worker/caja-context";
import { formatMoney } from "@/lib/format";
import {
  proponerCambioAction,
  proponerCobroAction,
  proponerPagoAction,
  type AccionDeCaja,
} from "../../_actions";
import type { EfectivoRegistrado, PropuestaDeCambio, PropuestaDePago } from "@/features/network/caja-operativa";
import { aBilletes, aUnidades, ConteoPorBilletes, type Unidades } from "../caja/conteo-por-billetes";

/**
 * **El efectivo de una operación, billete a billete** (bloque 4, decisión del
 * 9/11/2026). El trabajador marca con qué billetes paga el cliente; el sistema
 * propone el vuelto y en qué billetes entregar; el trabajador puede cambiar la
 * propuesta mientras el total cuadre, y queda registrado lo que entregó de
 * verdad.
 *
 * Si la caja no tiene billetes para pagar entero lo que toca, el orden es:
 * lo máximo posible en la moneda y el resto en CUP; si tampoco, el cliente
 * elige (a) otro importe que sí se paga entero —solo en un cambio de
 * moneda— o (b) cobrar lo que se pueda con el resto a favor de la casa. Si no
 * acepta ninguna, la operación no se registra: queda pendiente.
 *
 * Nada de lo que muestra es un saldo: la propuesta revela que esos billetes
 * existen, no cuántos hay.
 */

export interface EstadoDeEfectivo {
  /** Todo cuadra y se puede confirmar. */
  listo: boolean;
  efectivo: EfectivoRegistrado | null;
}

type Entrada =
  | { modo: "cambio"; sourceCurrency: string; destinationCurrency: string; sourceAmount: number }
  | { modo: "cobro"; currency: string; importe: number }
  | { modo: "pago"; currency: string; importe: number };

const REDONDEO = 0.005;
const cuadra = (a: number, b: number) => Math.abs(a - b) < REDONDEO;

/** Por qué no hay propuesta, en palabras del trabajador. */
const MENSAJES: Readonly<Record<string, string>> = {
  "sin-vuelto": "La caja no tiene billetes para darle ese vuelto. Pídele al cliente que pague con otros billetes o con el importe justo.",
  "importe-no-pagable": "Ese importe tiene fracciones menores que el billete más pequeño: no se puede cobrar en billetes. Cámbialo.",
  "sin-denominaciones": "Esta moneda no tiene billetes en el catálogo. Avisa al supervisor.",
  "moneda-no-habilitada": "Esa moneda no está habilitada en esta caja.",
  bloqueada: "La sede no está operando: no se puede registrar.",
  "cierre-forzado": "El administrador cerró tu jornada. Esto no se registró.",
  "jornada-no-abierta": "La jornada ya no está abierta: quizá la administración forzó su cierre.",
  "sin-tasa": "La tasa cambió: vuelve al primer paso para cotizar de nuevo.",
};

function DecidirSinSalida({
  pago,
  otroImporte,
  moneda,
  onOtroImporte,
}: {
  pago: Extract<PropuestaDePago, { tipo: "sin-salida" }>;
  otroImporte?: PropuestaDeCambio["otroImporte"];
  moneda: string;
  onOtroImporte?: (sourceAmount: number) => void;
}) {
  const total = formatMoney({ amount: pago.importe + pago.sinPagar, currency: moneda });
  return (
    <Alert variant="warning" title="La caja no puede pagar eso entero">
      <div className="flex flex-col gap-3">
        <p className="text-body-sm">
          La caja no tiene billetes para pagar {total}
          {pago.intentoEnCup ? ", ni siquiera completando con CUP" : ""}.{" "}
          {otroImporte && onOtroImporte
            ? "Propónle al cliente cambiar un importe que la caja sí pueda pagar entero."
            : onOtroImporte
              ? "Ahora mismo no hay un importe menor que la caja pueda pagar entero. No se registra nada: el cliente puede volver en otro momento o ir a otra sede."
              : "No se registra nada y la operación queda pendiente: el cliente puede volver en otro momento o ir a otra sede."}
        </p>
        {otroImporte && onOtroImporte ? (
          <div className="pc-botonera">
            <Button variant="secondary" onClick={() => onOtroImporte(otroImporte.cotizacion.sourceAmount)}>
              Cambiar {formatMoney({ amount: otroImporte.cotizacion.sourceAmount, currency: otroImporte.cotizacion.sourceCurrency })} y entregar{" "}
              {formatMoney({ amount: otroImporte.pago.importe, currency: otroImporte.cotizacion.destinationCurrency })}
            </Button>
          </div>
        ) : null}
      </div>
    </Alert>
  );
}

export function EfectivoDeOperacion({
  entrada,
  onChange,
  onOtroImporte,
  recargar = 0,
  inicial,
}: {
  entrada: Entrada;
  onChange: (e: EstadoDeEfectivo) => void;
  /** Salida (a): cambiar otro importe. Solo en un cambio de moneda. */
  onOtroImporte?: (sourceAmount: number) => void;
  /** Cambia cuando hay que pedir la propuesta otra vez, por ejemplo tras un recuento. */
  recargar?: number;
  /** Los billetes que el cliente ya había marcado, si se vuelve a este paso desde otro. */
  inicial?: Billetes;
}): React.JSX.Element {
  const vista = useVistaDeCaja();
  const dens = vista.denominaciones;

  const cobro = entrada.modo === "cambio" ? { currency: entrada.sourceCurrency, importe: entrada.sourceAmount } : entrada.modo === "cobro" ? entrada : null;
  const destino = entrada.modo === "cambio" ? entrada.destinationCurrency : entrada.modo === "pago" ? entrada.currency : null;

  const [paga, setPaga] = React.useState<Unidades>(() =>
    cobro && inicial && Object.keys(inicial).length > 0 ? aUnidades({ [cobro.currency]: inicial }) : {},
  );
  const [vueltoU, setVueltoU] = React.useState<Unidades>({});
  const [entregaU, setEntregaU] = React.useState<Unidades>({});
  const [cupU, setCupU] = React.useState<Unidades>({});
  const [vuelto, setVuelto] = React.useState<Billetes | null>(null);
  const [pago, setPago] = React.useState<PropuestaDePago | null>(null);
  const [otro, setOtro] = React.useState<PropuestaDeCambio["otroImporte"] | undefined>();
  const [error, setError] = React.useState<string | null>(null);
  const [pensando, setPensando] = React.useState(false);

  const pagaCur = cobro?.currency ?? "";
  const { conteos: cp, errores: errPaga } = aBilletes(pagaCur ? [pagaCur] : [], paga);
  const pagaBilletes: Billetes = cp[0]?.billetes ?? {};
  const pagaTotal = totalDe(pagaBilletes);
  const pagaKey = JSON.stringify(pagaBilletes);
  const alcanza = !cobro || (!errPaga[pagaCur] && pagaTotal + REDONDEO >= cobro.importe && pagaTotal > 0);
  const clavePropuesta = `${pagaKey}|${JSON.stringify(entrada)}|${recargar}`;

  /* Pide la propuesta cuando el cliente ya paga lo suficiente (o enseguida, si solo se le paga). */
  React.useEffect(() => {
    let viva = true;
    setError(null);
    if (!alcanza) {
      setVuelto(null);
      setPago(null);
      setOtro(undefined);
      return;
    }
    setPensando(true);
    const t = setTimeout(async () => {
      let r: AccionDeCaja<unknown>;
      if (entrada.modo === "cambio") {
        r = await proponerCambioAction({
          sourceCurrency: entrada.sourceCurrency,
          destinationCurrency: entrada.destinationCurrency,
          sourceAmount: entrada.sourceAmount,
          paga: pagaBilletes,
        });
      } else if (entrada.modo === "cobro") {
        r = await proponerCobroAction({ currency: entrada.currency, importe: entrada.importe, paga: pagaBilletes });
      } else {
        r = await proponerPagoAction({ currency: entrada.currency, importe: entrada.importe });
      }
      if (!viva) return;
      setPensando(false);
      if (!r.ok) {
        setVuelto(null);
        setPago(null);
        setOtro(undefined);
        setError(MENSAJES[r.reason] ?? "No se pudo proponer. Vuelve a Caja y comprueba su estado.");
        return;
      }
      if (entrada.modo === "cambio") {
        const v = r.value as PropuestaDeCambio;
        setVuelto(v.vuelto);
        setPago(v.pago);
        setOtro(v.otroImporte);
        setVueltoU(aUnidades({ [entrada.sourceCurrency]: v.vuelto }));
        setEntregaU(aUnidades({ [entrada.destinationCurrency]: v.pago.billetes }));
        setCupU(v.pago.tipo === "con-cup" ? aUnidades({ CUP: v.pago.cup.billetes }) : {});
      } else if (entrada.modo === "cobro") {
        const v = r.value as { vuelto: Billetes };
        setVuelto(v.vuelto);
        setPago(null);
        setVueltoU(aUnidades({ [entrada.currency]: v.vuelto }));
      } else {
        const v = r.value as PropuestaDePago;
        setVuelto(null);
        setPago(v);
        setEntregaU(aUnidades({ [entrada.currency]: v.billetes }));
        setCupU(v.tipo === "con-cup" ? aUnidades({ CUP: v.cup.billetes }) : {});
      }
    }, 250);
    return () => {
      viva = false;
      clearTimeout(t);
    };
    // La propuesta se vuelve a pedir cuando cambian los billetes del cliente, la entrada o tras un recuento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavePropuesta, alcanza]);

  /* Lo que hay escrito en las tablas editables, y si cuadra. */
  const vueltoEsperado = cobro ? Math.round((pagaTotal - cobro.importe) * 100) / 100 : 0;
  const { conteos: cv, errores: errVuelto } = aBilletes(pagaCur ? [pagaCur] : [], vueltoU);
  const vueltoBilletes: Billetes = vuelto && vueltoEsperado > 0 ? (cv[0]?.billetes ?? {}) : {};
  const { conteos: ce, errores: errEntrega } = aBilletes(destino ? [destino] : [], entregaU);
  const entregaBilletes: Billetes = ce[0]?.billetes ?? {};
  const { conteos: cc, errores: errCup } = aBilletes(pago?.tipo === "con-cup" ? ["CUP"] : [], cupU);
  const cupBilletes: Billetes = cc[0]?.billetes ?? {};

  const vueltoOk = !cobro || (vuelto !== null && (vueltoEsperado <= REDONDEO || (!errVuelto[pagaCur] && cuadra(totalDe(vueltoBilletes), vueltoEsperado))));
  const entregaImporte = pago ? pago.importe : 0;
  const entregaOk =
    !destino ||
    (pago !== null &&
      pago.tipo !== "sin-salida" &&
      !errEntrega[destino ?? ""] &&
      cuadra(totalDe(entregaBilletes), entregaImporte) &&
      (pago.tipo !== "con-cup" || (!errCup["CUP"] && cuadra(totalDe(cupBilletes), pago.cup.importe))));
  const listo = !error && !pensando && alcanza && vueltoOk && entregaOk;

  const estado = React.useMemo<EstadoDeEfectivo>(() => {
    if (!listo) return { listo: false, efectivo: null };
    return {
      listo: true,
      efectivo: {
        ...(cobro ? { paga: pagaBilletes } : {}),
        ...(cobro && vueltoEsperado > REDONDEO ? { vuelto: vueltoBilletes } : {}),
        ...(destino ? { entrega: entregaBilletes } : {}),
        ...(pago?.tipo === "con-cup" ? { entregaCup: cupBilletes } : {}),
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, JSON.stringify(pagaBilletes), JSON.stringify(vueltoBilletes), JSON.stringify(entregaBilletes), JSON.stringify(cupBilletes), vueltoEsperado]);

  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  React.useEffect(() => {
    onChangeRef.current(estado);
  }, [estado]);

  const editar = (set: React.Dispatch<React.SetStateAction<Unidades>>) => (c: string, k: string, v: string) =>
    set((prev) => ({ ...prev, [c]: { ...prev[c], [k]: v } }));

  return (
    <div className="flex flex-col gap-6">
      {cobro ? (
        <Card>
          <CardHeader>
            <CardTitle>Billetes con los que paga el cliente</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            <p className="text-body-sm text-text-secondary">
              Marca los billetes que te da. Se le cobran {formatMoney({ amount: cobro.importe, currency: cobro.currency })}; si te da más, la caja propone el vuelto.
            </p>
            <ConteoPorBilletes
              monedas={[cobro.currency]}
              denominaciones={dens}
              unidades={paga}
              errores={errPaga}
              onChange={editar(setPaga)}
              nombre="Billetes del cliente"
            />
            {pagaTotal > 0 && pagaTotal + REDONDEO < cobro.importe ? (
              <p className="text-caption text-error-foreground">
                Faltan {formatMoney({ amount: Math.round((cobro.importe - pagaTotal) * 100) / 100, currency: cobro.currency })} para cubrir el cobro.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Alert variant="error" title={error}>
          {error === MENSAJES["sin-vuelto"] ? (
            <p className="text-body-sm">No se registra nada hasta que cuadre.</p>
          ) : null}
        </Alert>
      ) : null}

      {cobro && vuelto && vueltoEsperado > REDONDEO ? (
        <Card>
          <CardHeader>
            <CardTitle>Vuelto para el cliente</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            <p className="text-body-sm text-text-secondary">
              Vuelto: {formatMoney({ amount: vueltoEsperado, currency: cobro.currency })}. Es la propuesta de la caja; puedes cambiar los billetes mientras sumen
              lo mismo.
            </p>
            <ConteoPorBilletes
              monedas={[cobro.currency]}
              denominaciones={dens}
              unidades={vueltoU}
              errores={errVuelto}
              onChange={editar(setVueltoU)}
              nombre="Vuelto"
            />
            {!cuadra(totalDe(vueltoBilletes), vueltoEsperado) ? (
              <p className="text-caption text-error-foreground">
                Tiene que sumar {formatMoney({ amount: vueltoEsperado, currency: cobro.currency })}.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {pago && destino ? (
        <>
          {pago.tipo === "sin-salida" ? (
            <DecidirSinSalida
              pago={pago}
              moneda={destino}
              {...(otro ? { otroImporte: otro } : {})}
              {...(onOtroImporte ? { onOtroImporte } : {})}
            />
          ) : null}
          {pago.tipo === "con-cup" ? (
            <Alert variant="info" title={`Parte se paga en CUP`}>
              <p className="text-body-sm">
                La caja no tiene billetes de {destino} para el resto: {formatMoney({ amount: pago.cup.equivale, currency: destino })} se pagan con{" "}
                {formatMoney({ amount: pago.cup.importe, currency: "CUP" })}. Dile al cliente cómo va a recibirlo.
              </p>
            </Alert>
          ) : null}
          {pago.redondeo > 0.004 ? (
            <p className="flex items-start gap-2 text-body-sm text-text-secondary">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              No hay billetes ni monedas menores: {formatMoney({ amount: pago.redondeo, currency: destino })} quedan a favor de la casa.
            </p>
          ) : null}
          {pago.tipo !== "sin-salida" ? (
            <Card>
              <CardHeader>
                <CardTitle>Entrega al cliente</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 pt-0">
                <p className="text-body-sm text-text-secondary">
                  Entrega {formatMoney({ amount: pago.importe, currency: destino })}. Es la propuesta de la caja; puedes cambiar los billetes mientras sumen lo
                  mismo.
                </p>
                {pago.importe > 0 ? (
                  <ConteoPorBilletes
                    monedas={[destino]}
                    denominaciones={dens}
                    unidades={entregaU}
                    errores={errEntrega}
                    onChange={editar(setEntregaU)}
                    nombre="Entrega"
                  />
                ) : null}
                {pago.importe > 0 && !cuadra(totalDe(entregaBilletes), pago.importe) ? (
                  <p className="text-caption text-error-foreground">Tiene que sumar {formatMoney({ amount: pago.importe, currency: destino })}.</p>
                ) : null}
                {pago.tipo === "con-cup" ? (
                  <>
                    <ConteoPorBilletes
                      monedas={["CUP"]}
                      denominaciones={dens}
                      unidades={cupU}
                      errores={errCup}
                      onChange={editar(setCupU)}
                      nombre="Entrega en CUP"
                    />
                    {!cuadra(totalDe(cupBilletes), pago.cup.importe) ? (
                      <p className="text-caption text-error-foreground">Tiene que sumar {formatMoney({ amount: pago.cup.importe, currency: "CUP" })}.</p>
                    ) : null}
                  </>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      {pensando ? <p className="text-body-sm text-text-secondary">Calculando los billetes…</p> : null}
      {listo ? (
        <p className="flex items-center gap-2 text-body-sm text-success-foreground">
          <CircleCheck className="size-4" aria-hidden="true" />
          Los billetes cuadran.
        </p>
      ) : (
        <p className="flex items-center gap-2 text-caption text-text-secondary">
          <Banknote className="size-4" aria-hidden="true" />
          Hasta que los billetes cuadren no se puede continuar.
        </p>
      )}
    </div>
  );
}
