"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Sparkles } from "lucide-react";

import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { BilletesDelMovimiento } from "@/components/patterns/billetes-del-movimiento";
import { restar, totalDe, type Billetes } from "@/features/caja/billetes";
import { useCaja } from "@/features/caja/use-caja";
import { useVistaDeCaja } from "@/features/worker/caja-context";
import { useHydrated } from "@/lib/use-hydrated";
import { formatMoney } from "@/lib/format";
import { proponerCambioDeBilletesAction, registrarCambioDeBilletesAction, type MovimientoRegistrado } from "../../../_actions";
import { aBilletes, aUnidades, ConteoPorBilletes, type Unidades } from "../conteo-por-billetes";
import { RecuentoDeMoneda } from "../recuento-de-moneda";
import { CAJA_ROUTE, ElegirMoneda, ElegirSupervisor, ElegirUno, errorDe, Linea, Observaciones, Registrado } from "../fondos/partes";

type Con = "cliente" | "supervisor";

const CON = [
  { valor: "cliente", titulo: "Con un cliente", detalle: "Trae unos billetes y quiere otros. El sistema propone cuáles darle." },
  { valor: "supervisor", titulo: "Con el supervisor", detalle: "Cambia billetes de la caja. Él tendrá que confirmarlo." },
] as const;

/**
 * **Cambio de billetes** (bloque 3, decisiones del 9 y el 10/11/2026). Entran
 * unos billetes y salen otros, en la misma moneda y por el mismo total.
 *
 * - **Con un cliente:** el trabajador marca lo que trae y el sistema propone
 *   qué darle, sin repetir las denominaciones que trae. Se puede cambiar la
 *   propuesta mientras el total cuadre. No pasa por aprobación.
 * - **Con el supervisor:** se marca lo que entra y lo que sale, y queda
 *   pendiente de que él lo confirme.
 *
 * A ciegas. Si salieran billetes que los libros no tienen, antes se recuenta
 * esa moneda y después se vuelve a intentar.
 */
