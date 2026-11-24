"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";

import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { BilletesDelMovimiento } from "@/components/patterns/billetes-del-movimiento";
import { totalDe, type Billetes } from "@/features/caja/billetes";
import { useCaja } from "@/features/caja/use-caja";
import { useVistaDeCaja } from "@/features/worker/caja-context";
import { useHydrated } from "@/lib/use-hydrated";
import { formatMoney } from "@/lib/format";
import { registrarFondosAction, type MovimientoRegistrado } from "../../../_actions";
import { aBilletes, ConteoPorBilletes, type Unidades } from "../conteo-por-billetes";
import { RecuentoDeMoneda } from "../recuento-de-moneda";
import { CAJA_ROUTE, ElegirMoneda, ElegirSupervisor, ElegirUno, errorDe, Linea, Observaciones, Registrado } from "./partes";
import { enfocarPrimerError, useIrArribaAlCambiarDePaso } from "@/lib/foco";

type Tipo = "reposicion" | "retiro";

const TIPOS = [
  { valor: "reposicion", titulo: "Reposición", detalle: "El supervisor trae efectivo a la caja." },
  { valor: "retiro", titulo: "Retiro", detalle: "El supervisor se lleva efectivo de la caja." },
] as const;

/**
 * **Reposición o retiro** (bloque 3, decisiones del 9 y el 10/11/2026). El
 * supervisor trae o se lleva billetes; el trabajador los registra, contados
 * con él, y elige quién es. Entra en los libros al confirmar —el dinero ya se
 * movió— y queda pendiente de que **ese supervisor** lo confirme.
 *
 * A ciegas: no se ve el saldo. Si salieran billetes que los libros no tienen,
 * antes de registrar nada se recuenta esa moneda (`RecuentoDeMoneda`) y
 * después se vuelve a intentar.
 */
