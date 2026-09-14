import { expect, test } from "@playwright/test";

import {
  CAJA_BALANCES,
  CAJA_MOVEMENTS,
  abrirJornada,
  cerrarJornada,
  hasOpenJornada,
} from "@/features/caja/caja-data";
import { OPERATIONS } from "@/features/operations/operations-history";
import { transferProvider } from "@/features/transfers/transfer-provider";
import { confirmGiroPayout } from "@/app/worker/(app)/nueva-operacion/giros/cobrar/confirm-payout";

/**
 * Domain-level tests for "Giros" — Cobrar giro, run
 * directly against the provider and payout modules in Node (no browser).
 *
 * These give stronger guarantees than the browser suite for the two things
 * that matter most here: the lookup boundary really is code-only (a
 * reference hit, a remittance and an unknown code are indistinguishable from
 * outside), and the payout really does commit nothing locally unless the
 * external completion succeeded.
 */

/**
 * Guarantees the precondition this block needs, instead of assuming this spec
 * is the first to touch the shared domain module: other domain specs run in
 * the same worker process and may leave a jornada open behind them.
 */
function ensureNoOpenJornada() {
  if (!hasOpenJornada()) return;
  cerrarJornada({
    worker: "Juan Pérez",
    timestamp: new Date("2026-08-21T17:00:00"),
    currencies: CAJA_BALANCES.map((balance) => ({
      currency: balance.currency,
      counted: balance.amount,
    })),
  });
}

async function mustFind(code: string) {
  const lookup = await transferProvider.findTransferByCode(code);
  if (!lookup.ok) throw new Error(`Expected ${code} to be found in this fixture`);
  return lookup.transfer;
}

test.describe("transferProvider.findTransferByCode — code-only lookup", () => {
  test("finds a transfer by its exact code", async () => {
    const lookup = await transferProvider.findTransferByCode("TR-260901-000245");
    expect(lookup.ok).toBe(true);
    if (!lookup.ok) return;
    expect(lookup.transfer.code).toBe("TR-260901-000245");
    expect(lookup.transfer.type).toBe("transfer");
    expect(lookup.transfer.status).toBe("READY");
  });

  test("is case- and whitespace-insensitive on the code itself", async () => {
    const lookup = await transferProvider.findTransferByCode("  tr-260901-000245 ");
    expect(lookup.ok).toBe(true);
  });

  test("rejects a match that came back only through Service.reference", async () => {
    // REF-GIRO-245 IS the reference of an existing, READY giro. A reference
    // is not a payout credential, so this must be indistinguishable from a
    // code that does not exist at all.
    const lookup = await transferProvider.findTransferByCode("REF-GIRO-245");
    expect(lookup.ok).toBe(false);
    if (lookup.ok) return;
    expect(lookup.reason).toBe("not-found");
  });

  test("rejects a service that is not a transfer", async () => {
    const lookup = await transferProvider.findTransferByCode("TR-REMESA-01");
    expect(lookup.ok).toBe(false);
    if (lookup.ok) return;
    expect(lookup.reason).toBe("not-found");
  });

  test("rejects an unknown code with the very same reason", async () => {
    const lookup = await transferProvider.findTransferByCode("TR-260901-999999");
    expect(lookup.ok).toBe(false);
    if (lookup.ok) return;
    expect(lookup.reason).toBe("not-found");
  });

  test("preserves the raw API enums — no Spanish labels cross the boundary", async () => {
    const transfer = await mustFind("TR-TRANSITO-01");
    expect(transfer.status).toBe("IN_TRANSIT");
    expect(transfer.deliveryMethod).toBe("pickup");
  });

  test("returns province and municipality as API codes, not labels", async () => {
    const transfer = await mustFind("TR-260901-000245");
    expect(transfer.receiverProvince).toBe("LH");
    expect(transfer.receiverMunicipality).toBe("PDR");
  });
});

test.describe("transferProvider.completeTransfer", () => {
  test("404s on an unknown service id", async () => {
    const result = await transferProvider.completeTransfer("srv-does-not-exist");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("not-found");
  });

  test("409s on a giro that is not READY", async () => {
    const transfer = await mustFind("TR-COMPLETADO-01");
    const result = await transferProvider.completeTransfer(transfer.id);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("conflict");
  });
});