export function CambioDeBilletesFlow(): React.JSX.Element {
  const router = useRouter();
  const caja = useCaja();
  const vista = useVistaDeCaja();
  const hydrated = useHydrated();

  const [con, setCon] = React.useState<Con | null>(null);
  const [currency, setCurrency] = React.useState("");
  const [supervisorId, setSupervisorId] = React.useState("");
  const [entran, setEntran] = React.useState<Unidades>({});
  const [salen, setSalen] = React.useState<Unidades>({});
  /** Con cliente: si ya se pidió la propuesta (y por tanto se ve «Billetes que le das»). */
  const [propuesta, setPropuesta] = React.useState(false);
  const [observaciones, setObservaciones] = React.useState("");
  const [enviado, setEnviado] = React.useState(false);
  const [revisar, setRevisar] = React.useState<{ entran: Billetes; salen: Billetes } | null>(null);
  const [recontando, setRecontando] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [registrado, setRegistrado] = React.useState<MovimientoRegistrado | null>(null);

  const monedas = currency ? [currency] : [];
  const e = aBilletes(monedas, entran);
  const s = aBilletes(monedas, salen);
  const bEntran = e.conteos[0]?.billetes ?? {};
  const bSalen = s.conteos[0]?.billetes ?? {};
  const tEntran = totalDe(bEntran);
  const tSalen = totalDe(bSalen);
  const verSalen = con === "supervisor" || propuesta;
  const errores = {
    con: !con ? "Elige con quién se cambia." : undefined,
    currency: !currency ? "Elige la moneda." : undefined,
    supervisor: con === "supervisor" && !supervisorId ? "Elige al supervisor." : undefined,
    entran: currency && tEntran === 0 ? "Escribe los billetes que entran." : undefined,
    salen:
      currency && verSalen && tSalen === 0
        ? "Escribe los billetes que salen."
        : currency && verSalen && Math.abs(tEntran - tSalen) >= 0.005
          ? "Lo que entra y lo que sale tienen que sumar lo mismo."
          : con === "cliente" && !propuesta
            ? "Pide la propuesta de billetes para darle."
            : undefined,
  };
  const ver = (x: string | undefined) => (enviado ? x : undefined);
  const supervisor = vista.supervisores.find((x) => x.id === supervisorId)?.nombre ?? "";
  const bloqueada = (!caja.jornadaAbierta || vista.bloqueo !== null) && registrado === null;
  const cambiarEntran = (c: string, k: string, v: string) => setEntran((prev) => ({ ...prev, [c]: { ...prev[c], [k]: v } }));
  const cambiarSalen = (c: string, k: string, v: string) => setSalen((prev) => ({ ...prev, [c]: { ...prev[c], [k]: v } }));

  async function proponer() {
    setError(undefined);
    if (!currency || tEntran === 0 || e.errores[currency]) {
      setEnviado(true);
      return;
    }
    setEnviando(true);
    const r = await proponerCambioDeBilletesAction(currency, bEntran);
    setEnviando(false);
    if (!r.ok) {
      setError(errorDe(r.reason));
      return;
    }
    setSalen(aUnidades({ [currency]: r.value }));
    setPropuesta(true);
  }

  function continuar(event: React.FormEvent) {
    event.preventDefault();
    setEnviado(true);
    setError(undefined);
    if (Object.values(errores).some(Boolean) || Object.keys(e.errores).length > 0 || Object.keys(s.errores).length > 0) return;
    setRevisar({ entran: bEntran, salen: bSalen });
  }

  async function confirmar() {
    if (!con || !revisar || enviando) return;
    setEnviando(true);
    setError(undefined);
    const r = await registrarCambioDeBilletesAction({
      con,
      currency,
      entran: revisar.entran,
      salen: revisar.salen,
      ...(con === "supervisor" ? { supervisorId } : {}),
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
        titulo="Cambio de billetes registrado"
        movimiento={registrado}
        tipos={vista.denominaciones[registrado.currency] ?? []}
        leyenda="En positivo lo que entró en la caja; en negativo lo que salió. El total no cambia."
        {...(con === "supervisor" ? { pendienteDe: registrado.supervisor ?? supervisor } : {})}
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
        <h1 className="text-screen-title text-text-primary">Cambio de billetes</h1>
        <p className="mt-2 max-w-2xl text-body text-text-secondary">Entran unos billetes y salen otros, en la misma moneda y por el mismo total.</p>
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
              <Linea etiqueta="Cambio" valor={con === "cliente" ? "Con un cliente" : `Con el supervisor · ${supervisor}`} />
              <Linea etiqueta="Total que se cambia" valor={formatMoney({ amount: totalDe(revisar.entran), currency })} />
              {observaciones.trim() ? <Linea etiqueta="Observaciones" valor={observaciones.trim()} /> : null}
            </dl>
            <BilletesDelMovimiento
              billetes={restar(revisar.entran, revisar.salen)}
              currency={currency}
              tipos={vista.denominaciones[currency] ?? []}
              leyenda="En positivo lo que entra en la caja; en negativo lo que sale. El total no cambia."
            />
            {con === "supervisor" ? (
              <p className="text-body-sm text-text-secondary">Al confirmar se registra en la caja. Después, {supervisor} tendrá que confirmarlo desde su consola.</p>
            ) : null}
            <div className="pc-botonera sm:justify-end">
              <Button variant="secondary" onClick={() => setRevisar(null)} disabled={enviando}>
                Volver a editar
              </Button>
              <Button onClick={() => void confirmar()} disabled={enviando}>
                {enviando ? "Registrando…" : "Confirmar el cambio"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={continuar} className="flex flex-col gap-6" noValidate>
          {error ? <Alert variant="error" title={error} /> : null}
          <Card>
            <CardContent className="flex flex-col gap-5 pt-6">
              <ElegirUno
                nombre="cambio-con"
                etiqueta="Con quién"
                opciones={CON}
                valor={con}
                onChange={(v) => {
                  setCon(v);
                  setPropuesta(false);
                  setSalen({});
                }}
                error={ver(errores.con)}
              />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <ElegirMoneda
                  id="cambio-moneda"
                  monedas={caja.monedas}
                  valor={currency}
                  onChange={(v) => {
                    setCurrency(v);
                    setPropuesta(false);
                    setEntran({});
                    setSalen({});
                  }}
                  error={ver(errores.currency)}
                />
                {con === "supervisor" ? (
                  <ElegirSupervisor
                    id="cambio-supervisor"
                    supervisores={vista.supervisores}
                    valor={supervisorId}
                    onChange={setSupervisorId}
                    error={ver(errores.supervisor)}
                  />
                ) : null}
              </div>
              <Observaciones id="cambio-observaciones" valor={observaciones} onChange={setObservaciones} />
            </CardContent>
          </Card>

          {currency && con ? (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{con === "cliente" ? "Billetes que trae el cliente" : "Billetes que entran en la caja"}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pt-0">
                  <ConteoPorBilletes
                    monedas={monedas}
                    denominaciones={vista.denominaciones}
                    unidades={entran}
                    errores={e.errores}
                    onChange={cambiarEntran}
                    nombre="Entran"
                  />
                  {ver(errores.entran) ? <p className="text-caption text-error-foreground">{errores.entran}</p> : null}
                  {con === "cliente" ? (
                    <div className="pc-botonera">
                      <Button type="button" variant="secondary" onClick={() => void proponer()} disabled={enviando}>
                        <Sparkles aria-hidden="true" />
                        {propuesta ? "Volver a proponer" : "Proponer billetes para darle"}
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
              {verSalen ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{con === "cliente" ? "Billetes que le das" : "Billetes que salen de la caja"}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 pt-0">
                    {con === "cliente" ? (
                      <p className="text-body-sm text-text-secondary">Es la propuesta del sistema. Puedes cambiarla si el total sigue cuadrando.</p>
                    ) : null}
                    <ConteoPorBilletes
                      monedas={monedas}
                      denominaciones={vista.denominaciones}
                      unidades={salen}
                      errores={s.errores}
                      onChange={cambiarSalen}
                      nombre="Salen"
                    />
                    {ver(errores.salen) ? <p className="text-caption text-error-foreground">{errores.salen}</p> : null}
                  </CardContent>
                </Card>
              ) : ver(errores.salen) ? (
                <p className="text-caption text-error-foreground">{errores.salen}</p>
              ) : null}
            </div>
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
