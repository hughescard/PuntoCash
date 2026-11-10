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
      /* De importe o de composición, al abrir o al cerrar. «Ajustar efectivo» ya no existe. */
      const conDiferencia = (m: { diferencia: number; composicion?: object }) => m.diferencia !== 0 || (m.composicion && Object.keys(m.composicion).length > 0);
      for (const j of jornadasDeSede(s.id)) {
        if (j.arqueo) esperadas += j.arqueo.monedas.filter(conDiferencia).length;
        if (j.apertura.cierreAnterior) esperadas += j.apertura.monedas.filter(conDiferencia).length;
      }
      expect(sol.length, s.id).toBe(esperadas);
      expect(new Set(sol.map((x) => x.id)).size).toBe(sol.length);
      for (const x of sol) {
        if (x.tipo === "composicion") expect(x.diferencia).toBe(0);
        else expect(x.diferencia).not.toBe(0);
      }
      expect(sol.some((x) => (x.tipo as string) === "ajuste")).toBe(false);
    }
  });

  test("hay diferencias de composición y movimientos de fondos sembrados, con su detalle", () => {
    const todas = SEDES.flatMap((s) => solicitudesDeSede(s.id));
    const composicion = todas.find((x) => x.tipo === "composicion");
    expect(composicion?.billetes).toEqual({ "20000": -1, "10000": 2 });
    const fondos = todas.find((x) => x.tipo === "fondos");
    expect(fondos?.supervisor).toBeTruthy();
    expect(fondos?.origen).toBe("apertura");
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

test.describe("Aprobaciones · billetes", () => {
  test("una diferencia de composición y un movimiento de fondos enseñan su detalle", async ({ page }) => {
    const CAPTURAS = process.env.CAPTURAS;
    await signInAsAdmin(page, MARTA);
    const main = page.getByRole("main");

    await page.goto("/admin/aprobaciones");
    await main.getByLabel("Tipo").selectOption("composicion");
    await main.getByRole("link", { name: /^Ver solicitud: Diferencia de composición/ }).first().click();
    await expect(page.getByRole("heading", { name: "Diferencia de composición", level: 1 })).toBeVisible();
    await expect(main.getByText("Billetes que cambiaron (total sin diferencia)")).toBeVisible();
    const billetes = main.getByRole("list", { name: "Billetes de la solicitud" });
    await expect(billetes.getByText("−1 de 200 CUP")).toBeVisible();
    await expect(billetes.getByText("+2 de 100 CUP")).toBeVisible();
    if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/apr-composicion.png`, fullPage: true });

    await page.goto("/admin/aprobaciones");
    await main.getByLabel("Tipo").selectOption("fondos");
    const enlace = main.getByRole("link", { name: /^Ver solicitud: Movimiento de fondos/ });
    if ((await enlace.count()) === 0) {
      await page.goto("/admin/aprobaciones?pestana=resueltas");
      await main.getByLabel("Tipo").selectOption("fondos");
    }
    await main.getByRole("link", { name: /^Ver solicitud: Movimiento de fondos/ }).first().click();
    await expect(page.getByRole("heading", { name: "Movimiento de fondos", level: 1 })).toBeVisible();
    await expect(main.getByText("Supervisor", { exact: true })).toBeVisible();
    await expect(main.getByText("Al abrir la jornada")).toBeVisible();
    if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/apr-fondos.png`, fullPage: true });
  });
});
