import { test, expect } from "@playwright/test";

import {
  CAJA_BALANCES,
  ajustarEfectivo,
  getValidAdjustmentReasons,
  isReasonCompatibleWithDifference,
} from "@/features/caja/caja-data";

/**
 * Domain-level tests for the sign ↔ reason consistency rule, run directly
 * against `src/features/caja/caja-data.ts` in Node (no browser, no `page`
 * fixture) — this is a separate module instance from the one the browser
 * tests exercise through the running dev server, so it never shares mutable
 * state with them. Its purpose is to prove the guard exists at the domain
 * boundary itself, not only through the UI's own Select filtering and reset.
 */

test.describe("isReasonCompatibleWithDifference / getValidAdjustmentReasons (pure)", () => {
  test("rejects Sobrante detectado for a negative difference", () => {
    expect(isReasonCompatibleWithDifference("Sobrante detectado", -1)).toBe(false);
  });

  test("rejects Faltante detectado for a positive difference", () => {
    expect(isReasonCompatibleWithDifference("Faltante detectado", 1)).toBe(false);
  });

  test("accepts Faltante detectado for a negative difference", () => {
    expect(isReasonCompatibleWithDifference("Faltante detectado", -1)).toBe(true);
  });

  test("accepts Sobrante detectado for a positive difference", () => {
    expect(isReasonCompatibleWithDifference("Sobrante detectado", 1)).toBe(true);
  });

  test("Error de registro and Otro are accepted for either sign", () => {
    for (const motivo of ["Error de registro", "Otro"] as const) {
      expect(isReasonCompatibleWithDifference(motivo, -1)).toBe(true);
      expect(isReasonCompatibleWithDifference(motivo, 1)).toBe(true);
    }
  });

  test("getValidAdjustmentReasons excludes exactly the incompatible reason per sign", () => {
    expect(getValidAdjustmentReasons(-1)).toEqual(["Faltante detectado", "Error de registro", "Otro"]);
    expect(getValidAdjustmentReasons(1)).toEqual(["Sobrante detectado", "Error de registro", "Otro"]);
    expect(getValidAdjustmentReasons(0)).toHaveLength(4);
  });
});

test.describe("ajustarEfectivo — domain boundary rejects an invalid combination", () => {
  test("rejects Sobrante detectado when the computed difference is negative", () => {
    const balance = CAJA_BALANCES.find((b) => b.currency === "GBP");
    expect(balance).toBeTruthy();
    const registered = balance!.amount;

    const outcome = ajustarEfectivo({
      currency: "GBP",
      efectivoContado: registered - 1, // negative difference
      motivo: "Sobrante detectado",
      timestamp: new Date(),
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("motivo-incompatible");
    // Rejected before any mutation: the balance is untouched.
    expect(balance!.amount).toBe(registered);
  });

  test("rejects Faltante detectado when the computed difference is positive", () => {
    const balance = CAJA_BALANCES.find((b) => b.currency === "GBP");
    expect(balance).toBeTruthy();
    const registered = balance!.amount;

    const outcome = ajustarEfectivo({
      currency: "GBP",
      efectivoContado: registered + 1, // positive difference
      motivo: "Faltante detectado",
      timestamp: new Date(),
    });

    expect(outcome.ok).toBe(false);
    expect(balance!.amount).toBe(registered);
  });

  test("accepts a compatible combination and mutates the balance", () => {
    const balance = CAJA_BALANCES.find((b) => b.currency === "GBP");
    expect(balance).toBeTruthy();
    const registered = balance!.amount;
    const counted = registered - 1;

    const outcome = ajustarEfectivo({
      currency: "GBP",
      efectivoContado: counted,
      motivo: "Faltante detectado",
      timestamp: new Date(),
    });

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.result.diferencia).toBe(-1);
      expect(outcome.result.saldoActual).toBe(counted);
    }
    expect(balance!.amount).toBe(counted);
  });
});