// One serial block for everything that mutates the shared Caja/operations
// modules, so the "no jornada yet" assertion stays meaningful.
test.describe.serial("Cobrar giro — payout (stateful)", () => {
  test("refuses before any jornada is open, and changes nothing", async () => {
    ensureNoOpenJornada();
    expect(hasOpenJornada()).toBe(false);
    const transfer = await mustFind("TR-260901-000245");
    const movementsBefore = CAJA_MOVEMENTS.length;
    const operationsBefore = OPERATIONS.length;

    const outcome = await confirmGiroPayout({ transfer, worker: "Juan Pérez" });

    expect(outcome.ok).toBe(false);
    expect(CAJA_MOVEMENTS.length).toBe(movementsBefore);
    expect(OPERATIONS.length).toBe(operationsBefore);
    // The external service was never asked to complete anything either.
    expect((await mustFind("TR-260901-000245")).status).toBe("READY");
  });

  test("refuses a currency the current Caja does not have enabled", async () => {
    abrirJornada({
      register: "Caja 03",
      worker: "Juan Pérez",
      openedAt: new Date("2026-09-01T08:00:00"),
      fondos: [
        { currency: "CUP", amount: 50_000 },
        { currency: "USD", amount: 4_250 },
        { currency: "EUR", amount: 1_185 },
      ],
    });

    const transfer = await mustFind("TR-MONEDA-NO");
    const movementsBefore = CAJA_MOVEMENTS.length;

    const outcome = await confirmGiroPayout({ transfer, worker: "Juan Pérez" });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.message).toContain("CHF");
    expect(CAJA_MOVEMENTS.length).toBe(movementsBefore);
    expect((await mustFind("TR-MONEDA-NO")).status).toBe("READY");
  });

  test("refuses when the Caja balance does not cover the payout", async () => {
    const transfer = await mustFind("TR-SIN-FONDOS");
    const before = CAJA_BALANCES.find((b) => b.currency === "CUP")!.amount;

    const outcome = await confirmGiroPayout({ transfer, worker: "Juan Pérez" });

    expect(outcome.ok).toBe(false);
    expect(CAJA_BALANCES.find((b) => b.currency === "CUP")!.amount).toBe(before);
    expect((await mustFind("TR-SIN-FONDOS")).status).toBe("READY");
  });

  test("refuses a giro that is not READY", async () => {
    const transfer = await mustFind("TR-TRANSITO-01");
    const movementsBefore = CAJA_MOVEMENTS.length;

    const outcome = await confirmGiroPayout({ transfer, worker: "Juan Pérez" });

    expect(outcome.ok).toBe(false);
    expect(CAJA_MOVEMENTS.length).toBe(movementsBefore);
  });

  test("an external 409 leaves no operation, no movement and no balance change", async () => {
    const transfer = await mustFind("TR-CONFLICTO-09");
    const before = CAJA_BALANCES.find((b) => b.currency === "CUP")!.amount;
    const movementsBefore = CAJA_MOVEMENTS.length;
    const operationsBefore = OPERATIONS.length;

    const outcome = await confirmGiroPayout({ transfer, worker: "Juan Pérez" });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.message).toContain("ya no está disponible");
    expect(CAJA_BALANCES.find((b) => b.currency === "CUP")!.amount).toBe(before);
    expect(CAJA_MOVEMENTS.length).toBe(movementsBefore);
    expect(OPERATIONS.length).toBe(operationsBefore);
  });

  test("an external failure leaves no operation, no movement and no balance change", async () => {
    const transfer = await mustFind("TR-FALLA-EXT");
    const before = CAJA_BALANCES.find((b) => b.currency === "CUP")!.amount;
    const movementsBefore = CAJA_MOVEMENTS.length;
    const operationsBefore = OPERATIONS.length;

    const outcome = await confirmGiroPayout({ transfer, worker: "Juan Pérez" });

    expect(outcome.ok).toBe(false);
    expect(CAJA_BALANCES.find((b) => b.currency === "CUP")!.amount).toBe(before);
    expect(CAJA_MOVEMENTS.length).toBe(movementsBefore);
    expect(OPERATIONS.length).toBe(operationsBefore);
    expect((await mustFind("TR-FALLA-EXT")).status).toBe("READY");
  });

  test("a successful payout commits exactly one Salida, one operation and the balance", async () => {
    const transfer = await mustFind("TR-260901-000245");
    const before = CAJA_BALANCES.find((b) => b.currency === "CUP")!.amount;
    const movementsBefore = CAJA_MOVEMENTS.length;
    const operationsBefore = OPERATIONS.length;

    const outcome = await confirmGiroPayout({ transfer, worker: "Juan Pérez" });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const { completed } = outcome;

    expect(completed.operationCode).toMatch(/^PC-\d{6}-\d{6}$/);
    expect(completed.giroCode).toBe("TR-260901-000245");
    expect(completed.payoutAmount).toBe(2_500);
    // The raw API enum, never the Spanish label.
    expect(completed.externalStatus).toBe("COMPLETED");

    expect(CAJA_BALANCES.find((b) => b.currency === "CUP")!.amount).toBe(before - 2_500);
    expect(CAJA_MOVEMENTS.length).toBe(movementsBefore + 1);
    expect(OPERATIONS.length).toBe(operationsBefore + 1);

    const movement = CAJA_MOVEMENTS[0]!;
    expect(movement.tipo).toBe("salida");
    expect(movement.currency).toBe("CUP");
    expect(movement.amount).toBe(-2_500);
    expect(movement.concepto).toBe("Giros");
    expect(movement.operationCode).toBe(completed.operationCode);
    expect(movement.saldoAntes).toBe(before);
    expect(movement.saldoDespues).toBe(before - 2_500);
  });

  test("the payout operation records the beneficiary as the client and discriminates itself", async () => {
    const operation = OPERATIONS[0]!;
    expect(operation.servicio).toBe("Giros");
    // The beneficiary — not the sender — is the client of a payout.
    expect(operation.cliente.nombre).toBe("María Pérez García");
    expect(operation.cliente.documentNumber).toBe("85010112345");

    expect(operation.transfer?.transferAction).toBe("payout");
    expect(operation.transfer?.code).toBe("TR-260901-000245");
    expect(operation.transfer?.sender).toBeUndefined();
    // Raw enums plus the labels resolved at the time (§ historical snapshot).
    expect(operation.transfer?.deliveryMethod).toBe("pickup");
    expect(operation.transfer?.externalStatus).toBe("COMPLETED");
    expect(operation.transfer?.receiverProvinceCode).toBe("LH");
    expect(operation.transfer?.receiverProvinceLabel).toBe("La Habana");
    expect(operation.transfer?.receiverMunicipalityCode).toBe("PDR");
    expect(operation.transfer?.receiverMunicipalityLabel).toBe("Plaza de la Revolución");
  });

  test("a second payout of the same giro is refused — COMPLETED never pays twice", async () => {
    // The giro is COMPLETED now, so it is no longer payable: the lookup still
    // finds it (the code is valid), but nothing can be delivered against it.
    const transfer = await mustFind("TR-260901-000245");
    expect(transfer.status).toBe("COMPLETED");

    const before = CAJA_BALANCES.find((b) => b.currency === "CUP")!.amount;
    const movementsBefore = CAJA_MOVEMENTS.length;

    const outcome = await confirmGiroPayout({ transfer, worker: "Juan Pérez" });

    expect(outcome.ok).toBe(false);
    expect(CAJA_BALANCES.find((b) => b.currency === "CUP")!.amount).toBe(before);
    expect(CAJA_MOVEMENTS.length).toBe(movementsBefore);
  });

  test("a giro registered by Enviar giro becomes payable by its own code", async () => {
    const created = await transferProvider.createTransfer({
      receiverName: "Ana Beltrán Soto",
      receiverPhone: "+53 5 111 2222",
      receiverAddress: "Calle 10 #20",
      receiverProvince: "MTZ",
      receiverMunicipality: "CRD",
      deliveryMethod: "pickup",
      senderCurrency: "CUP",
      deliveryAmount: 100,
      receiverIdentification: "90010112345",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const lookup = await transferProvider.findTransferByCode(created.transfer.code);
    expect(lookup.ok).toBe(true);
    if (!lookup.ok) return;
    expect(lookup.transfer.status).toBe("READY");
    expect(lookup.transfer.receiverName).toBe("Ana Beltrán Soto");
    expect(lookup.transfer.payoutCurrency).toBe("CUP");
  });
});
