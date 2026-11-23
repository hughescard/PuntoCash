import type { BrowserContext, Page } from "@playwright/test";

import { test, expect } from "./worker-fixture";

/**
 * Del kiosco a la caja, de punta a punta: lo que un cliente prepara en el
 * kiosco de una sede lo canjea una caja **de esa sede**, una sola vez.
 *
 * Vive en el proyecto `worker` (servidor de pruebas, `:3001`) porque las
 * solicitudes son de la red: el kiosco las registra en el servidor y la caja
 * las lee del mismo servidor. Este navegador es a la vez un kiosco (cookie
 * bajo `/kiosk/autoservicio`) y la caja del puesto que da el fixture (cookies
 * bajo `/worker`). El puesto vive en su propia copia de Vedado, así que el
 * kiosco «de su sede» lo vincula el propio fixture (`kiosco: true`), y el «de
 * otra sede» es el de la entrada de la Vedado de verdad.
 */

const KIOSCO_DE_OTRA_SEDE = "KIO-0001-0001";

async function serKiosco(context: BrowserContext, terminalId: string): Promise<void> {
  await context.addCookies([
    {
      name: "pc_kiosco_device",
      value: terminalId,
      domain: "localhost",
      path: "/kiosk/autoservicio",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      expires: -1,
    },
  ]);
}

/** Prepara en el kiosco el cobro de una remesa y devuelve el código `KS-…`. */
async function prepararRemesaEnKiosco(page: Page): Promise<string> {
  await page.goto("/kiosk/autoservicio/remesas");
  const buscar = page.getByRole("button", { name: "Buscar remesa" });
  await expect(async () => {
    await page.getByRole("textbox", { name: "Código de la remesa" }).fill("RM-7X82-9KLM");
    await expect(buscar).toBeEnabled({ timeout: 1_000 });
  }).toPass();
  await buscar.click();
  await page.getByRole("button", { name: "Generar código" }).click();
  await expect(page.getByRole("heading", { name: "Solicitud lista", level: 1 })).toBeVisible();
  const codigo = await page.getByText(/^KS-\d{6}-\d{6}$/).first().textContent();
  expect(codigo, "la solicitud no mostró su código").toBeTruthy();
  return codigo!.trim();
}

async function buscarEnCaja(page: Page, codigo: string): Promise<void> {
  await page.goto("/worker/nueva-operacion/solicitud");
  /* El campo es controlado: lo escrito antes de hidratar se pierde y el botón
     sigue apagado. Se reescribe hasta que el botón lo acepta. */
  const buscar = page.getByRole("button", { name: "Buscar solicitud" });
  await expect(async () => {
    await page.getByRole("textbox", { name: "Código de solicitud" }).fill(codigo);
    await expect(buscar).toBeEnabled({ timeout: 1_000 });
  }).toPass();
  await buscar.click();
}

test.describe("una solicitud del kiosco en la caja de su sede", () => {
  test.use({ kiosco: true });

  test("se encuentra, se continúa con ella y ya no se puede volver a usar", async ({ page, context, puesto }) => {
    await serKiosco(context, puesto.kioscoId!);
    const codigo = await prepararRemesaEnKiosco(page);

    await buscarEnCaja(page, codigo);
    await expect(page.getByText("María Pérez García")).toBeVisible();
    await page.getByRole("button", { name: "Continuar con cobrar remesa" }).click();
    await expect(page).toHaveURL(/\/worker\/nueva-operacion\/remesas$/);

    await buscarEnCaja(page, codigo);
    await expect(page.getByText("Esta solicitud ya fue utilizada")).toBeVisible();
  });
});

test.describe("una solicitud del kiosco en la caja de otra sede", () => {
  test("no se puede atender, y se dice dónde se preparó", async ({ page, context }) => {
    await serKiosco(context, KIOSCO_DE_OTRA_SEDE);
    const codigo = await prepararRemesaEnKiosco(page);

    await buscarEnCaja(page, codigo);
    await expect(page.getByText("Esta solicitud es de otra sucursal")).toBeVisible();
    await expect(page.getByText(/kiosco de PuntoCash Vedado/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Continuar con/ })).toHaveCount(0);
  });
});

/* -------------------------------------------------------------------------
 * Cambio de moneda: el kiosco cotiza con las tasas de su sede, y la caja
 * entra directa a identificar al cliente, de ahí al efectivo.
 * ---------------------------------------------------------------------- */

