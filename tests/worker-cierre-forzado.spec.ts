import { test, expect } from "./worker-fixture";
import { pagarJusto } from "./worker-helpers";
import { WORKER_BASE_URL } from "./storage-state";
import { type APIRequestContext } from "@playwright/test";

/**
 * Cierre forzado visto por el trabajador: el administrador cierra su jornada
 * desde fuera (aquí, por la ruta de pruebas) y el trabajador lo sabe al
 * momento, con la hora, quién y por qué; desde ahí no puede operar, y al leerlo
 * abre la jornada siguiente con el aviso de que la anterior se cerró sin contar.
 */
test.use({ conCambio: true, fondos: { CUP: 500_000, USD: 3_850 }, monedas: ["CUP", "USD"] });

async function forzar(request: APIRequestContext, caja: string, sede: string, motivo: string) {
  const r = await request.get(`${WORKER_BASE_URL}/pruebas/forzar-cierre?caja=${caja}&sede=${sede}&motivo=${encodeURIComponent(motivo)}`);
  expect(await r.text()).toContain("&quot;ok&quot;:true");
}

test("el aviso aparece solo, con quién, cuándo y por qué, y «Entendido» lleva a Caja con la jornada cerrada", async ({ page, request, puesto }) => {
  await page.goto("/worker/caja");
  await expect(page.getByText("Jornada abierta").first()).toBeVisible();

  await forzar(request, puesto.registerId, puesto.sedeId, "Nadie vino a cerrar la caja");

  const aviso = page.getByRole("dialog", { name: "El administrador cerró tu jornada" });
  await expect(aviso).toBeVisible({ timeout: 15_000 });
  await expect(aviso).toContainText("Marta Sánchez");
  await expect(aviso).toContainText("Nadie vino a cerrar la caja");
  await expect(aviso).toContainText("Ya no puedes registrar operaciones");
  /* No se descarta con Escape: hay que leerlo. */
  await page.keyboard.press("Escape");
  await expect(aviso).toBeVisible();

  await aviso.getByRole("button", { name: "Entendido" }).click();
  await expect(page).toHaveURL(/\/worker\/caja$/);
  await expect(aviso).toBeHidden();
  await expect(page.getByRole("link", { name: /Abrir jornada/ })).toBeVisible();
});

test("a media operación, al confirmar se le dice lo mismo y no se registra nada", async ({ page, request, puesto }) => {
  await page.goto("/worker/caja");
  await page.getByRole("link", { name: "Nueva operación" }).click();
  await page.getByRole("link", { name: /Cambio de moneda/ }).click();
  await page.getByLabel("Monto a entregar").fill("100");
  await page.getByLabel("Monto a entregar").blur();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Número de documento").fill("90010112345");
  await page.getByRole("button", { name: "Buscar cliente" }).click();
  await page.getByRole("button", { name: /Seleccionar cliente y continuar/ }).click();
  await pagarJusto(page);
  await expect(page.getByText("Los billetes cuadran.")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Continuar a revisión" }).click();
  const confirmar = page.getByRole("button", { name: "Confirmar cambio" });
  await expect(confirmar).toBeVisible();

  await forzar(request, puesto.registerId, puesto.sedeId, "Cierre de prueba");
  /* Se confirma sin esperar al aviso. Según quién llegue antes —el rechazo del
     servidor o el aviso global— el trabajador lee lo mismo: que su jornada la
     cerró el administrador y que lo que hacía no se registró. */
  await confirmar.click({ force: true });
  await expect(
    page.getByText("El administrador cerró tu jornada. Esto no se registró.").or(page.getByText("Lo que tenías a medias no se guardó.")).first(),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Cambio registrado|Operación registrada/)).toHaveCount(0);
});

test("tras leerlo, la siguiente apertura avisa de que la jornada anterior se cerró sin contar", async ({ page, request, puesto }) => {
  await page.goto("/worker/caja");
  await forzar(request, puesto.registerId, puesto.sedeId, "Cierre de prueba");
  const aviso = page.getByRole("dialog", { name: "El administrador cerró tu jornada" });
  await expect(aviso).toBeVisible({ timeout: 15_000 });
  await aviso.getByRole("button", { name: "Entendido" }).click();
  await page.getByRole("link", { name: /Abrir jornada/ }).click();
  await expect(page.getByText(/La jornada anterior se cerró sin contar/)).toBeVisible();
});
