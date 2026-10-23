import { test, expect } from "@playwright/test";

import {
  GLOBAL_SCOPE,
  MOTIVO_RESOLUCION_MIN,
  SEDES,
  jornadasDeSede,
  operadorVigente,
  operatorScope,
  resolverSolicitud,
  solicitudesDeSede,
} from "../src/features/network";
import { IDALMIS, MARTA, signInAsAdmin } from "./admin-helpers";

/**
 * `/admin/aprobaciones` — **FR-AD-APR-1** a **FR-AD-APR-13**.
 */

test.describe("Aprobaciones · dominio", () => {
  test("cada diferencia registrada da exactamente una solicitud", () => {
    for (const s of SEDES) {
      const sol = solicitudesDeSede(s.id);
      let esperadas = 0;
      for (const j of jornadasDeSede(s.id)) {
        esperadas += j.movimientos.filter((m) => m.concepto === "Ajuste de efectivo").length;
        if (j.arqueo) esperadas += j.arqueo.monedas.filter((m) => m.diferencia !== 0).length;
        if (j.apertura.cierreAnterior) esperadas += j.apertura.monedas.filter((m) => m.diferencia !== 0).length;
      }
      expect(sol.length, s.id).toBe(esperadas);
      expect(new Set(sol.map((x) => x.id)).size).toBe(sol.length);
      for (const x of sol) expect(x.diferencia).not.toBe(0);
    }
  });

  test("resolver exige motivo, no pisa una resuelta y no sale del alcance", () => {
    const pendiente = SEDES.flatMap((s) => solicitudesDeSede(s.id)).find(
      (x) => x.estado === "pendiente" && operadorVigente(x.sedeId),
    );
    expect(pendiente).toBeTruthy();
    const p = pendiente!;
    const propio = operatorScope(operadorVigente(p.sedeId)!);
    const ajeno = operatorScope(operadorVigente(p.sedeId) === "op-malecon" ? "op-caribe" : "op-malecon");
    const antes = { ...p };

    expect(resolverSolicitud(GLOBAL_SCOPE, p.id, "aprobada", "Motivo suficiente", "X")).toMatchObject({ ok: false });
    expect(resolverSolicitud(ajeno, p.id, "aprobada", "Motivo suficiente", "X")).toEqual({ ok: false, reason: "no-encontrada" });
    expect(resolverSolicitud(propio, p.id, "aprobada", "x".repeat(MOTIVO_RESOLUCION_MIN - 1), "X")).toEqual({
      ok: false,
      reason: "motivo-corto",
    });

    const r = resolverSolicitud(propio, p.id, "rechazada", "  No se justifica el faltante  ", "Ana");
    expect(r.ok).toBe(true);
    expect(p.estado).toBe("rechazada");
    expect(p.resolucion?.motivo).toBe("No se justifica el faltante");
    /* Lo que registró el trabajador no cambia. */
    expect(p.diferencia).toBe(antes.diferencia);
    expect(p.contado).toBe(antes.contado);
    expect(p.motivo).toBe(antes.motivo);

    expect(resolverSolicitud(propio, p.id, "aprobada", "Otro motivo suficiente", "Luis")).toEqual({ ok: false, reason: "ya-resuelta" });
  });
});

