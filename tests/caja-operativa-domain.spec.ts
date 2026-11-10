import { expect, test } from "@playwright/test";

import {
  abrirJornada,
  abrirJornadaDeclarada,
  aperturaDeclarada,
  alcanzaParaEntregar,
  cerrarConArqueo,
  explicarCierre,
  declararConteoDeApertura,
  billetesDeImporte,
  conteoDeLoQueHay,
  supervisoresDe,
  cerrarJornada,
  compararApertura,
  contextoDe,
  estadoDeCaja,
  habilitarMoneda,
  registrarCambio,
  registrarOperacionSimple,
  registrarFondos,
  registrarCambioDeBilletes,
  proponerCambioDeBilletes,
  recontar,
  explicarRecuento,
  tasasVigentes,
  type ContextoDeCaja,
} from "@/features/network/caja-operativa";
import { quienConfirma, resolverSolicitud, solicitudesDeJornada } from "@/features/network/aprobaciones";
import { operadorVigente } from "@/features/network/assignments";
import { operatorScope } from "@/features/network/scope";
import { inventarioDeJornada } from "@/features/network/jornadas";
import { jornadaAbiertaDeCaja, jornadaPorId } from "@/features/network/jornadas";
import { operacionPorCodigo } from "@/features/network/operaciones";
import { crearPuestoDePrueba } from "@/features/network/puesto-de-prueba";
import { cotizar } from "@/features/exchange/cotizacion";

/**
 * La caja que opera un trabajador, en el dominio de la red
 * (`features/network/caja-operativa.ts`). Cada prueba trabaja sobre **su
 * propio puesto** —caja, equipo y trabajador nuevos—, porque una prueba de
 * dominio que toca datos sembrados contamina a las demás del mismo proceso.
 */

const CLIENTE = {
  nombre: "Ana Ruiz Cabrera",
  documentType: "CI" as const,
  documentNumber: "92112087654",
  telefono: "+53 5 345 6789",
  nacionalidad: "Cubana",
};

function puesto(fondos: Record<string, number> | null = null, monedas: readonly string[] = [], enSede?: string): ContextoDeCaja {
  const p = crearPuestoDePrueba({ fondos, monedas, ...(enSede ? { enSede } : {}) });
  if (!p.ok) throw new Error(p.error);
  const c = contextoDe({ workerId: p.value.workerId, terminalId: p.value.terminalId });
  if (!c.ok) throw new Error(c.reason);
  return c.value;
}

const B = billetesDeImporte;

function saldo(ctx: ContextoDeCaja, currency: string): number {
  return estadoDeCaja(ctx).saldos.find((s) => s.currency === currency)?.amount ?? NaN;
}