async function rellenarImporte(page: Page, campo: string, importe: string): Promise<void> {
  const continuar = page.getByRole("button", { name: "Continuar", exact: true });
  await expect(async () => {
    await page.getByRole("textbox", { name: campo }).fill(importe);
    await expect(continuar).toBeEnabled({ timeout: 1_000 });
  }).toPass();
}

async function rellenarCliente(page: Page): Promise<void> {
  await page.getByRole("textbox", { name: "Número de documento" }).fill("90010112345");
  await page.getByRole("textbox", { name: "Nombre" }).fill("María");
  await page.getByRole("textbox", { name: "Primer apellido" }).fill("Rodríguez");
  await page.getByRole("textbox", { name: "Teléfono" }).fill("+53 5 111 2233");
  await page.getByRole("button", { name: "Continuar a revisión" }).click();
}

test.describe("un cambio de moneda preparado en el kiosco", () => {
  test.use({ kiosco: true, fondos: { CUP: 200_000, USD: 2_000 } });

  test("cotiza con la tasa de compra de la sede", async ({ page, context, puesto }) => {
    await serKiosco(context, puesto.kioscoId!);
    await page.goto("/kiosk/autoservicio/cambio-moneda");
    await rellenarImporte(page, "Monto a entregar", "100");
    /* Vedado compra el dólar a 318: 100 USD son 31.800 CUP. */
    await expect(page.getByRole("textbox", { name: "Monto a recibir" })).toHaveValue("31.800,00");
    await expect(page.getByText("1 USD = 318,0000 CUP")).toBeVisible();
  });

  test("no deja entregar fracciones que no existen en billetes", async ({ page, context, puesto }) => {
    await serKiosco(context, puesto.kioscoId!);
    await page.goto("/kiosk/autoservicio/cambio-moneda");
    await page.getByRole("button", { name: /Intercambiar monedas/ }).click();
    await page.getByRole("textbox", { name: "Monto a entregar" }).fill("1000,50");
    await expect(page.getByText(/No se puede entregar en billetes: usa múltiplos de 1 CUP/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar", exact: true })).toBeDisabled();
  });

  test("con «recibir», dice cuánto hay que entregar", async ({ page, context, puesto }) => {
    await serKiosco(context, puesto.kioscoId!);
    await page.goto("/kiosk/autoservicio/cambio-moneda");
    await page.getByText("Sé cuánto quiero recibir").click();
    await rellenarImporte(page, "Monto a recibir", "10000");
    /* Lo mínimo en dólares que, a 318, llega a 10.000 CUP. */
    await expect(page.getByRole("textbox", { name: "Monto a entregar" })).toHaveValue("31,45");
  });

  test("en caja se pasa directo a identificar al cliente", async ({ page, context, puesto }) => {
    await serKiosco(context, puesto.kioscoId!);
    await page.goto("/kiosk/autoservicio/cambio-moneda");
    await rellenarImporte(page, "Monto a entregar", "100");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await rellenarCliente(page);
    await page.getByRole("button", { name: "Generar código" }).click();
    await expect(page.getByRole("heading", { name: "Solicitud lista", level: 1 })).toBeVisible();
    const codigo = (await page.getByText(/^KS-\d{6}-\d{6}$/).first().textContent())!.trim();

    await buscarEnCaja(page, codigo);
    await page.getByRole("button", { name: "Continuar con cambio de moneda" }).click();
    await expect(page).toHaveURL(/\/worker\/nueva-operacion\/cambio-moneda$/);
    await expect(page.getByText("Identifica al cliente para continuar.")).toBeVisible();
    /* La tasa no cambió: no hay nada que explicarle al cliente. */
    await expect(page.getByText("La tasa cambió desde que el cliente preparó la solicitud")).toHaveCount(0);
  });
});

/* -------------------------------------------------------------------------
 * Enviar giro: el cliente ve la cuenta con la tarifa de PuntoCash, y la caja
 * pasa del remitente directo al efectivo. Tarifa sembrada del CUP: mínimo
 * 1.000; hasta 10.000, 150 fijos; hasta 50.000, 100 + 1 %.
 * ---------------------------------------------------------------------- */

async function elegir(page: Page, campo: string, opcion: string): Promise<void> {
  await page.getByRole("combobox", { name: campo }).click();
  await page.getByRole("option", { name: opcion }).click();
}

async function hastaElMontoDelGiro(page: Page): Promise<void> {
  await page.goto("/kiosk/autoservicio/giros/enviar");
  const continuar = page.getByRole("button", { name: "Continuar", exact: true });
  await expect(async () => {
    await page.getByRole("textbox", { name: "Número de documento" }).fill("90010112345");
    await expect(page.getByRole("textbox", { name: "Número de documento" })).toHaveValue("90010112345", { timeout: 1_000 });
  }).toPass();
  await page.getByRole("textbox", { name: "Nombre" }).fill("Carlos");
  await page.getByRole("textbox", { name: "Primer apellido" }).fill("Pérez");
  await page.getByRole("textbox", { name: "Teléfono" }).fill("+53 5 123 4567");
  await continuar.click();

  await page.getByRole("textbox", { name: "Nombre completo" }).fill("Ana López Díaz");
  await page.getByRole("textbox", { name: "Teléfono" }).fill("+53 5 765 4321");
  await page.getByRole("textbox", { name: "Dirección" }).fill("Calle 23 nº 456, Vedado");
  await elegir(page, "Provincia", "La Habana");
  await elegir(page, "Municipio", "Plaza de la Revolución");
  await page.getByRole("textbox", { name: "Carné de identidad del beneficiario" }).fill("85020245678");
  await continuar.click();
  await expect(page.getByRole("heading", { name: "¿Cuánto vas a enviar?" })).toBeVisible();
}

test.describe("un giro preparado en el kiosco", () => {
  test.use({ kiosco: true, fondos: { CUP: 200_000 } });

  test("enseña la tarifa y el total antes del código", async ({ page, context, puesto }) => {
    await serKiosco(context, puesto.kioscoId!);
    await hastaElMontoDelGiro(page);

    await page.getByRole("textbox", { name: "Monto que recibe el beneficiario" }).fill("20000");
    await expect(page.getByText("Recibe el beneficiario", { exact: true })).toBeVisible();
    await expect(page.getByText("100,00 CUP + 1 %")).toBeVisible();
    await expect(page.getByText("20.300,00 CUP")).toBeVisible();

    await page.getByRole("textbox", { name: "Monto que recibe el beneficiario" }).fill("500");
    await expect(page.getByText("El giro mínimo es de 1.000,00 CUP.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar a revisión" })).toBeDisabled();
  });

  test("con «entregar», descuenta la tarifa y dice lo que sobra", async ({ page, context, puesto }) => {
    await serKiosco(context, puesto.kioscoId!);
    await hastaElMontoDelGiro(page);

    await page.getByText("Sé cuánto voy a entregar").click();
    await page.getByRole("textbox", { name: "Monto que entregas" }).fill("10200");
    /* El mayor giro que cabe es 10.000 (+150 = 10.150): sobran 50. */
    await expect(page.getByText("10.150,00 CUP")).toBeVisible();
    await expect(page.getByText(/se te devuelven 50,00 CUP/)).toBeVisible();
  });

  test("en caja se pasa del remitente directo al efectivo", async ({ page, context, puesto }) => {
    await serKiosco(context, puesto.kioscoId!);
    await hastaElMontoDelGiro(page);
    await page.getByRole("textbox", { name: "Monto que recibe el beneficiario" }).fill("5000");
    await page.getByRole("button", { name: "Continuar a revisión" }).click();
    await page.getByRole("button", { name: "Generar código" }).click();
    await expect(page.getByRole("heading", { name: "Solicitud lista", level: 1 })).toBeVisible();
    const codigo = (await page.getByText(/^KS-\d{6}-\d{6}$/).first().textContent())!.trim();

    await buscarEnCaja(page, codigo);
    await expect(page.getByText("5.150,00 CUP")).toBeVisible();
    await page.getByRole("button", { name: "Continuar con enviar giro" }).click();
    await page.getByRole("button", { name: /Seleccionar cliente y continuar|Continuar con este cliente/ }).click();
    await expect(page.getByRole("heading", { name: "Billetes del cobro" })).toBeVisible();
    await expect(page.getByText("La tarifa cambió desde que el cliente preparó la solicitud")).toHaveCount(0);
  });
});