export function FondosFlow(): React.JSX.Element {
  const router = useRouter();
  const caja = useCaja();
  const vista = useVistaDeCaja();
  const hydrated = useHydrated();

  const [tipo, setTipo] = React.useState<Tipo | null>(null);
  const [currency, setCurrency] = React.useState("");
  const [supervisorId, setSupervisorId] = React.useState("");
  const [unidades, setUnidades] = React.useState<Unidades>({});
  const [observaciones, setObservaciones] = React.useState("");
  const [enviado, setEnviado] = React.useState(false);
  const [revisar, setRevisar] = React.useState<Billetes | null>(null);
  const [recontando, setRecontando] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [registrado, setRegistrado] = React.useState<MovimientoRegistrado | null>(null);

  const { conteos, errores: erroresConteo } = aBilletes(currency ? [currency] : [], unidades);
  const billetes = conteos[0]?.billetes ?? {};
  const errores = {
    tipo: !tipo ? "Elige si es una reposición o un retiro." : undefined,
    currency: !currency ? "Elige la moneda." : undefined,
    supervisor: !supervisorId ? "Elige al supervisor." : undefined,
    billetes: currency && totalDe(billetes) === 0 && !erroresConteo[currency] ? "Escribe al menos un billete." : undefined,
  };
  const ver = (e: string | undefined) => (enviado ? e : undefined);
  const supervisor = vista.supervisores.find((s) => s.id === supervisorId)?.nombre ?? "";
  const retiro = tipo === "retiro";
  const bloqueada = (!caja.jornadaAbierta || vista.bloqueo !== null) && registrado === null;
  useIrArribaAlCambiarDePaso(registrado ? "hecho" : recontando ? "recuento" : revisar ? "revisar" : "datos");

  function continuar(event: React.FormEvent) {
    event.preventDefault();
    setEnviado(true);
    setError(undefined);
    if (Object.values(errores).some(Boolean) || Object.keys(erroresConteo).length > 0) return enfocarPrimerError(event.currentTarget as HTMLElement);
    setRevisar(billetes);
  }

  async function confirmar() {
    if (!tipo || !revisar || enviando) return;
    setEnviando(true);
    setError(undefined);
    const r = await registrarFondosAction({
      tipo,
      currency,
      billetes: revisar,
      supervisorId,
      ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
    });
    setEnviando(false);
    if (!r.ok) {
      if (r.reason === "recuento-necesario") {
        setRecontando(true);
        return;
      }
      setRecontando(false);
      setRevisar(null);
      setError(errorDe(r.reason));
      return;
    }
    setRecontando(false);
    setRegistrado(r.value);
    router.refresh();
  }

  if (registrado) {
    return (
      <Registrado
        titulo={retiro ? "Retiro registrado" : "Reposición registrada"}
        movimiento={registrado}
        tipos={vista.denominaciones[registrado.currency] ?? []}
        pendienteDe={registrado.supervisor ?? supervisor}
      />
    );
  }
  if (bloqueada) return <Bloqueada sinJornada={!caja.jornadaAbierta} />;

  return (
    <div className="flex flex-col gap-6">
      <Link href={CAJA_ROUTE} className="inline-flex w-fit items-center gap-1.5 text-body-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a Caja
      </Link>
      <div>
        <h1 className="text-screen-title text-text-primary">Reposición o retiro</h1>
        <p className="mt-2 max-w-2xl text-body text-text-secondary">
          Registra el efectivo que trae o se lleva el supervisor. Contadlo juntos, billete a billete.
        </p>
      </div>

      {recontando ? (
        <RecuentoDeMoneda
          currency={currency}
          denominaciones={vista.denominaciones}
          supervisores={vista.supervisores}
          onCancelar={() => setRecontando(false)}
          onListo={() => void confirmar()}
        />
      ) : revisar ? (
        <Card>
          <CardHeader>
            <CardTitle>Revisa antes de confirmar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-0">
            {error ? <Alert variant="error" title={error} /> : null}
            <dl className="flex flex-col">
              <Linea etiqueta="Movimiento" valor={retiro ? "Retiro de fondos" : "Reposición de fondos"} />
              <Linea etiqueta="Supervisor" valor={supervisor} />
              <Linea etiqueta={retiro ? "Se lleva" : "Trae"} valor={formatMoney({ amount: totalDe(revisar), currency })} />
              {observaciones.trim() ? <Linea etiqueta="Observaciones" valor={observaciones.trim()} /> : null}
            </dl>
            <BilletesDelMovimiento
              billetes={retiro ? Object.fromEntries(Object.entries(revisar).map(([k, n]) => [k, -n])) : revisar}
              currency={currency}
              tipos={vista.denominaciones[currency] ?? []}
            />
            <p className="text-body-sm text-text-secondary">
              Al confirmar entra en los libros de la caja. Después, {supervisor} tendrá que confirmarlo desde su consola.
            </p>
            <div className="pc-botonera sm:justify-end">
              <Button variant="secondary" onClick={() => setRevisar(null)} disabled={enviando}>
                Volver a editar
              </Button>
              <Button onClick={() => void confirmar()} disabled={enviando}>
                {enviando ? "Registrando…" : retiro ? "Confirmar el retiro" : "Confirmar la reposición"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={continuar} className="flex flex-col gap-6" noValidate>
          {error ? <Alert variant="error" title={error} /> : null}
          <Card>
            <CardContent className="flex flex-col gap-5 pt-6">
              <ElegirUno nombre="tipo-de-fondos" etiqueta="Qué hace el supervisor" opciones={TIPOS} valor={tipo} onChange={setTipo} error={ver(errores.tipo)} />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <ElegirMoneda id="fondos-moneda" monedas={caja.monedas} valor={currency} onChange={setCurrency} error={ver(errores.currency)} />
                <ElegirSupervisor
                  id="fondos-supervisor"
                  supervisores={vista.supervisores}
                  valor={supervisorId}
                  onChange={setSupervisorId}
                  error={ver(errores.supervisor)}
                />
              </div>
              <Observaciones id="fondos-observaciones" valor={observaciones} onChange={setObservaciones} />
            </CardContent>
          </Card>
          {currency ? (
            <Card>
              <CardHeader>
                <CardTitle>{retiro ? "Billetes que se lleva" : tipo === "reposicion" ? "Billetes que trae" : "Billetes"}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 pt-0">
                <ConteoPorBilletes
                  monedas={[currency]}
                  denominaciones={vista.denominaciones}
                  unidades={unidades}
                  errores={erroresConteo}
                  onChange={(c, k, v) => setUnidades((prev) => ({ ...prev, [c]: { ...prev[c], [k]: v } }))}
                  nombre="Billetes"
                />
                {ver(errores.billetes) ? <p className="text-caption text-error-foreground">{errores.billetes}</p> : null}
              </CardContent>
            </Card>
          ) : null}
          <div className="pc-botonera sm:justify-end">
            <Button variant="secondary" asChild>
              <Link href={CAJA_ROUTE}>Cancelar</Link>
            </Button>
            <Button type="submit" disabled={!hydrated}>
              Revisar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Bloqueada({ sinJornada }: { sinJornada: boolean }): React.JSX.Element {
  return (
    <Card className="mx-auto mt-10 w-full max-w-xl">
      <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
        <Lock className="size-8 text-text-secondary" aria-hidden="true" />
        <p className="text-body text-text-primary">{sinJornada ? "Hace falta una jornada abierta en esta caja." : "La sede no está operando ahora mismo."}</p>
        <Button asChild>
          <Link href={CAJA_ROUTE}>Ir a Caja</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
