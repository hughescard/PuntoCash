import { expect, test } from "@playwright/test";

import {
  CAJA_BALANCES,
  CAJA_MOVEMENTS,
  abrirJornada,
  cerrarJornada,
  hasOpenJornada,
  registrarEntradaComercial,
} from "@/features/caja/caja-data";
import { confirmGiro } from "@/app/worker/(app)/nueva-operacion/giros/enviar/confirm-giro";
import {
  hasAnyError,
  validateGiroForm,
} from "@/app/worker/(app)/nueva-operacion/giros/enviar/giro-validation";
import { EMPTY_BENEFICIARY, EMPTY_SENDER, type GiroFormValues } from "@/app/worker/(app)/nueva-operacion/giros/enviar/giro-types";

/**
 * Domain-level tests for "Giros" — Enviar giro, run
 * directly against the domain/provider modules in Node (no browser). This
 * gives stronger guarantees than the browser suite for the exact order of
 * operations at confirmation (§41) and for the commercial cash-in itself.
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

function openDomainJornada() {
  abrirJornada({
    register: "Caja 03",
    worker: "Juan Pérez",
    openedAt: new Date("2026-08-21T08:00:00"),
    fondos: [
      { currency: "CUP", amount: 200_000 },
      { currency: "USD", amount: 4_250 },
      { currency: "EUR", amount: 1_185 },
    ],
  });
}

function validGiroValues(overrides: Partial<GiroFormValues> = {}): GiroFormValues {
  return {
    sender: {
      ...EMPTY_SENDER,
      documentNumber: "90010112345",
      firstName: "Carlos",
      firstSurname: "Pérez",
      secondSurname: "Rodríguez",
      birthDate: "1985-01-01",
      phone: "+53 5 123 4567",
    },
    beneficiary: {
      ...EMPTY_BENEFICIARY,
      receiverName: "María López García",
      receiverEmail: "maria.lopez@example.com",
      receiverPhone: "+53 5 678 1234",
      receiverAddress: "Calle 23 #456",
      receiverProvince: "LH",
      receiverMunicipality: "PDR",
      receiverIdentification: "85010112345",
    },
    giro: { senderCurrency: "EUR", amountInput: "500" },
    ...overrides,
  };
}

// One serial block for everything that touches the shared, mutable
// domain module — `test.describe.serial` only orders tests WITHIN a block,
// so every stateful test lives in this single block to keep the "no open
// jornada yet" assertion meaningful regardless of worker scheduling.
test.describe.serial("Giros — domain (stateful)", () => {
  test("confirmGiro rejects when there is no open jornada, before touching the provider", async () => {
    ensureNoOpenJornada();
    expect(hasOpenJornada()).toBe(false);
    const outcome = await confirmGiro({ draft: mustDraft(validGiroValues()), worker: "Juan Pérez" });
    expect(outcome.ok).toBe(false);
  });

  test("adds cash without a funds check and links the movement to the given operationCode", () => {
    openDomainJornada();
    const before = CAJA_BALANCES.find((b) => b.currency === "EUR")!.amount;

    const outcome = registrarEntradaComercial({
      operationCode: "PC-TEST-000001",
      concepto: "Giros",
      currency: "EUR",
      amount: 500,
      timestamp: new Date("2026-08-21T10:00:00"),
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.saldoAntes).toBe(before);
    expect(outcome.saldoDespues).toBe(before + 500);
    expect(outcome.movement.tipo).toBe("entrada");
    expect(outcome.movement.operationCode).toBe("PC-TEST-000001");
    expect(outcome.movement.amount).toBe(500);
    expect(CAJA_BALANCES.find((b) => b.currency === "EUR")!.amount).toBe(before + 500);
  });

  test("still succeeds at a 0,00 balance — this is an Entrada, not a Salida", () => {
    const before = CAJA_BALANCES.find((b) => b.currency === "GBP")?.amount ?? 0;
    const outcome = registrarEntradaComercial({
      operationCode: "PC-TEST-000002",
      concepto: "Giros",
      currency: "GBP",
      amount: 100,
      timestamp: new Date("2026-08-21T10:05:00"),
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.saldoAntes).toBe(before);
  });

  test("rejects a currency that is not enabled in Caja", () => {
    const outcome = registrarEntradaComercial({
      operationCode: "PC-TEST-000003",
      concepto: "Giros",
      currency: "JPY",
      amount: 100,
      timestamp: new Date(),
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("moneda-no-habilitada");
  });

  test("confirmGiro on external success: creates exactly one commercial Entrada, one operation, and returns the external code", async () => {
    const before = CAJA_BALANCES.find((b) => b.currency === "EUR")!.amount;
    const movementCountBefore = CAJA_MOVEMENTS.length;

    const outcome = await confirmGiro({ draft: mustDraft(validGiroValues()), worker: "Juan Pérez" });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.completed.giroCode).toMatch(/^TR-/);
    expect(outcome.completed.operationCode).toMatch(/^PC-/);
    expect(outcome.completed.deliveryAmount).toBe(500);

    expect(CAJA_BALANCES.find((b) => b.currency === "EUR")!.amount).toBe(before + 500);
    expect(CAJA_MOVEMENTS.length).toBe(movementCountBefore + 1);

    const movement = CAJA_MOVEMENTS[0]!;
    expect(movement.tipo).toBe("entrada");
    expect(movement.currency).toBe("EUR");
    expect(movement.amount).toBe(500);
    expect(movement.operationCode).toBe(outcome.completed.operationCode);
  });

  test("external failure ('Falla Externa') creates no operation, no movement, no balance change", async () => {
    const before = CAJA_BALANCES.find((b) => b.currency === "EUR")!.amount;
    const movementCountBefore = CAJA_MOVEMENTS.length;

    const outcome = await confirmGiro({
      draft: mustDraft(validGiroValues({ beneficiary: { ...validGiroValues().beneficiary, receiverName: "Falla Externa" } })),
      worker: "Juan Pérez",
    });

    expect(outcome.ok).toBe(false);
    expect(CAJA_BALANCES.find((b) => b.currency === "EUR")!.amount).toBe(before);
    expect(CAJA_MOVEMENTS.length).toBe(movementCountBefore);
  });
});

function mustDraft(values: GiroFormValues) {
  const { draft } = validateGiroForm(values, CAJA_BALANCES.map((b) => b.currency));
  if (!draft) throw new Error("Expected a valid draft in this fixture");
  return draft;
}

test.describe("validateGiroForm — pure validation", () => {
  test("accepts a fully valid form and builds a draft", () => {
    const { errors, draft } = validateGiroForm(validGiroValues(), ["EUR", "USD", "CUP", "GBP"]);
    expect(hasAnyError(errors)).toBe(false);
    expect(draft).not.toBeNull();
  });

  test("rejects a missing Segundo apellido", () => {
    const values = validGiroValues({ sender: { ...validGiroValues().sender, secondSurname: "" } });
    const { errors, draft } = validateGiroForm(values, ["EUR"]);
    expect(errors.sender.secondSurname).toBeTruthy();
    expect(draft).toBeNull();
  });

  test("rejects an invalid beneficiary email", () => {
    const values = validGiroValues({ beneficiary: { ...validGiroValues().beneficiary, receiverEmail: "not-an-email" } });
    const { errors } = validateGiroForm(values, ["EUR"]);
    expect(errors.beneficiary.receiverEmail).toBeTruthy();
  });

  test("accepts a blank beneficiary email — it is optional", () => {
    const values = validGiroValues({ beneficiary: { ...validGiroValues().beneficiary, receiverEmail: "" } });
    const { errors, draft } = validateGiroForm(values, ["EUR"]);
    expect(errors.beneficiary.receiverEmail).toBeUndefined();
    expect(draft).not.toBeNull();
  });

  test("rejects a currency that is not in the enabled list", () => {
    const values = validGiroValues({ giro: { senderCurrency: "JPY", amountInput: "100" } });
    const { errors } = validateGiroForm(values, ["EUR", "USD"]);
    expect(errors.giro.senderCurrency).toBeTruthy();
  });

  test("rejects a municipality that does not belong to the selected province", () => {
    const values = validGiroValues({
      beneficiary: { ...validGiroValues().beneficiary, receiverProvince: "LH", receiverMunicipality: "MTZ-C" },
    });
    const { errors } = validateGiroForm(values, ["EUR"]);
    expect(errors.beneficiary.receiverMunicipality).toBeTruthy();
  });

  test("rejects a non-positive amount", () => {
    const values = validGiroValues({ giro: { senderCurrency: "EUR", amountInput: "0" } });
    const { errors } = validateGiroForm(values, ["EUR"]);
    expect(errors.giro.amount).toBeTruthy();
  });
});
