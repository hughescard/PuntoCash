import { expect, test } from "@playwright/test";

import {
  abrirJornada,
  abrirJornadaDeclarada,
  aperturaDeclarada,
  alcanzaParaEntregar,
  cerrarConArqueo,
  contarParaAjuste,
  explicarAjuste,
  explicarCierre,
  declararConteoDeApertura,
  ajustarEfectivo,
  cerrarJornada,
  compararApertura,
  contextoDe,
  estadoDeCaja,
  habilitarMoneda,
  registrarCambio,
  registrarOperacionSimple,
  tasasVigentes,
  type ContextoDeCaja,
} from "@/features/network/caja-operativa";
import { solicitudesDeJornada } from "@/features/network/aprobaciones";
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

function saldo(ctx: ContextoDeCaja, currency: string): number {
  return estadoDeCaja(ctx).saldos.find((s) => s.currency === currency)?.amount ?? NaN;
}

test.describe("Apertura a ciegas", () => {
  test("la primera jornada de una caja no compara con nada y no pide motivos", () => {
    const ctx = puesto(null, ["CUP", "USD"]);
    const r = abrirJornada(ctx, [
      { currency: "CUP", contado: 50_000 },
      { currency: "USD", contado: 300 },
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
    const r = abrirJornada(ctx, [{ currency: "CUP", contado: 1 }]);
    expect(r).toMatchObject({ ok: false, reason: "conteo-invalido" });
  });

  test("tras un cierre, una diferencia necesita un motivo compatible con su signo y nace como solicitud", () => {
    const ctx = puesto({ CUP: 10_000, USD: 200 });
    expect(cerrarJornada(ctx, [
      { currency: "CUP", contado: 10_000 },
      { currency: "USD", contado: 200 },
    ]).ok).toBe(true);

    const comparada = compararApertura(ctx, [
      { currency: "CUP", contado: 10_000 },
      { currency: "USD", contado: 300 },
    ]);
    expect(comparada.ok).toBe(true);
    if (!comparada.ok) return;
    expect(comparada.value.monedas.find((m) => m.currency === "USD")).toMatchObject({ dejado: 200, contado: 300, diferencia: 100 });

    expect(abrirJornada(ctx, [
      { currency: "CUP", contado: 10_000 },
      { currency: "USD", contado: 300 },
    ])).toMatchObject({ ok: false, reason: "motivo-requerido", currency: "USD" });
    expect(abrirJornada(ctx, [
      { currency: "CUP", contado: 10_000 },
      { currency: "USD", contado: 300, motivo: "Retiro de fondos" },
    ])).toMatchObject({ ok: false, reason: "motivo-incompatible" });
    expect(abrirJornada(ctx, [
      { currency: "CUP", contado: 10_000 },
      { currency: "USD", contado: 300, motivo: "Otro" },
    ])).toMatchObject({ ok: false, reason: "observaciones-requeridas" });

    const r = abrirJornada(ctx, [
      { currency: "CUP", contado: 10_000 },
      { currency: "USD", contado: 300, motivo: "Reposición de fondos", observaciones: "Entregados por la administración." },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const sol = solicitudesDeJornada(r.value.id);
    expect(sol).toHaveLength(1);
    expect(sol[0]).toMatchObject({ tipo: "apertura", currency: "USD", referencia: 200, contado: 300, diferencia: 100, motivo: "Reposición de fondos", estado: "pendiente" });
  });
});

test.describe("Conteo de apertura declarado", () => {
  test("se declara una vez: un segundo conteo se rechaza y la apertura usa el primero", () => {
    const ctx = puesto(null, ["CUP", "USD"]);
    const d = declararConteoDeApertura(ctx, [
      { currency: "CUP", contado: 50_000 },
      { currency: "USD", contado: 300 },
    ]);
    expect(d.ok).toBe(true);
    const otra = declararConteoDeApertura(ctx, [
      { currency: "CUP", contado: 60_000 },
      { currency: "USD", contado: 300 },
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
    expect(declararConteoDeApertura(ctx, [{ currency: "CUP", contado: 1_000 }]).ok).toBe(true);
    expect(habilitarMoneda(ctx, "USD")).toMatchObject({ ok: false, reason: "conteo-ya-declarado" });
  });
});

test.describe("Arqueo y cierre en un acto; apertura con totales", () => {
  test("confirmar el conteo cierra; la diferencia nace «Sin explicar» y se explica una vez", () => {
    const ctx = puesto({ CUP: 10_000 });
    const r = cerrarConArqueo(ctx, [{ currency: "CUP", contado: 9_900 }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const j = r.value;
    expect(j.estado).toBe("cerrada");
    expect(j.arqueo?.monedas[0]).toMatchObject({ esperado: 10_000, contado: 9_900, diferencia: -100 });
    expect(solicitudesDeJornada(j.id).find((s) => s.tipo === "cierre")?.motivo).toBe("Sin explicar");

    /* Ya cerrada: no se cuenta otra vez. */
    expect(cerrarConArqueo(ctx, [{ currency: "CUP", contado: 10_000 }])).toMatchObject({ ok: false, reason: "jornada-no-abierta" });

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

test.describe("Worker a ciegas: ajuste en dos pasos y entregas sí o no", () => {
  test("contar registra el ajuste «Sin explicar»; explicar lo completa una vez", () => {
    const ctx = puesto({ EUR: 1_200 });
    const r = contarParaAjuste(ctx, { currency: "EUR", contado: 1_185 });
    expect(r.ok && r.value).toMatchObject({ concepto: "Ajuste de efectivo", amount: -15 });
    if (!r.ok || !r.value) return;
    const m = r.value;
    const sol = () => solicitudesDeJornada(estadoDeCaja(ctx).jornada!.id).find((x) => x.tipo === "ajuste");
    expect(sol()?.motivo).toBe("Sin explicar");

    expect(explicarAjuste(ctx, m.id, { motivo: "Sobrante detectado" })).toMatchObject({ ok: false, reason: "motivo-incompatible" });
    expect(explicarAjuste(ctx, m.id, { motivo: "Faltante detectado", observaciones: "Billete roto" }).ok).toBe(true);
    expect(sol()).toMatchObject({ motivo: "Faltante detectado", observaciones: "Billete roto" });
    expect(explicarAjuste(ctx, m.id, { motivo: "Otro", observaciones: "x" })).toMatchObject({ ok: false, reason: "ajuste-sin-explicacion-pendiente" });
  });

  test("si lo contado coincide, no hay ajuste", () => {
    const ctx = puesto({ EUR: 1_200 });
    expect(contarParaAjuste(ctx, { currency: "EUR", contado: 1_200 })).toEqual({ ok: true, value: null });
  });

  test("alcanzaParaEntregar responde sí o no, sin cifras", () => {
    const ctx = puesto({ CUP: 1_000 });
    expect(alcanzaParaEntregar(ctx, "CUP", 1_000)).toBe(true);
    expect(alcanzaParaEntregar(ctx, "CUP", 1_000.01)).toBe(false);
    expect(alcanzaParaEntregar(ctx, "USD", 1)).toBe(false);
  });
});

test.describe("Durante la jornada", () => {
  test("un ajuste fija el saldo en lo contado y deja su solicitud", () => {
    const ctx = puesto({ CUP: 5_000 });
    const m = ajustarEfectivo(ctx, { currency: "CUP", contado: 4_800, motivo: "Faltante detectado" });
    expect(m.ok).toBe(true);
    expect(saldo(ctx, "CUP")).toBe(4_800);
    const j = jornadaAbiertaDeCaja(ctx.register.id)!;
    expect(solicitudesDeJornada(j.id).map((s) => s.tipo)).toEqual(["ajuste"]);
    expect(ajustarEfectivo(ctx, { currency: "CUP", contado: 4_900, motivo: "Faltante detectado" })).toMatchObject({ ok: false, reason: "motivo-incompatible" });
    expect(ajustarEfectivo(ctx, { currency: "CUP", contado: 4_800, motivo: "Otro", observaciones: "x" })).toMatchObject({ ok: false, reason: "diferencia-cero" });
  });

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
    expect(ajustarEfectivo(suspendida, { currency: "CUP", contado: 9_000, motivo: "Faltante detectado" })).toMatchObject({ ok: false, reason: "bloqueada" });
    expect(cerrarJornada(suspendida, [{ currency: "CUP", contado: 10_000 }]).ok).toBe(true);
    expect(compararApertura(suspendida, [{ currency: "CUP", contado: 10_000 }])).toMatchObject({ ok: false, reason: "bloqueada" });
  });

  test("la jornada abierta de otro trabajador no se opera ni se cierra", () => {
    const a = puesto({ CUP: 10_000 });
    const b = puesto(null, [], a.sede.id);
    /* El trabajador de B, sentado en el equipo de A. */
    const intruso = contextoDe({ workerId: b.worker.id, terminalId: a.terminal.id });
    expect(intruso.ok).toBe(true);
    if (!intruso.ok) return;
    expect(cerrarJornada(intruso.value, [{ currency: "CUP", contado: 10_000 }])).toMatchObject({ ok: false, reason: "jornada-de-otro" });
    expect(compararApertura(intruso.value, [{ currency: "CUP", contado: 10_000 }])).toMatchObject({ ok: false, reason: "jornada-abierta" });
  });

  test("un trabajador no abre una segunda jornada en otra caja", () => {
    const a = puesto({ CUP: 10_000 });
    const b = puesto(null, ["CUP"], a.sede.id);
    const mismoEnB = contextoDe({ workerId: a.worker.id, terminalId: b.terminal.id });
    /* Es de la misma sede, así que puede sentarse; abrir, no. */
    expect(mismoEnB.ok).toBe(true);
    if (!mismoEnB.ok) return;
    expect(estadoDeCaja(mismoEnB.value).jornadaEnOtraCaja?.cajaNombre).toBe(a.register.name);
    expect(abrirJornada(mismoEnB.value, [{ currency: "CUP", contado: 1 }])).toMatchObject({ ok: false, reason: "trabajador-con-otra-jornada" });
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
      { currency: "CUP", contado: 9_500 },
      { currency: "USD", contado: 100 },
    ])).toMatchObject({ ok: false, reason: "motivo-requerido", currency: "CUP" });
    const r = cerrarJornada(ctx, [
      { currency: "CUP", contado: 9_500, motivo: "Faltante detectado" },
      { currency: "USD", contado: 100 },
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