test.describe("Apertura a ciegas", () => {
  test("la primera jornada de una caja no compara con nada y no pide motivos", () => {
    const ctx = puesto(null, ["CUP", "USD"]);
    const r = abrirJornada(ctx, [
      { currency: "CUP", billetes: B("CUP", 50_000) },
      { currency: "USD", billetes: B("USD", 300) },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.apertura.cierreAnterior).toBeNull();
    expect(solicitudesDeJornada(r.value.id)).toHaveLength(0);
    expect(saldo(ctx, "CUP")).toBe(50_000);
    expect(saldo(ctx, "USD")).toBe(300);
  });

  test("hay que contar todas las monedas de la caja", () => {
    const ctx = puesto(null, ["CUP", "USD"]);
    const r = abrirJornada(ctx, [{ currency: "CUP", billetes: B("CUP", 1) }]);
    expect(r).toMatchObject({ ok: false, reason: "conteo-invalido" });
  });

  test("tras un cierre, una diferencia necesita un motivo compatible con su signo y nace como solicitud", () => {
    const ctx = puesto({ CUP: 10_000, USD: 200 });
    expect(cerrarJornada(ctx, [
      { currency: "CUP", billetes: B("CUP", 10_000) },
      { currency: "USD", billetes: B("USD", 200) },
    ]).ok).toBe(true);

    const comparada = compararApertura(ctx, [
      { currency: "CUP", billetes: B("CUP", 10_000) },
      { currency: "USD", billetes: B("USD", 300) },
    ]);
    expect(comparada.ok).toBe(true);
    if (!comparada.ok) return;
    expect(comparada.value.monedas.find((m) => m.currency === "USD")).toMatchObject({ dejado: 200, contado: 300, diferencia: 100 });

    expect(abrirJornada(ctx, [
      { currency: "CUP", billetes: B("CUP", 10_000) },
      { currency: "USD", billetes: B("USD", 300) },
    ])).toMatchObject({ ok: false, reason: "motivo-requerido", currency: "USD" });
    expect(abrirJornada(ctx, [
      { currency: "CUP", billetes: B("CUP", 10_000) },
      { currency: "USD", billetes: B("USD", 300), motivo: "Retiro de fondos" },
    ])).toMatchObject({ ok: false, reason: "motivo-incompatible" });
    expect(abrirJornada(ctx, [
      { currency: "CUP", billetes: B("CUP", 10_000) },
      { currency: "USD", billetes: B("USD", 300), motivo: "Otro" },
    ])).toMatchObject({ ok: false, reason: "observaciones-requeridas" });

    /* Una reposición pide el supervisor que la trajo, de la lista. */
    expect(abrirJornada(ctx, [
      { currency: "CUP", billetes: B("CUP", 10_000) },
      { currency: "USD", billetes: B("USD", 300), motivo: "Reposición de fondos" },
    ])).toMatchObject({ ok: false, reason: "supervisor-requerido", currency: "USD" });
    const supervisor = supervisoresDe(ctx)[0]!;
    const r = abrirJornada(ctx, [
      { currency: "CUP", billetes: B("CUP", 10_000) },
      { currency: "USD", billetes: B("USD", 300), motivo: "Reposición de fondos", observaciones: "Entregados por la administración.", supervisorId: supervisor.id },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const sol = solicitudesDeJornada(r.value.id);
    expect(sol).toHaveLength(1);
    expect(sol[0]).toMatchObject({ tipo: "fondos", origen: "apertura", supervisor: supervisor.nombre, currency: "USD", referencia: 200, contado: 300, diferencia: 100, motivo: "Reposición de fondos", estado: "pendiente" });
  });
});

test.describe("Conteo de apertura declarado", () => {
  test("se declara una vez: un segundo conteo se rechaza y la apertura usa el primero", () => {
    const ctx = puesto(null, ["CUP", "USD"]);
    const d = declararConteoDeApertura(ctx, [
      { currency: "CUP", billetes: B("CUP", 50_000) },
      { currency: "USD", billetes: B("USD", 300) },
    ]);
    expect(d.ok).toBe(true);
    const otra = declararConteoDeApertura(ctx, [
      { currency: "CUP", billetes: B("CUP", 60_000) },
      { currency: "USD", billetes: B("USD", 300) },
    ]);
    expect(otra).toMatchObject({ ok: false, reason: "conteo-ya-declarado" });
    expect(aperturaDeclarada(ctx)?.comparacion.monedas.find((m) => m.currency === "CUP")?.contado).toBe(50_000);

    const r = abrirJornadaDeclarada(ctx, []);
    expect(r.ok).toBe(true);
    expect(saldo(ctx, "CUP")).toBe(50_000);
    /* Abierta la jornada, la declaración desaparece. */
    expect(aperturaDeclarada(ctx)).toBeNull();
  });

  test("sin conteo declarado no se abre por esta vía", () => {
    const ctx = puesto(null, ["CUP"]);
    expect(abrirJornadaDeclarada(ctx, [])).toMatchObject({ ok: false, reason: "sin-conteo-declarado" });
  });

  test("con el conteo declarado, la caja no gana una moneda que no se contó", () => {
    const ctx = puesto(null, ["CUP"]);
    expect(declararConteoDeApertura(ctx, [{ currency: "CUP", billetes: B("CUP", 1_000) }]).ok).toBe(true);
    expect(habilitarMoneda(ctx, "USD")).toMatchObject({ ok: false, reason: "conteo-ya-declarado" });
  });
});

test.describe("Arqueo y cierre en un acto; apertura con totales", () => {
  test("confirmar el conteo cierra; la diferencia nace «Sin explicar» y se explica una vez", () => {
    const ctx = puesto({ CUP: 10_000 });
    const r = cerrarConArqueo(ctx, [{ currency: "CUP", billetes: B("CUP", 9_900) }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const j = r.value;
    expect(j.estado).toBe("cerrada");
    expect(j.arqueo?.monedas[0]).toMatchObject({ esperado: 10_000, contado: 9_900, diferencia: -100 });
    expect(solicitudesDeJornada(j.id).find((s) => s.tipo === "cierre")?.motivo).toBe("Sin explicar");

    /* Ya cerrada: no se cuenta otra vez. */
    expect(cerrarConArqueo(ctx, [{ currency: "CUP", billetes: B("CUP", 10_000) }])).toMatchObject({ ok: false, reason: "jornada-no-abierta" });

    expect(explicarCierre(ctx, j.id, [{ currency: "CUP", motivo: "Sobrante detectado" }])).toMatchObject({ ok: false, reason: "motivo-incompatible" });
    expect(explicarCierre(ctx, j.id, [{ currency: "CUP", motivo: "Faltante detectado", observaciones: "Billete roto" }]).ok).toBe(true);
    const s = solicitudesDeJornada(j.id).find((x) => x.tipo === "cierre");
    expect(s).toMatchObject({ motivo: "Faltante detectado", observaciones: "Billete roto" });
    expect(j.movimientos.find((m) => m.concepto === "Ajuste de cierre")?.motivo).toBe("Faltante detectado");
    expect(explicarCierre(ctx, j.id, [{ currency: "CUP", motivo: "Retiro de fondos" }])).toMatchObject({ ok: false, reason: "cierre-sin-explicacion-pendiente" });

    /* Quien abre recibe lo contado, no los libros. */
    expect(estadoDeCaja(ctx).apertura.entregado).toEqual([{ currency: "CUP", amount: 9_900 }]);
  });
});

test.describe("Worker a ciegas: entregas sí o no", () => {
  test("alcanzaParaEntregar responde sí o no, sin cifras", () => {
    const ctx = puesto({ CUP: 1_000 });
    expect(alcanzaParaEntregar(ctx, "CUP", 1_000)).toBe(true);
    expect(alcanzaParaEntregar(ctx, "CUP", 1_000.01)).toBe(false);
    expect(alcanzaParaEntregar(ctx, "USD", 1)).toBe(false);
  });
});

test.describe("Durante la jornada", () => {
  test("un cambio se cotiza con las tasas en vigor de la sede y mueve los dos tramos", () => {
    const ctx = puesto({ CUP: 100_000, USD: 0 });
    const tasas = tasasVigentes(ctx.sede.id);
    const q = cotizar(tasas, "USD", "CUP", 100);
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    const usd = tasas.find((t) => t.code === "USD")!;
    expect(q.value.destinationAmount).toBe(100 * usd.compra);

    const r = registrarCambio(ctx, {
      cliente: CLIENTE,
      sourceCurrency: "USD",
      destinationCurrency: "CUP",
      sourceAmount: 100,
      destinationAmountVisto: q.value.destinationAmount,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(saldo(ctx, "USD")).toBe(100);
    expect(saldo(ctx, "CUP")).toBe(100_000 - 100 * usd.compra);
    expect(operacionPorCodigo(r.value.codigo)).toMatchObject({ servicio: "Cambio de moneda", registerId: ctx.register.id });
    const j = jornadaPorId(r.value.jornadaId)!;
    expect(j.movimientos.filter((m) => m.operationCode === r.value.codigo).map((m) => m.concepto)).toEqual([
      "Compra de USD",
      "Pago por compra de USD",
    ]);
  });

  test("entre dos divisas se pivota por el peso: compra de una, venta de la otra", async () => {
    const ctx = puesto({ CUP: 0, EUR: 0, USD: 500 });
    const tasas = tasasVigentes(ctx.sede.id);
    const eur = tasas.find((t) => t.code === "EUR")!;
    const usd = tasas.find((t) => t.code === "USD")!;
    const q = cotizar(tasas, "EUR", "USD", 100);
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    expect(q.value.destinationAmount).toBe(Math.floor(((100 * eur.compra) / usd.venta) * 100) / 100);
    expect(q.value.tasasAplicadas).toEqual([
      { code: "EUR", lado: "compra", valor: eur.compra },
      { code: "USD", lado: "venta", valor: usd.venta },
    ]);

    const r = registrarCambio(ctx, {
      cliente: CLIENTE,
      sourceCurrency: "EUR",
      destinationCurrency: "USD",
      sourceAmount: 100,
      destinationAmountVisto: q.value.destinationAmount,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(saldo(ctx, "EUR")).toBe(100);
    expect(saldo(ctx, "USD")).toBeCloseTo(500 - q.value.destinationAmount, 2);
    /* El peso solo sirve de pivote: no entra ni sale de la caja. */
    expect(saldo(ctx, "CUP")).toBe(0);
    const j = jornadaPorId(r.value.jornadaId)!;
    expect(j.movimientos.filter((m) => m.operationCode === r.value.codigo).map((m) => m.concepto)).toEqual([
      "Compra de EUR",
      "Venta de USD",
    ]);
  });

  test("si la cifra que vio el cliente ya no es la de la tasa, el cambio se rechaza con la cotización nueva", () => {
    const ctx = puesto({ CUP: 100_000, USD: 0 });
    const r = registrarCambio(ctx, {
      cliente: CLIENTE,
      sourceCurrency: "USD",
      destinationCurrency: "CUP",
      sourceAmount: 100,
      destinationAmountVisto: 1,
    });
    expect(r.ok).toBe(false);
    expect(r).toHaveProperty("cotizacion");
  });

  test("no se entrega lo que la caja no tiene", () => {
    const ctx = puesto({ CUP: 1_000 });
    const r = registrarOperacionSimple(ctx, {
      servicio: "Remesa",
      cliente: CLIENTE,
      tramo: { currency: "CUP", delta: -2_000, concepto: "Pago de remesa" },
    });
    expect(r).toMatchObject({ ok: false, reason: "fondos-insuficientes", currency: "CUP" });
  });

  test("el código de operación lleva el día en hora de Cuba", () => {
    const ctx = puesto({ CUP: 10_000 });
    /* 03:30 UTC del 6/11 son las 22:30 del 5/11 en La Habana. */
    const r = registrarOperacionSimple(
      ctx,
      { servicio: "Giros", cliente: CLIENTE, tramo: { currency: "CUP", delta: 500, concepto: "Envío de giro" } },
      new Date("2026-11-06T03:30:00Z"),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.codigo.startsWith("PC-261105-")).toBe(true);
  });

  test("una moneda fuera de la lista de la sede no se habilita", () => {
    const ctx = puesto({ CUP: 1 });
    expect(habilitarMoneda(ctx, "JPY")).toMatchObject({ ok: false, reason: "moneda-fuera-de-la-sede" });
  });
});

test.describe("Lo que la caja no deja hacer", () => {
  test("un servicio que PuntoCash no habilitó en la sede no se presta", () => {
    const ctx = puesto({ CUP: 10_000 });
    const sinRemesas = { ...ctx, sede: { ...ctx.sede, services: ctx.sede.services.filter((s) => s !== "remesas") } };
    expect(registrarOperacionSimple(sinRemesas, {
      servicio: "Remesa",
      cliente: CLIENTE,
      tramo: { currency: "CUP", delta: -100, concepto: "Pago de remesa" },
    })).toMatchObject({ ok: false, reason: "servicio-no-habilitado" });
  });

  test("con la sede suspendida no se registra nada, pero la jornada se cierra", () => {
    const ctx = puesto({ CUP: 10_000 });
    const suspendida = { ...ctx, sede: { ...ctx.sede, status: "suspendida" as const } };
    expect(estadoDeCaja(suspendida).bloqueo).toBe("sede-suspendida");
    expect(registrarOperacionSimple(suspendida, {
      servicio: "Giros",
      cliente: CLIENTE,
      tramo: { currency: "CUP", delta: 100, concepto: "Envío de giro" },
    })).toMatchObject({ ok: false, reason: "bloqueada" });
    expect(cerrarJornada(suspendida, [{ currency: "CUP", billetes: B("CUP", 10_000) }]).ok).toBe(true);
    expect(compararApertura(suspendida, [{ currency: "CUP", billetes: B("CUP", 10_000) }])).toMatchObject({ ok: false, reason: "bloqueada" });
  });

  test("la jornada abierta de otro trabajador no se opera ni se cierra", () => {
    const a = puesto({ CUP: 10_000 });
    const b = puesto(null, [], a.sede.id);
    /* El trabajador de B, sentado en el equipo de A. */
    const intruso = contextoDe({ workerId: b.worker.id, terminalId: a.terminal.id });
    expect(intruso.ok).toBe(true);
    if (!intruso.ok) return;
    expect(cerrarJornada(intruso.value, [{ currency: "CUP", billetes: B("CUP", 10_000) }])).toMatchObject({ ok: false, reason: "jornada-de-otro" });
    expect(compararApertura(intruso.value, [{ currency: "CUP", billetes: B("CUP", 10_000) }])).toMatchObject({ ok: false, reason: "jornada-abierta" });
  });

  test("un trabajador no abre una segunda jornada en otra caja", () => {
    const a = puesto({ CUP: 10_000 });
    const b = puesto(null, ["CUP"], a.sede.id);
    const mismoEnB = contextoDe({ workerId: a.worker.id, terminalId: b.terminal.id });
    /* Es de la misma sede, así que puede sentarse; abrir, no. */
    expect(mismoEnB.ok).toBe(true);
    if (!mismoEnB.ok) return;
    expect(estadoDeCaja(mismoEnB.value).jornadaEnOtraCaja?.cajaNombre).toBe(a.register.name);
    expect(abrirJornada(mismoEnB.value, [{ currency: "CUP", billetes: B("CUP", 1) }])).toMatchObject({ ok: false, reason: "trabajador-con-otra-jornada" });
  });

  test("un trabajador de otra sede no opera en este equipo", () => {
    const a = puesto(null);
    expect(contextoDe({ workerId: "trb-4", terminalId: a.terminal.id })).toMatchObject({ ok: false, reason: "otra-sede" });
  });
});

test.describe("Cierre", () => {
  test("cada diferencia del arqueo deja un ajuste de cierre y su solicitud", () => {
    const ctx = puesto({ CUP: 10_000, USD: 100 });
    expect(cerrarJornada(ctx, [
      { currency: "CUP", billetes: B("CUP", 9_500) },
      { currency: "USD", billetes: B("USD", 100) },
    ])).toMatchObject({ ok: false, reason: "motivo-requerido", currency: "CUP" });
    const r = cerrarJornada(ctx, [
      { currency: "CUP", billetes: B("CUP", 9_500), motivo: "Faltante detectado" },
      { currency: "USD", billetes: B("USD", 100) },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.estado).toBe("cerrada");
    expect(r.value.saldosFinales).toEqual([
      { currency: "CUP", amount: 9_500 },
      { currency: "USD", amount: 100 },
    ]);
    expect(solicitudesDeJornada(r.value.id).map((s) => [s.tipo, s.diferencia])).toEqual([["cierre", -500]]);
    expect(jornadaAbiertaDeCaja(ctx.register.id)).toBeNull();
  });
});

test.describe("Billete a billete", () => {
  test("solo se cuentan denominaciones de la moneda, en enteros", () => {
    const ctx = puesto(null, ["USD"]);
    expect(abrirJornada(ctx, [{ currency: "USD", billetes: { "300": 1 } }])).toMatchObject({ ok: false, reason: "denominacion-invalida", currency: "USD" });
    expect(abrirJornada(ctx, [{ currency: "USD", billetes: { "2000": 1.5 } }])).toMatchObject({ ok: false, reason: "denominacion-invalida" });
    const r = abrirJornada(ctx, [{ currency: "USD", billetes: { "2000": 3, "25": 2 } }]);
    expect(r.ok).toBe(true);
    expect(saldo(ctx, "USD")).toBe(60.5);
    if (r.ok) expect(r.value.movimientos[0]?.billetes).toEqual({ "2000": 3, "25": 2 });
  });

  test("si el total cuadra pero los billetes no, al cerrar es una diferencia de composición con sus causas", () => {
    const ctx = puesto({ USD: 100 });
    /* Abrió con un billete de 100; cierra con dos de 50. */
    const r = cerrarConArqueo(ctx, [{ currency: "USD", billetes: { "5000": 2 } }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const j = r.value;
    expect(j.arqueo?.monedas[0]).toMatchObject({ diferencia: 0, composicion: { "5000": 2, "10000": -1 } });
    const s = solicitudesDeJornada(j.id).find((x) => x.currency === "USD");
    expect(s).toMatchObject({ tipo: "composicion", diferencia: 0, motivo: "Sin explicar", billetes: { "5000": 2, "10000": -1 } });
    expect(j.movimientos.at(-1)).toMatchObject({ concepto: "Ajuste de billetes al cerrar", amount: 0, billetes: { "5000": 2, "10000": -1 } });

    expect(explicarCierre(ctx, j.id, [{ currency: "USD", motivo: "Faltante detectado" }])).toMatchObject({ ok: false, reason: "motivo-incompatible" });
    expect(explicarCierre(ctx, j.id, [{ currency: "USD", motivo: "Hice un cambio de billetes sin registrarlo" }]).ok).toBe(true);
    expect(solicitudesDeJornada(j.id).find((x) => x.currency === "USD")?.motivo).toBe("Hice un cambio de billetes sin registrarlo");

    /* Quien abre recibe los billetes contados. */
    expect(estadoDeCaja(ctx).apertura.billetesEntregados.USD).toEqual({ "5000": 2 });
  });

  test("el inventario queda igual a lo contado, también con diferencia de importe", () => {
    const ctx = puesto({ CUP: 10_000 });
    const r = cerrarConArqueo(ctx, [{ currency: "CUP", billetes: { "100000": 9, "50000": 1, "20000": 2 } }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.arqueo?.monedas[0]).toMatchObject({ contado: 9_900, diferencia: -100 });
    expect(r.value.arqueo?.monedas[0]?.composicion).toBeUndefined();
    expect(estadoDeCaja(ctx).apertura.billetesEntregados.CUP).toEqual({ "100000": 9, "50000": 1, "20000": 2 });
  });

  test("al cerrar, una reposición o un retiro piden el supervisor y pasan a movimiento de fondos", () => {
    const ctx = puesto({ CUP: 10_000 });
    const r = cerrarConArqueo(ctx, [{ currency: "CUP", billetes: B("CUP", 8_000) }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(explicarCierre(ctx, r.value.id, [{ currency: "CUP", motivo: "Retiro de fondos" }])).toMatchObject({ ok: false, reason: "supervisor-requerido" });
    const sup = supervisoresDe(ctx)[0]!;
    expect(explicarCierre(ctx, r.value.id, [{ currency: "CUP", motivo: "Retiro de fondos", supervisorId: sup.id }]).ok).toBe(true);
    expect(solicitudesDeJornada(r.value.id).find((x) => x.currency === "CUP")).toMatchObject({ tipo: "fondos", origen: "cierre", supervisor: sup.nombre });
  });

  test("al abrir, «El supervisor cambió billetes» pide el supervisor y pasa a confirmación", () => {
    const ctx = puesto({ USD: 100 });
    expect(cerrarJornada(ctx, conteoDeLoQueHay(ctx)).ok).toBe(true);
    const conteo = [{ currency: "USD", billetes: { "2000": 5 } }];
    const c = compararApertura(ctx, conteo);
    expect(c.ok && c.value.monedas[0]).toMatchObject({ diferencia: 0, composicion: { "2000": 5, "10000": -1 } });
    expect(abrirJornada(ctx, [{ ...conteo[0]!, motivo: "Hice un cambio de billetes sin registrarlo" }])).toMatchObject({ ok: false, reason: "motivo-incompatible" });
    expect(abrirJornada(ctx, [{ ...conteo[0]!, motivo: "El supervisor cambió billetes" }])).toMatchObject({ ok: false, reason: "supervisor-requerido" });
    const sup = supervisoresDe(ctx)[0]!;
    const r = abrirJornada(ctx, [{ ...conteo[0]!, motivo: "El supervisor cambió billetes", supervisorId: sup.id }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(solicitudesDeJornada(r.value.id)[0]).toMatchObject({ tipo: "fondos", origen: "apertura", supervisor: sup.nombre, billetes: { "2000": 5, "10000": -1 } });
  });

  test("si el sistema no conocía todos los billetes, no se inventa una diferencia de composición", () => {
    const ctx = puesto({ CUP: 10_000 });
    /* Un giro sin billetes registrados: la caja tiene 2.000 CUP sin desglosar. */
    expect(registrarOperacionSimple(ctx, { servicio: "Giros", cliente: CLIENTE, tramo: { currency: "CUP", delta: 2_000, concepto: "Envío de giro" } }).ok).toBe(true);
    const r = cerrarConArqueo(ctx, [{ currency: "CUP", billetes: { "100000": 12 } }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.arqueo?.monedas[0]).toMatchObject({ diferencia: 0 });
    expect(r.value.arqueo?.monedas[0]?.composicion).toBeUndefined();
    expect(solicitudesDeJornada(r.value.id)).toHaveLength(0);
    expect(r.value.movimientos.at(-1)).toMatchObject({ concepto: "Desglose del conteo de cierre", amount: 0 });
  });
});

test.describe("Fondos, cambio de billetes y recuento", () => {
  const inv = (ctx: ContextoDeCaja, c: string) => inventarioDeJornada(jornadaAbiertaDeCaja(ctx.register.id)!).get(c);

  test("una reposición entra en el acto y queda pendiente de que la confirme su supervisor, y solo él", () => {
    const ctx = puesto({ USD: 100 });
    const [sup, otro] = supervisoresDe(ctx);
    expect(registrarFondos(ctx, { tipo: "reposicion", currency: "USD", billetes: { "5000": 2 }, supervisorId: "nadie" })).toMatchObject({
      ok: false,
      reason: "supervisor-requerido",
    });
    const r = registrarFondos(ctx, { tipo: "reposicion", currency: "USD", billetes: { "5000": 2 }, supervisorId: sup!.id });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({ concepto: "Reposición de fondos", tipo: "entrada", amount: 100, billetes: { "5000": 2 }, supervisor: sup!.nombre });
    expect(saldo(ctx, "USD")).toBe(200);
    const s = solicitudesDeJornada(jornadaAbiertaDeCaja(ctx.register.id)!.id).find((x) => x.movimientoId === r.value.id)!;
    expect(s).toMatchObject({ tipo: "fondos", origen: "jornada", fondos: "reposicion", supervisorId: sup!.id, estado: "pendiente" });
    expect(quienConfirma(s)).toEqual({ id: sup!.id, nombre: sup!.nombre });
    const scope = operatorScope(operadorVigente(ctx.sede.id)!);
    if (otro) {
      expect(resolverSolicitud(scope, s.id, "aprobada", "Lo confirmo, sí.", { id: otro.id, nombre: otro.nombre })).toEqual({
        ok: false,
        reason: "solo-el-supervisor",
      });
    }
    expect(resolverSolicitud(scope, s.id, "aprobada", "Lo traje yo, correcto.", { id: sup!.id, nombre: sup!.nombre }).ok).toBe(true);
  });

  test("un retiro que los libros pueden cubrir sale en el acto", () => {
    const ctx = puesto({ USD: 300 });
    const sup = supervisoresDe(ctx)[0]!;
    const r = registrarFondos(ctx, { tipo: "retiro", currency: "USD", billetes: { "10000": 2 }, supervisorId: sup.id });
    expect(r).toMatchObject({ ok: true, value: { concepto: "Retiro de fondos", tipo: "salida", amount: -200, billetes: { "10000": -2 } } });
    expect(saldo(ctx, "USD")).toBe(100);
    expect(inv(ctx, "USD")).toEqual({ "10000": 1 });
  });

  test("si salen billetes que los libros no tienen, se pide contar esa moneda; el recuento corrige el inventario y deja constancia", () => {
    const ctx = puesto({ USD: 200 });
    const sup = supervisoresDe(ctx)[0]!;
    const pedir = { tipo: "retiro" as const, currency: "USD", billetes: { "5000": 2 }, supervisorId: sup.id };
    /* Los libros dicen 2 de 100: no hay billetes de 50. Nada se registra. */
    expect(registrarFondos(ctx, pedir)).toEqual({ ok: false, reason: "recuento-necesario", currency: "USD" });
    expect(saldo(ctx, "USD")).toBe(200);
    /* Un recuento que no se pidió, no. */
    expect(recontar(ctx, { currency: "CUP", billetes: {} })).toMatchObject({ ok: false, reason: "recuento-no-pedido" });
    /* Contado: un billete de 100 y dos de 50. Mismo total, otros billetes. */
    const rc = recontar(ctx, { currency: "USD", billetes: { "10000": 1, "5000": 2 } });
    expect(rc).toMatchObject({ ok: true, value: { diferencia: 0, composicion: { "10000": -1, "5000": 2 }, pideExplicacion: true } });
    if (!rc.ok) return;
    expect(inv(ctx, "USD")).toEqual({ "10000": 1, "5000": 2 });
    const j = jornadaAbiertaDeCaja(ctx.register.id)!;
    const s = solicitudesDeJornada(j.id).find((x) => x.movimientoId === rc.value.movimientoId)!;
    expect(s).toMatchObject({ tipo: "composicion", origen: "recuento", motivo: "Sin explicar" });
    expect(explicarRecuento(ctx, rc.value.movimientoId!, { motivo: "Faltante detectado" })).toMatchObject({ ok: false, reason: "motivo-incompatible" });
    expect(explicarRecuento(ctx, rc.value.movimientoId!, { motivo: "Hice un cambio de billetes sin registrarlo" }).ok).toBe(true);
    expect(solicitudesDeJornada(j.id).find((x) => x.id === s.id)?.motivo).toBe("Hice un cambio de billetes sin registrarlo");
    expect(explicarRecuento(ctx, rc.value.movimientoId!, { motivo: "Otro", observaciones: "x" })).toMatchObject({ ok: false });
    /* Ahora sí sale. */
    expect(registrarFondos(ctx, pedir).ok).toBe(true);
    expect(inv(ctx, "USD")).toEqual({ "10000": 1 });
  });

  test("contado, si esos billetes no están, no se pide otro recuento", () => {
    const ctx = puesto({ USD: 100 });
    const sup = supervisoresDe(ctx)[0]!;
    const pedir = { tipo: "retiro" as const, currency: "USD", billetes: { "5000": 1 }, supervisorId: sup.id };
    expect(registrarFondos(ctx, pedir)).toMatchObject({ reason: "recuento-necesario" });
    const rc = recontar(ctx, { currency: "USD", billetes: { "10000": 1 } });
    expect(rc).toMatchObject({ ok: true, value: { movimientoId: null, diferencia: 0, pideExplicacion: false } });
    expect(registrarFondos(ctx, pedir)).toMatchObject({ ok: false, reason: "sin-esos-billetes" });
  });

  test("un recuento con faltante pide un motivo de importe y nace como diferencia en recuento", () => {
    const ctx = puesto({ USD: 200 });
    const sup = supervisoresDe(ctx)[0]!;
    expect(registrarFondos(ctx, { tipo: "retiro", currency: "USD", billetes: { "2000": 1 }, supervisorId: sup.id })).toMatchObject({
      reason: "recuento-necesario",
    });
    const rc = recontar(ctx, { currency: "USD", billetes: { "10000": 1, "2000": 4 } });
    expect(rc).toMatchObject({ ok: true, value: { diferencia: -20, pideExplicacion: true } });
    if (!rc.ok) return;
    expect(saldo(ctx, "USD")).toBe(180);
    const j = jornadaAbiertaDeCaja(ctx.register.id)!;
    expect(j.movimientos.at(-1)).toMatchObject({ concepto: "Ajuste por recuento", amount: -20 });
    expect(solicitudesDeJornada(j.id).find((x) => x.movimientoId === rc.value.movimientoId)).toMatchObject({ tipo: "recuento", diferencia: -20 });
    expect(explicarRecuento(ctx, rc.value.movimientoId!, { motivo: "Retiro de fondos" })).toMatchObject({ reason: "motivo-incompatible" });
    expect(explicarRecuento(ctx, rc.value.movimientoId!, { motivo: "Faltante detectado" }).ok).toBe(true);
  });

  test("cambio con cliente: el sistema propone sin repetir sus denominaciones; mismo total; no pasa por aprobación", () => {
    const ctx = puesto({ USD: 300 });
    /* Inventario: 3 de 100. El cliente trae 5 de 20 y quiere uno de 100. */
    expect(proponerCambioDeBilletes(ctx, "USD", { "2000": 5 })).toEqual({ ok: true, value: { "10000": 1 } });
    /* Trae uno de 100: no hay con qué sin devolverle otro de 100. */
    expect(proponerCambioDeBilletes(ctx, "USD", { "10000": 1 })).toMatchObject({ ok: false, reason: "sin-cambio-exacto" });
    expect(registrarCambioDeBilletes(ctx, { con: "cliente", currency: "USD", entran: { "2000": 5 }, salen: { "5000": 1 } })).toMatchObject({
      reason: "cambio-descuadrado",
    });
    const r = registrarCambioDeBilletes(ctx, { con: "cliente", currency: "USD", entran: { "2000": 5 }, salen: { "10000": 1 } });
    expect(r).toMatchObject({ ok: true, value: { tipo: "cambio", concepto: "Cambio de billetes", amount: 0, billetes: { "2000": 5, "10000": -1 }, cambioCon: "cliente" } });
    expect(saldo(ctx, "USD")).toBe(300);
    expect(inv(ctx, "USD")).toEqual({ "10000": 2, "2000": 5 });
    if (r.ok) expect(solicitudesDeJornada(jornadaAbiertaDeCaja(ctx.register.id)!.id).some((x) => x.movimientoId === r.value.id)).toBe(false);
  });

  test("cambio con el supervisor: pide supervisor y queda pendiente de que lo confirme", () => {
    const ctx = puesto({ USD: 300 });
    const sup = supervisoresDe(ctx)[0]!;
    const c = { con: "supervisor" as const, currency: "USD", entran: { "5000": 2 }, salen: { "10000": 1 } };
    expect(registrarCambioDeBilletes(ctx, c)).toMatchObject({ reason: "supervisor-requerido" });
    const r = registrarCambioDeBilletes(ctx, { ...c, supervisorId: sup.id });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = solicitudesDeJornada(jornadaAbiertaDeCaja(ctx.register.id)!.id).find((x) => x.movimientoId === r.value.id);
    expect(s).toMatchObject({ tipo: "fondos", fondos: "cambio", supervisorId: sup.id, diferencia: 0 });
  });
});
