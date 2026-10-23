/**
 * LAS JORNADAS de la red, vistas desde la administración — **FR-AD-JOR-1** a
 * **FR-AD-JOR-20**.
 *
 * Una jornada es el día de trabajo de una caja: la abre un trabajador con su
 * fondeo inicial, registra movimientos, y la cierra con su arqueo. Aquí no se
 * abre ni se opera ninguna: la consola **mira**, y como única intervención
 * puede **forzar el cierre** de una abierta, que añade un hecho nuevo sin
 * tocar nada de lo anterior (**FR-AD-JOR-12**, **[A7]**, **[R9]**).
 *
 * ── Instantáneas, no recálculos ───────────────────────────────────────────
 * Lo que una jornada cerrada dice —saldos finales, arqueo, diferencias— se
 * guarda en el momento del cierre y no se recalcula después (**FR-AD-JOR-6**).
 * Solo una abierta calcula su saldo actual, a partir de su fondeo y sus
 * movimientos, porque todavía no tiene otra cosa.
 *
 * ── De dónde salen los datos ──────────────────────────────────────────────
 * Las jornadas viven en el servidor y se siembran aquí con fechas relativas a
 * hoy: una semana de historia por cada caja con equipo, con arqueos cuadrados
 * y con diferencia, una cerrada a la fuerza, y las de hoy abiertas. Hay una
 * **abierta desde ayer** en Obispo, que es el caso para el que existe forzar
 * el cierre. El almacén vive en `globalThis` por la misma razón que el de las
 * promociones: una ruta de Next carga los módulos en otro grafo.
 */

import { estaEnAlcance } from "./assignments";
import { equipoDeCaja, kioscosDeSede } from "./devices";
import { registrarOperacionSembrada, type OperacionDeRed } from "./operaciones";
import { findRegisterById, registersOf } from "./registers";
import { requireOperatorScope, type Scope, type ScopeDenial } from "./scope";
import { SEDES } from "./sedes";
import { workersOf } from "./workers";

export type EstadoJornada = "abierta" | "cerrada" | "forzada";
export type TipoMovimiento = "entrada" | "salida";

export interface MovimientoDeJornada {
  id: string;
  fechaHora: string;
  tipo: TipoMovimiento;
  concepto: string;
  /** Solo los que vienen de una operación con cliente. */
  operationCode?: string;
  currency: string;
  /** Positivo en una entrada, negativo en una salida. */
  amount: number;
  saldoDespues: number;
  /** Solo en un ajuste de efectivo: el motivo declarado y el saldo previo. */
  motivo?: string;
  observaciones?: string;
  saldoAntes?: number;
}

export interface ArqueoMoneda {
  currency: string;
  esperado: number;
  contado: number;
  diferencia: number;
  motivo?: string;
}

/**
 * La apertura: con cuánto se dejó la caja al cerrar la jornada anterior y
 * cuánto contó quien la abre. Se guarda al abrir y no se recalcula.
 */
export interface AperturaMoneda {
  currency: string;
  /** El saldo final de la jornada anterior; `null` si no había moneda. */
  dejado: number | null;
  contado: number;
  /** `contado − dejado` (o el contado, si no había nada dejado). */
  diferencia: number;
  motivo?: MotivoDeApertura;
  observaciones?: string;
}

export interface AperturaJornada {
  /** La jornada anterior de la caja, o `null` si es la primera que hay. */
  cierreAnterior: {
    jornadaId: string;
    closedAt: string;
    workerName: string;
    /** Cerrada sin arqueo: lo «dejado» es el saldo en libros, no un conteo. */
    sinArqueo: boolean;
  } | null;
  monedas: readonly AperturaMoneda[];
}

/** Por qué no coincide lo contado al abrir con lo dejado al cerrar. */
export const MOTIVOS_DE_APERTURA = [
  "Reposición de fondos",
  "Retiro de fondos",
  "Faltante detectado",
  "Sobrante detectado",
  "Otro",
] as const;
export type MotivoDeApertura = (typeof MOTIVOS_DE_APERTURA)[number];

export interface Jornada {
  id: string;
  sedeId: string;
  registerId: string;
  cajaNombre: string;
  /** El equipo en el que se operó, guardado al abrir (**FR-AD-JOR-4**). */
  equipo: { id: string; label: string } | null;
  workerId: string;
  workerName: string;
  openedAt: string;
  closedAt: string | null;
  estado: EstadoJornada;
  fondeo: readonly { currency: string; amount: number }[];
  apertura: AperturaJornada;
  movimientos: MovimientoDeJornada[];
  /** Instantánea al cerrar: con arqueo, el contado; forzada, el saldo en libros. */
  saldosFinales?: readonly { currency: string; amount: number }[];
  arqueo?: { confirmadoAt: string; monedas: readonly ArqueoMoneda[] };
  cierreForzado?: { at: string; por: string; motivo: string };
  /**
   * Si el trabajador tiene ahora la caja abierta en su equipo. En el producto
   * lo sabe el servidor por la sesión del equipo; lo usa la advertencia de
   * forzar el cierre.
   */
  sesionActiva: boolean;
}