test.describe("Aprobaciones", () => {
  test("la bandeja muestra las pendientes, se filtra por tipo y se pasa a Resueltas", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/aprobaciones");
    const main = page.getByRole("main");

    await expect(main.getByRole("link", { name: /^Pendientes \d+$/ })).toHaveAttribute("aria-current", "page");
    await expect(main.locator("tbody tr").first()).toBeVisible();
    await expect(main.getByRole("columnheader", { name: "Antigüedad" })).toBeVisible();

    await main.getByLabel("Tipo").selectOption("cierre");
    const filas = main.locator("tbody tr");
    const n = await filas.count();
    if (n > 0 && !(await filas.first().textContent())?.includes("coincide")) {
      for (const texto of await filas.allTextContents()) expect(texto).toContain("Diferencia de cierre");
    }

    await main.getByRole("link", { name: /^Resueltas \d+$/ }).click();
    await page.waitForURL(/pestana=resueltas/);
    await expect(main.getByRole("columnheader", { name: "Resolución" })).toBeVisible();
    await expect(main.locator("tbody tr").first()).toContainText(/Aprobada|Rechazada/);
  });

  test("aprobar con motivo la resuelve, la saca de pendientes y deja la caja como estaba", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/aprobaciones");
    const main = page.getByRole("main");
    const contador = main.getByRole("link", { name: /^Pendientes \d+$/ });
    const antes = Number((await contador.textContent())!.replace(/\D/g, ""));

    await main.locator("tbody tr").first().locator("td").nth(1).click();
    await page.waitForURL(/\/admin\/aprobaciones\/SOL-/);
    await expect(main.getByRole("heading", { name: "Lo que registró el trabajador" })).toBeVisible();

    await main.getByRole("button", { name: "Aprobar" }).click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo.getByText("No modifica el saldo de la caja")).toBeVisible();
    const enviar = dialogo.getByRole("button", { name: "Aprobar" });
    await dialogo.getByLabel(/Tu motivo/).fill("corto");
    await expect(enviar).toBeDisabled();
    await dialogo.getByLabel(/Tu motivo/).fill("Revisado con el trabajador; el conteo es correcto.");
    await enviar.click();

    await page.waitForURL(/resuelta=1/);
    await expect(main.getByText("Solicitud aprobada")).toBeVisible();
    await expect(main.getByRole("button", { name: "Aprobar" })).toHaveCount(0);
    await expect(main.getByText("Revisado con el trabajador; el conteo es correcto.")).toBeVisible();

    await page.goto("/admin/aprobaciones");
    await expect(main.getByRole("link", { name: /^Pendientes \d+$/ })).toHaveText(new RegExp(`${antes - 1}$`));
  });

  test("la jornada dice en qué quedó cada diferencia", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/aprobaciones?pestana=resueltas");
    const main = page.getByRole("main");
    /* Las de cierre se ven en la sección Cierre de la jornada; las de ajuste, en su movimiento. */
    await main.getByLabel("Tipo").selectOption("cierre");
    await main.locator("tbody tr").first().locator("td").nth(1).click();
    await page.waitForURL(/\/admin\/aprobaciones\/SOL-/);
    await main.getByRole("link", { name: /^Caja \d+ · .+ · \d+ \w+ \d{4}$/ }).click();
    await page.waitForURL(/\/admin\/jornadas\/J-/);
    const enlace = main.getByRole("link", { name: /^(Aprobada|Rechazada) por / }).first();
    await expect(enlace).toBeVisible();
    await enlace.click();
    await page.waitForURL(/\/admin\/aprobaciones\/SOL-/);
    await expect(main.getByRole("heading", { name: "Resolución" })).toBeVisible();
  });

  test("Inicio cuenta las pendientes y lleva a la bandeja", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/inicio");
    const main = page.getByRole("main");
    await expect(main.getByText("Aprobaciones pendientes")).toBeVisible();
    await main.getByRole("link", { name: /Revisarlas/ }).first().click();
    await page.waitForURL(/\/admin\/aprobaciones$/);
  });

  test("una solicitud de otra empresa responde como inexistente", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/aprobaciones?pestana=resueltas");
    await page.getByRole("main").locator("tbody tr").first().locator("td").nth(1).click();
    await page.waitForURL(/\/admin\/aprobaciones\/SOL-/);
    const ruta = new URL(page.url()).pathname;

    await page.context().clearCookies();
    await signInAsAdmin(page, IDALMIS);
    const respuesta = await page.goto(ruta);
    expect(respuesta?.status()).toBe(404);
  });
});