export const MOTIVO_MIN = 10;

/* -------------------------------------------------------------------------
 * Fechas en hora de Cuba
 * ---------------------------------------------------------------------- */

function hoyEnCuba(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Havana",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** El instante de «fecha, hh:mm» en La Habana, sea horario de verano o no. */
function instanteEnCuba(fecha: string, hh: number, mm: number): Date {
  const guess = new Date(`${fecha}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00Z`);
  const enCuba = new Date(guess.toLocaleString("en-US", { timeZone: "America/Havana" }));
  const enUtc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() + (enUtc.getTime() - enCuba.getTime()));
}

/* -------------------------------------------------------------------------
 * Siembra
 * ---------------------------------------------------------------------- */

/** Pseudoaleatorio con semilla: la misma semana cada vez que arranca el servidor. */
function generador(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const TASAS = { USD: { compra: 316, venta: 325 }, EUR: { compra: 341, venta: 365 }, GBP: { compra: 395, venta: 405 } };
const FONDEO: Record<string, number> = { CUP: 120_000, USD: 1_200, EUR: 300, GBP: 150 };

/** Clientes de la siembra: los datos como quedaron en cada operación. */
const CLIENTES: readonly OperacionDeRed["cliente"][] = [
  { nombre: "Luis Martínez Pérez", documentType: "CI", documentNumber: "88041523456", telefono: "+53 5 567 8901", nacionalidad: "Cubana" },
  { nombre: "Yudelkis Ramírez Soto", documentType: "CI", documentNumber: "95022734567", telefono: "+53 5 678 9012", nacionalidad: "Cubana" },
  { nombre: "Jorge Fernández Gil", documentType: "CI", documentNumber: "79101245678", telefono: "+53 5 789 0123", nacionalidad: "Cubana" },
  { nombre: "Odalys Suárez Vega", documentType: "CI", documentNumber: "91093067890", telefono: "+53 5 901 2345", nacionalidad: "Cubana" },
  { nombre: "Marta Silva Duarte", documentType: "PASAPORTE", documentNumber: "X1234567", telefono: "+55 11 98765 4321", nacionalidad: "Brasileña" },
  { nombre: "Roberto Alonso Díaz", documentType: "CI", documentNumber: "76122178901", telefono: "+53 5 012 3456", nacionalidad: "Cubana" },
  { nombre: "Diana Castellanos Ruiz", documentType: "CI", documentNumber: "89070489012", telefono: "+53 5 123 5678", nacionalidad: "Cubana" },
  { nombre: "Pedro Sánchez Molina", documentType: "PASAPORTE", documentNumber: "X7788990", telefono: "+34 600 112 233", nacionalidad: "Española" },
  { nombre: "Ana Ruiz Cabrera", documentType: "CI", documentNumber: "92112087654", telefono: "+53 5 345 6789", nacionalidad: "Cubana" },
  { nombre: "Yasmani Prieto León", documentType: "CI", documentNumber: "87051234567", telefono: "+53 5 456 7890", nacionalidad: "Cubana" },
];
const BENEFICIARIOS: readonly { nombre: string; ci: string; provincia: [string, string]; municipio: [string, string] }[] = [
  { nombre: "Dayana Quesada Peña", ci: "92030512345", provincia: ["LH", "La Habana"], municipio: ["PDR", "Plaza de la Revolución"] },
  { nombre: "Ernesto Valdés Ríos", ci: "80061298765", provincia: ["SC", "Santiago de Cuba"], municipio: ["SCU", "Santiago de Cuba"] },
  { nombre: "Lázara Pérez Ortega", ci: "93111045678", provincia: ["CF", "Cienfuegos"], municipio: ["CFG", "Cienfuegos"] },
];

let secuencia = 0;

function sembrar(now: Date): Jornada[] {
  const rnd = generador(20261016);
  const hoy = hoyEnCuba(now);
  const out: Jornada[] = [];
  let codigo = 7000;

  for (const sede of SEDES) {
    if (sede.status !== "activa") continue;
    const trabajadores = workersOf(sede.id).filter((w) => w.status === "activo");
    const cajas = registersOf(sede.id).filter((c) => equipoDeCaja(c.id));
    if (trabajadores.length === 0) continue;

    cajas.forEach((caja, indiceCaja) => {
      const equipo = equipoDeCaja(caja.id);
      const monedas = ["CUP", ...(Object.keys(TASAS) as (keyof typeof TASAS)[]).filter((c) => rnd() < 0.7 || c === "USD")];
      /* La jornada anterior de esta caja: su cierre es lo que encuentra la siguiente. */
      let anterior: Jornada | null = null;

      for (let dia = -7; dia <= 0; dia += 1) {
        const fecha = sumarDias(hoy, dia);
        const trabajador = trabajadores[(indiceCaja + dia + 70) % trabajadores.length]!;
        /* Un trabajador no tiene dos jornadas a la vez: con menos trabajadores
           que cajas, la caja sobrante no abre ese día. */
        if (indiceCaja >= trabajadores.length) continue;

        const abierta = instanteEnCuba(fecha, 8, 30 + Math.floor(rnd() * 20));
        if (abierta.getTime() > now.getTime()) continue;

        /* Hoy, abierta. Y en Obispo la Caja 01 de ayer se quedó abierta: nadie
           la cerró, y es la que pide forzar el cierre. */
        const abandonada = sede.id === "sede-habana-vieja" && caja.id.endsWith("caja-01") && dia === -1;
        /* Hoy Obispo no abrió ninguna otra: su personal sigue con la de ayer sin cerrar. */
        if (sede.id === "sede-habana-vieja" && dia === 0) continue;
        const sigueAbierta = dia === 0 || abandonada;

        const id = `J-${caja.id.replace("sede-", "").replace(":caja-", "-")}-${fecha.replaceAll("-", "")}`;
        const saldos = new Map<string, number>();
        const movimientos: MovimientoDeJornada[] = [];
        const mov = (m: Omit<MovimientoDeJornada, "id" | "saldoDespues">) => {
          const despues = (saldos.get(m.currency) ?? 0) + m.amount;
          saldos.set(m.currency, despues);
          secuencia += 1;
          movimientos.push({ ...m, id: `${id}-M${String(secuencia).padStart(4, "0")}`, saldoDespues: despues });
        };

        /* La apertura cuenta contra el cierre anterior. Casi siempre cuadra; a
           veces alguien repuso o retiró fondos entre medias, y después del
           cierre sin arqueo de Obispo el conteo destapa un faltante. */
        const apertura = sembrarApertura(anterior, monedas, rnd);
        const fondeo = apertura.monedas.map((m) => ({ currency: m.currency, amount: m.contado }));
        for (const f of fondeo) {
          mov({ fechaHora: abierta.toISOString(), tipo: "entrada", concepto: "Fondeo inicial", currency: f.currency, amount: f.amount });
        }

        const fin = sigueAbierta
          ? Math.min(now.getTime(), abandonada ? instanteEnCuba(fecha, 17, 10).getTime() : now.getTime())
          : instanteEnCuba(fecha, 17, 30).getTime();
        /* Las operaciones del día: sobre todo cambios, y también pagos de
           remesas y giros enviados y pagados. Alguna no se completa y no mueve
           nada; alguna nace de una solicitud de kiosco (FR-AD-OPS-4). */
        const kioscos = kioscosDeSede(sede.id);
        const nOps = 4 + Math.floor(rnd() * 7);
        /* Toda caja tiene un ajuste hace cinco días —ya resuelto en Aprobaciones— y
           otro ayer —pendiente—; además, alguno más al azar. */
        const conAjuste = rnd() < 0.12 || dia === -5 || dia === -1;
        const kAjuste = conAjuste ? Math.floor(nOps / 2) : -1;
        for (let k = 0; k < nOps; k += 1) {
          const t = new Date(abierta.getTime() + ((fin - abierta.getTime()) * (k + 1)) / (nOps + 1));
          /* Alguna vez a lo largo del día el trabajador cuenta un cajón y lo
             ajusta: un ajuste de efectivo con su motivo, que espera el visto
             bueno del administrador (FR-AD-APR-1). */
          if (k === kAjuste) {
            const faltante = rnd() < 0.6;
            const importe = (1 + Math.floor(rnd() * 9)) * 100;
            const antes = saldos.get("CUP") ?? 0;
            if (!faltante || antes >= importe) {
              const motivo = faltante ? (rnd() < 0.7 ? "Faltante detectado" : "Error de registro") : (rnd() < 0.7 ? "Sobrante detectado" : "Otro");
              mov({
                fechaHora: new Date(t.getTime() - 60_000).toISOString(),
                tipo: faltante ? "salida" : "entrada",
                concepto: "Ajuste de efectivo",
                currency: "CUP",
                amount: faltante ? -importe : importe,
                motivo,
                saldoAntes: antes,
                ...(motivo === "Otro" ? { observaciones: "Billete de 1.000 CUP que el cliente no recogió." } : motivo === "Error de registro" ? { observaciones: "Un cambio se registró con el importe de otro." } : {}),
              });
            }
          }
          codigo += 1;
          const yy = fecha.slice(2, 4), mm = fecha.slice(5, 7), dd = fecha.slice(8, 10);
          const operationCode = `PC-${yy}${mm}${dd}-${String(codigo).padStart(6, "0")}`;
          const cliente = CLIENTES[Math.floor(rnd() * CLIENTES.length)]!;
          const base = {
            codigo: operationCode,
            fechaHora: t.toISOString(),
            cliente,
            worker: trabajador.fullName,
            caja: caja.name,
            sedeId: sede.id,
            registerId: caja.id,
            workerId: trabajador.id,
            jornadaId: id,
            ...(kioscos.length > 0 && rnd() < 0.15
              ? {
                  origenKiosco: {
                    solicitud: `KS-${yy}${mm}${dd}-${String(codigo).padStart(6, "0")}`,
                    kioscoId: kioscos[0]!.id,
                    kioscoLabel: kioscos[0]!.label,
                  },
                }
              : {}),
          };
          const cash = (currency: string, delta: number) => {
            const antes = saldos.get(currency) ?? 0;
            return {
              before: { amount: antes, currency },
              movement: { amount: Math.abs(delta), currency },
              after: { amount: antes + delta, currency },
            };
          };
          const tipo = rnd();
          const noCompleta = rnd();

          if (tipo < 0.6) {
            const divisa = monedas.filter((c) => c !== "CUP")[Math.floor(rnd() * (monedas.length - 1))] as keyof typeof TASAS;
            const unidades = 20 + Math.floor(rnd() * 30) * 10;
            const compra = rnd() < 0.6;
            const cup = unidades * (compra ? TASAS[divisa].compra : TASAS[divisa].venta);
            /* Nadie entrega lo que la caja no tiene. */
            if (!compra && (saldos.get(divisa) ?? 0) < unidades) continue;
            if (compra && (saldos.get("CUP") ?? 0) < cup) continue;
            const source = compra ? { amount: unidades, currency: divisa } : { amount: cup, currency: "CUP" };
            const destination = compra ? { amount: cup, currency: "CUP" } : { amount: unidades, currency: divisa };
            if (noCompleta < 0.05) {
              registrarOperacionSembrada({
                ...base, servicio: "Cambio de moneda", estado: "Cancelada",
                amount: { kind: "single", money: source },
              });
              continue;
            }
            const cashSnapshot = cash(destination.currency, -destination.amount);
            mov({
              fechaHora: t.toISOString(), operationCode, currency: divisa,
              tipo: compra ? "entrada" : "salida", amount: compra ? unidades : -unidades,
              concepto: compra ? `Compra de ${divisa}` : `Venta de ${divisa}`,
            });
            mov({
              fechaHora: t.toISOString(), operationCode, currency: "CUP",
              tipo: compra ? "salida" : "entrada", amount: compra ? -cup : cup,
              concepto: compra ? `Pago por compra de ${divisa}` : `Cobro por venta de ${divisa}`,
            });
            registrarOperacionSembrada({
              ...base, servicio: "Cambio de moneda", estado: "Completada",
              amount: { kind: "exchange", source, destination, appliedRate: destination.amount / source.amount, cashSnapshot },
            });
          } else if (tipo < 0.8) {
            /* El pago de una remesa: sale efectivo de la caja. */
            const enUsd = rnd() < 0.5 && monedas.includes("USD");
            const importe = enUsd ? 100 + Math.floor(rnd() * 5) * 50 : 5_000 + Math.floor(rnd() * 16) * 1_000;
            const moneda = enUsd ? "USD" : "CUP";
            const beneficiario = cliente;
            const remittance = {
              serviceId: `srv-rem-${codigo}`,
              code: `RM-${yy}${mm}${dd}-${String(codigo).padStart(6, "0")}`,
              beneficiaryName: beneficiario.nombre,
              beneficiaryIdentification: beneficiario.documentNumber,
              deliveryMethod: "pickup" as const,
              payoutAmount: importe,
              payoutCurrency: moneda,
            };
            if ((saldos.get(moneda) ?? 0) < importe || noCompleta < 0.08) {
              registrarOperacionSembrada({
                ...base, servicio: "Remesa", estado: "Rechazada",
                amount: { kind: "single", money: { amount: importe, currency: moneda } },
                remittance: { ...remittance, externalStatus: "PAYOUT_DENIED" },
              });
              continue;
            }
            const cashSnapshot = cash(moneda, -importe);
            mov({ fechaHora: t.toISOString(), operationCode, currency: moneda, tipo: "salida", amount: -importe, concepto: "Pago de remesa" });
            registrarOperacionSembrada({
              ...base, servicio: "Remesa", estado: "Completada",
              amount: { kind: "single", money: { amount: importe, currency: moneda }, cashSnapshot },
              remittance: { ...remittance, externalStatus: "COMPLETED" },
            });
          } else {
            /* Un giro: o se envía (entra efectivo) o se paga (sale). */
            const envio = tipo < 0.92;
            const importe = 2_000 + Math.floor(rnd() * 14) * 1_000;
            const b = BENEFICIARIOS[Math.floor(rnd() * BENEFICIARIOS.length)]!;
            const transfer = {
              transferAction: envio ? ("send" as const) : ("payout" as const),
              externalId: `srv-transfer-${codigo}`,
              code: `TR-${yy}${mm}${dd}-${String(codigo).padStart(6, "0")}`,
              ...(envio
                ? {
                    sender: {
                      documentType: cliente.documentType,
                      documentNumber: cliente.documentNumber,
                      firstName: cliente.nombre.split(" ")[0]!,
                      firstSurname: cliente.nombre.split(" ")[1] ?? "",
                      secondSurname: cliente.nombre.split(" ")[2] ?? "",
                      birthDate: "1985-05-12",
                      phone: cliente.telefono,
                      nationality: cliente.nacionalidad,
                    },
                  }
                : {}),
              receiverName: envio ? b.nombre : cliente.nombre,
              receiverIdentification: envio ? b.ci : cliente.documentNumber,
              receiverProvinceCode: b.provincia[0],
              receiverProvinceLabel: b.provincia[1],
              receiverMunicipalityCode: b.municipio[0],
              receiverMunicipalityLabel: b.municipio[1],
              deliveryMethod: "pickup" as const,
              senderCurrency: "CUP",
              deliveryAmount: importe,
            };
            if ((!envio && (saldos.get("CUP") ?? 0) < importe) || noCompleta < 0.1) {
              registrarOperacionSembrada({
                ...base, servicio: "Giros", estado: "Fallida",
                amount: { kind: "single", money: { amount: importe, currency: "CUP" } },
                transfer,
              });
              continue;
            }
            const cashSnapshot = cash("CUP", envio ? importe : -importe);
            mov({
              fechaHora: t.toISOString(), operationCode, currency: "CUP",
              tipo: envio ? "entrada" : "salida", amount: envio ? importe : -importe,
              concepto: envio ? "Envío de giro" : "Pago de giro",
            });
            registrarOperacionSembrada({
              ...base, servicio: "Giros", estado: "Completada",
              amount: { kind: "single", money: { amount: importe, currency: "CUP" }, cashSnapshot },
              transfer: { ...transfer, externalStatus: envio ? "READY" : "COMPLETED" },
            });
          }
        }

        const jornada: Jornada = {
          id,
          sedeId: sede.id,
          registerId: caja.id,
          cajaNombre: caja.name,
          equipo: equipo ? { id: equipo.id, label: equipo.label } : null,
          workerId: trabajador.id,
          workerName: trabajador.fullName,
          openedAt: abierta.toISOString(),
          closedAt: null,
          estado: "abierta",
          fondeo,
          apertura,
          movimientos,
          sesionActiva: dia === 0 && indiceCaja === 0,
        };

        if (!sigueAbierta) {
          const cierre = new Date(fin);
          /* Una cerrada a la fuerza en la historia de Obispo, para que se vea
             cómo se distingue de una cerrada con arqueo (FR-AD-JOR-14). */
          if (sede.id === "sede-habana-vieja" && caja.id.endsWith("caja-03") && dia === -4) {
            jornada.estado = "forzada";
            jornada.closedAt = cierre.toISOString();
            jornada.saldosFinales = [...saldos].map(([currency, amount]) => ({ currency, amount }));
            jornada.cierreForzado = {
              at: cierre.toISOString(),
              por: "Marta Sánchez",
              motivo: "El trabajador salió enfermo antes del cierre y la caja quedó abierta.",
            };
          } else {
            const conDiferencia = rnd() < 0.25;
            const monedasArqueo: ArqueoMoneda[] = [...saldos].map(([currency, esperado]) => {
              const diferencia = conDiferencia && currency === "CUP" ? (rnd() < 0.5 ? -1 : 1) * (100 + Math.floor(rnd() * 9) * 100) : 0;
              return {
                currency,
                esperado,
                contado: esperado + diferencia,
                diferencia,
                ...(diferencia !== 0 ? { motivo: diferencia < 0 ? "Faltante detectado" : "Sobrante detectado" } : {}),
              };
            });
            for (const a of monedasArqueo.filter((x) => x.diferencia !== 0)) {
              const antes = saldos.get(a.currency) ?? 0;
              mov({
                fechaHora: cierre.toISOString(), tipo: a.diferencia > 0 ? "entrada" : "salida",
                concepto: "Ajuste de cierre", currency: a.currency, amount: a.diferencia,
                motivo: a.motivo, saldoAntes: antes,
              });
            }
            jornada.estado = "cerrada";
            jornada.closedAt = cierre.toISOString();
            jornada.arqueo = { confirmadoAt: cierre.toISOString(), monedas: monedasArqueo };
            jornada.saldosFinales = monedasArqueo.map((a) => ({ currency: a.currency, amount: a.contado }));
          }
        }
        out.push(jornada);
        anterior = jornada;
      }
    });
  }
  return out;
}

function sembrarApertura(
  anterior: Jornada | null,
  monedas: readonly string[],
  rnd: () => number,
): AperturaJornada {
  if (!anterior || !anterior.saldosFinales) {
    /* La primera de la historia sembrada: no hay cierre con el que comparar. */
    return {
      cierreAnterior: null,
      monedas: monedas.map((c) => {
        const contado = Math.round((FONDEO[c] ?? 0) * (0.8 + rnd() * 0.4));
        return { currency: c, dejado: null, contado, diferencia: contado };
      }),
    };
  }
  const dejado = new Map(anterior.saldosFinales.map((s) => [s.currency, s.amount]));
  const tras = anterior.estado === "forzada";
  const r = rnd();
  const cambio: { currency: string; diferencia: number; motivo: MotivoDeApertura; observaciones?: string } | null = tras
    ? { currency: "CUP", diferencia: -2_000, motivo: "Faltante detectado", observaciones: "Contado al abrir. La caja tuvo un cierre forzado el día anterior." }
    : r < 0.12
      ? { currency: "CUP", diferencia: 40_000, motivo: "Reposición de fondos", observaciones: "Entregados por la administración de la sede." }
      : r < 0.18
        ? { currency: "USD", diferencia: -(300 + Math.floor(rnd() * 3) * 100), motivo: "Retiro de fondos", observaciones: "Depositados en el banco." }
        : null;

  return {
    cierreAnterior: {
      jornadaId: anterior.id,
      closedAt: anterior.closedAt!,
      workerName: anterior.workerName,
      sinArqueo: tras,
    },
    monedas: monedas.map((c) => {
      const d = dejado.get(c) ?? 0;
      const delta = cambio && cambio.currency === c && d + cambio.diferencia >= 0 ? cambio.diferencia : 0;
      return {
        currency: c,
        dejado: d,
        contado: d + delta,
        diferencia: delta,
        ...(delta !== 0 && cambio ? { motivo: cambio.motivo, ...(cambio.observaciones ? { observaciones: cambio.observaciones } : {}) } : {}),
      };
    }),
  };
}

/**
 * La versión de la siembra. El almacén sobrevive a la recarga en caliente del
 * servidor de desarrollo; si la siembra cambió, el que quedó en memoria es de
 * la anterior y se descarta junto con lo que se deriva de él —operaciones y
 * solicitudes—, para no mezclar datos de dos siembras.
 */
const VERSION_DE_SIEMBRA = "2026-10-20.2";

const ALMACEN = globalThis as typeof globalThis & {
  __puntocashJornadas?: Jornada[];
  __puntocashSiembraJornadas?: string;
  __puntocashOperaciones?: unknown[];
  __puntocashSolicitudes?: unknown[];
};
if (ALMACEN.__puntocashSiembraJornadas !== VERSION_DE_SIEMBRA) {
  delete ALMACEN.__puntocashJornadas;
  ALMACEN.__puntocashOperaciones?.splice(0);
  delete ALMACEN.__puntocashSolicitudes;
  ALMACEN.__puntocashSiembraJornadas = VERSION_DE_SIEMBRA;
}
const jornadas: Jornada[] = (ALMACEN.__puntocashJornadas ??= sembrar(new Date()));

/* -------------------------------------------------------------------------
 * Lecturas
 * ---------------------------------------------------------------------- */

export function jornadasDeSede(sedeId: string): readonly Jornada[] {
  return jornadas.filter((j) => j.sedeId === sedeId);
}

export function jornadaPorId(id: string): Jornada | null {
  return jornadas.find((j) => j.id === id) ?? null;
}

/** La jornada abierta de una caja, o `null`. */
export function jornadaAbiertaDeCaja(registerId: string): Jornada | null {
  return jornadas.find((j) => j.registerId === registerId && j.estado === "abierta") ?? null;
}

/** La jornada abierta de un trabajador, o `null`. */
export function jornadaAbiertaDeTrabajador(workerId: string): Jornada | null {
  return jornadas.find((j) => j.workerId === workerId && j.estado === "abierta") ?? null;
}

/** Saldo por moneda: el guardado si está cerrada; el de libros si sigue abierta. */
export function saldosDe(j: Jornada): readonly { currency: string; amount: number }[] {
  if (j.saldosFinales) return j.saldosFinales;
  const saldos = new Map<string, number>();
  for (const m of j.movimientos) saldos.set(m.currency, m.saldoDespues);
  return [...saldos].map(([currency, amount]) => ({ currency, amount }));
}

/** Cuántas operaciones con cliente tiene: códigos distintos, no movimientos. */
export function operacionesDe(j: Jornada): number {
  return new Set(j.movimientos.filter((m) => m.operationCode).map((m) => m.operationCode)).size;
}

/** Las monedas en las que lo contado al abrir no coincide con lo dejado al cerrar. */
export function diferenciasDeApertura(j: Jornada): readonly AperturaMoneda[] {
  if (!j.apertura.cierreAnterior) return [];
  return j.apertura.monedas.filter((m) => m.diferencia !== 0);
}

/**
 * Lo que pasó con una jornada cerrada sin arqueo — **FR-AD-JOR-20**. Nadie
 * contó el efectivo al cerrarla, así que el primer conteo es la apertura
 * siguiente de esa caja. Hasta que la haya, está pendiente de conciliar.
 */
export type Conciliacion =
  | { estado: "pendiente" }
  | { estado: "contada"; jornada: Jornada; diferencias: readonly AperturaMoneda[] };

export function conciliacionDe(j: Jornada): Conciliacion | null {
  if (j.estado !== "forzada") return null;
  const siguiente = jornadas.find((x) => x.apertura.cierreAnterior?.jornadaId === j.id);
  return siguiente
    ? { estado: "contada", jornada: siguiente, diferencias: diferenciasDeApertura(siguiente) }
    : { estado: "pendiente" };
}

/* -------------------------------------------------------------------------
 * El día de una sede — lo que leen Inicio, Sedes, Cajas, Equipos y la ficha
 * de un trabajador
 * ---------------------------------------------------------------------- */

/** «AAAA-MM-DD» del instante, en hora de Cuba. */
export function diaEnCuba(instante: string | Date): string {
  return hoyEnCuba(typeof instante === "string" ? new Date(instante) : instante);
}

export interface CajaDelDia {
  registerId: string;
  nombre: string;
  /** Su jornada abierta, si la tiene. */
  abierta: Jornada | null;
  /** La última que se cerró, para decir desde cuándo está cerrada. */
  ultimaCerrada: Jornada | null;
}

/**
 * Una sede tiene varias cajas y cada una su jornada, así que «el estado de la
 * jornada» de una sede no es uno: se cuentan las cajas (**FR-AD-HOME-6**,
 * **FR-AD-SEDE-1**, **FR-AD-SEDE-10**).
 */
export interface DiaDeSede {
  cajas: readonly CajaDelDia[];
  abiertas: number;
  /** Quién tiene una jornada abierta ahora, sin repetir. */
  enTurno: readonly { workerId: string; nombre: string }[];
  /** La primera apertura de hoy, si alguna caja abrió hoy. */
  primeraApertura: string | null;
  /** Operaciones con cliente registradas hoy, en cualquier jornada de la sede. */
  operacionesHoy: number;
}

export function diaDeSede(sedeId: string, now: Date = new Date()): DiaDeSede {
  const hoy = diaEnCuba(now);
  const deLaSede = jornadas.filter((j) => j.sedeId === sedeId);
  const cajas = registersOf(sedeId).map((caja): CajaDelDia => {
    const propias = deLaSede.filter((j) => j.registerId === caja.id);
    const cerradas = propias.filter((j) => j.closedAt).sort((a, b) => b.closedAt!.localeCompare(a.closedAt!));
    return {
      registerId: caja.id,
      nombre: caja.name,
      abierta: propias.find((j) => j.estado === "abierta") ?? null,
      ultimaCerrada: cerradas[0] ?? null,
    };
  });
  const abiertas = cajas.map((c) => c.abierta).filter((j): j is Jornada => j !== null);
  const enTurno = new Map(abiertas.map((j) => [j.workerId, j.workerName]));
  const aperturasDeHoy = deLaSede.map((j) => j.openedAt).filter((t) => diaEnCuba(t) === hoy).sort();
  const operaciones = new Set(
    deLaSede.flatMap((j) =>
      j.movimientos.filter((m) => m.operationCode && diaEnCuba(m.fechaHora) === hoy).map((m) => m.operationCode),
    ),
  );
  return {
    cajas,
    abiertas: abiertas.length,
    enTurno: [...enTurno].map(([workerId, nombre]) => ({ workerId, nombre })),
    primeraApertura: aperturasDeHoy[0] ?? null,
    operacionesHoy: operaciones.size,
  };
}

/** Las jornadas de un trabajador, de la más reciente a la más antigua. */
export function jornadasDeTrabajador(workerId: string): readonly Jornada[] {
  return jornadas.filter((j) => j.workerId === workerId).sort((a, b) => b.openedAt.localeCompare(a.openedAt));
}

/**
 * Las diferencias que Inicio señala — **FR-AD-HOME-2**: las de **hoy** —un
 * cierre con diferencia, o una apertura que encontró un faltante o un
 * sobrante— y los cierres forzados que siguen sin contar, sean de cuando sean.
 * Una reposición o un retiro de fondos no es una diferencia que atender:
 * alguien metió o sacó dinero y lo dijo.
 */
export interface DiferenciaDelDia {
  jornada: Jornada;
  momento: "cierre" | "apertura" | "sin-conciliar";
  monedas: readonly { currency: string; diferencia: number }[];
}

export function diferenciasDelDia(sedeId: string, now: Date = new Date()): readonly DiferenciaDelDia[] {
  const hoy = diaEnCuba(now);
  const out: DiferenciaDelDia[] = [];
  for (const j of jornadas.filter((x) => x.sedeId === sedeId)) {
    if (j.arqueo && diaEnCuba(j.arqueo.confirmadoAt) === hoy) {
      const monedas = j.arqueo.monedas.filter((m) => m.diferencia !== 0);
      if (monedas.length > 0) out.push({ jornada: j, momento: "cierre", monedas });
    }
    if (j.apertura.cierreAnterior && diaEnCuba(j.openedAt) === hoy) {
      const monedas = j.apertura.monedas.filter(
        (m) => m.diferencia !== 0 && m.motivo !== "Reposición de fondos" && m.motivo !== "Retiro de fondos",
      );
      if (monedas.length > 0) out.push({ jornada: j, momento: "apertura", monedas });
    }
    if (conciliacionDe(j)?.estado === "pendiente") out.push({ jornada: j, momento: "sin-conciliar", monedas: [] });
  }
  return out;
}

/* -------------------------------------------------------------------------
 * Forzar cierre — FR-AD-JOR-7 a FR-AD-JOR-15
 * ---------------------------------------------------------------------- */

export type ForzarCierreDenial = ScopeDenial | "no-encontrada" | "ya-cerrada" | "motivo-corto";

export function forzarCierre(
  scope: Scope,
  id: string,
  motivo: string,
  autor: string,
  now = new Date(),
): { ok: true; value: Jornada } | { ok: false; reason: ForzarCierreDenial } {
  const operator = requireOperatorScope(scope);
  if (!operator.ok) return { ok: false, reason: operator.reason };
  const j = jornadaPorId(id);
  if (!j || !estaEnAlcance(scope, j.sedeId) || !findRegisterById(j.registerId)) {
    return { ok: false, reason: "no-encontrada" };
  }
  /* FR-AD-JOR-11: si el trabajador la cerró mientras tanto, no se pisa. */
  if (j.estado !== "abierta") return { ok: false, reason: "ya-cerrada" };
  if (motivo.trim().length < MOTIVO_MIN) return { ok: false, reason: "motivo-corto" };

  /* FR-AD-JOR-10 y 12: sin arqueo, el saldo final es el de libros, y no se
     toca ningún movimiento: se añade el hecho del cierre. */
  j.saldosFinales = saldosDe(j);
  j.estado = "forzada";
  j.closedAt = now.toISOString();
  j.cierreForzado = { at: now.toISOString(), por: autor, motivo: motivo.trim() };
  j.sesionActiva = false;
  return { ok: true, value: j };
}
