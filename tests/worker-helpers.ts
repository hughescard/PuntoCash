import path from "node:path";

import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Utilidades compartidas por las pruebas de `/worker`.
 *
 * Vive fuera de `*.spec.ts` a propósito, igual que `admin-helpers.ts`:
 * importar un archivo de pruebas desde otro haría que Playwright registrara
 * sus casos dos veces.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 * `openJornada` estaba copiada en ocho archivos y las copias habían
 * divergido: cuatro esperaban el encabezado «Caja abierta correctamente» con
 * un plazo explícito y dos no esperaban nada, confiando en el auto-wait del
 * click siguiente. Esa asimetría es la que hacía que unas pruebas fueran
 * frágiles y otras no, sin que nada lo explicara. Esta es la versión
 * estricta, que es la que debe quedar.
 *
 * Las ocho copias siguen en sus archivos y se migran aquí cuando se toque cada
 * uno; lo que no debe volver a pasar es que se escriba una novena.
 */

/**
 * Espera a que el formulario de **fondeo inicial** esté vivo, antes de
 * escribir en él.
 *
 * Su «Continuar» está deshabilitado hasta que React se engancha —es un
 * `submit` nativo sin `action`, y pulsarlo antes de tiempo haría un GET que
 * borra lo escrito—, así que esperarlo **habilitado** es esperar la
 * hidratación. Y hay que esperarla **antes de rellenar**, no después: los
 * campos son controlados, así que lo que se escriba antes lo descarta React al
 * hidratar, cuando vuelve a pintarlos desde su propio estado vacío.
 *
 * Si esta espera agota su plazo, la pantalla no hidrató; el plazo es generoso
 * porque el servidor de desarrollo compila cada ruta la primera vez que
 * alguien la pide, no porque el producto sea lento.
 */
export async function esperarFondeoVivo(page: Page): Promise<void> {
  await esperarBotonVivo(page, "Continuar", "el fondeo inicial");
}

/**
 * Lo mismo, para cualquier pantalla cuyo botón principal esté cerrado hasta
 * que React se engancha — que en este producto son todas las que envían algo:
 * el marcado del servidor ya es un `submit` nativo y, sin `action`, pulsarlo
 * antes de tiempo hace un GET con lo escrito en la barra de direcciones.
 *
 * Esperar ese botón **habilitado** es esperar la hidratación. Importa para
 * leer los fallos: un `click` sobre él ya espera a que se habilite, así que un
 * plazo agotado ahí **no habla del localizador** —la prueba parece buscar un
 * botón que no existe cuando en realidad existe y está cerrado—. Con esta
 * espera, el mensaje dice lo que pasó.
 *
 * `donde` es lo que aparece en ese mensaje: «el fondeo inicial», «el inicio de
 * sesión de Worker».
 */
export async function esperarBotonVivo(page: Page, nombre: string, donde: string): Promise<void> {
  const boton = page.getByRole("button", { name: nombre });

  try {
    await expect(boton).toBeEnabled({ timeout: HIDRATACION_MS });
    return;
  } catch {
    /* Y si no hidrató, **una recarga**, no más espera. Cuando el servidor de
       desarrollo recompila con varios trabajadores pidiéndole rutas a la vez,
       la petición del `chunk` de la pantalla puede quedarse por el camino; esa
       página ya no va a hidratar nunca, así que esperar el doble no arregla
       nada y volver a pedirla sí.

       Se puede recargar sin perder nada porque esta espera va siempre
       inmediatamente después de navegar: todavía no se ha escrito en el
       formulario. Si alguna vez se llama a mitad de un flujo, hay que revisar
       esto antes. */
    await page.reload();
  }

  await expect(
    boton,
    `${donde} no llegó a hidratarse, ni tras recargar la pantalla`,
  ).toBeEnabled({ timeout: HIDRATACION_MS });
}

/**
 * Cuánto se le concede a una pantalla para hidratarse, **por intento**. Son
 * dos intentos con una recarga en medio (ver `esperarBotonVivo`), así que el
 * techo real es el doble, y sigue por debajo del plazo de la prueba.
 */
const HIDRATACION_MS = 12_000;

/**
 * Escribe en un campo y comprueba que el valor queda puesto.
 *
 * **No demuestra que la pantalla esté hidratada**, y conviene saberlo: `fill`
 * escribe en el DOM y `toHaveValue` lo lee de ahí, así que los dos pasan
 * igual antes de hidratar — y es la hidratación posterior la que borra el
 * valor. Esta función detecta que el valor **ya** se ha perdido y reintenta,
 * que ayuda, pero la garantía de verdad es esperar a que la pantalla responda
 * antes de escribir (`esperarFondeoVivo`).
 */
export async function rellenar(campo: Locator, valor: string): Promise<void> {
  await expect(async () => {
    await campo.fill(valor);
    await expect(campo).toHaveValue(valor);
  }).toPass({ timeout: 20_000, intervals: [100, 250, 500, 1000] });
}

/**
 * Abre la jornada **por la pantalla**: cuenta cada moneda de la caja —las que
 * no estén en `funds`, en cero—, revisa y confirma. Es la primera jornada del
 * puesto, así que no hay diferencias que explicar. Se queda en el resultado.
 */
/**
 * Rellena el conteo billete a billete (decisión del 9/11/2026) con los
 * importes dados, desglosados de mayor a menor con las denominaciones que la
 * pantalla ofrece. Vacía antes cada fila: la apertura viene rellenada. Una
 * moneda que no está en `funds` queda en cero.
 */
export async function rellenarConteo(page: Page, funds: Record<string, string>, conCambio = false): Promise<void> {
  const secciones = page.getByRole("region", { name: /^Conteo de [A-Z]{3}$/ });
  for (const seccion of await secciones.all()) {
    const code = /([A-Z]{3})$/.exec((await seccion.getAttribute("aria-label")) ?? "")?.[1] ?? "";
    const campos = await seccion.getByRole("textbox").all();
    const valores: { campo: (typeof campos)[number]; centimos: number }[] = [];
    for (const campo of campos) {
      const label = (await campo.getAttribute("aria-label")) ?? "";
      const m = /de ([\d.,]+) [A-Z]{3}$/.exec(label);
      valores.push({ campo, centimos: m ? Math.round(Number(m[1]!.replaceAll(".", "").replace(",", ".")) * 100) : 0 });
    }
    const total = Math.round(Number((funds[code] ?? "0").replaceAll(".", "").replace(",", ".")) * 100);
    const ordenadas = valores.filter((v) => v.centimos > 0).sort((a, b) => b.centimos - a.centimos);
    /* Una caja real tiene de todo: se reparte el fondo a partes iguales entre las
       denominaciones y lo que sobra se completa de mayor a menor. */
    const cantidades = new Map<string, number>();
    let resto = total;
    const parte = ordenadas.length > 0 && conCambio ? Math.floor(total / ordenadas.length) : 0;
    for (const v of ordenadas) {
      const n = Math.min(Math.floor(parte / v.centimos), Math.floor(resto / v.centimos));
      cantidades.set(String(v.centimos), n);
      resto -= n * v.centimos;
    }
    for (const v of ordenadas) {
      const n = Math.floor(resto / v.centimos);
      cantidades.set(String(v.centimos), (cantidades.get(String(v.centimos)) ?? 0) + n);
      resto -= n * v.centimos;
    }
    for (const v of valores) {
      const n = cantidades.get(String(v.centimos)) ?? 0;
      await v.campo.fill(n > 0 ? String(n) : "");
    }
    if (resto !== 0) throw new Error(`${code}: ${funds[code]} no se puede formar con sus denominaciones`);
  }
}

export async function abrirPorPantalla(page: Page, funds: Record<string, string>, conCambio = false): Promise<void> {
  await page.goto("/worker/caja/fondeo-inicial");
  await esperarFondeoVivo(page);
  await rellenarConteo(page, funds, conCambio);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Confirmar conteo" }).click();
  await page.getByRole("button", { name: "Confirmar y abrir caja" }).click();
  await expect(page.getByRole("heading", { name: "Caja abierta correctamente" })).toBeVisible({
    timeout: 10_000,
  });
}

/** Abre la jornada por la pantalla y deja la pantalla en Caja. */
export async function openJornada(
  page: Page,
  funds: Record<string, string> = { CUP: "200000", USD: "4250", EUR: "1185" },
): Promise<void> {
  await abrirPorPantalla(page, funds);
  await page.getByRole("link", { name: "Ir a Caja" }).click();
}

/**
 * Solo lo que se ve. Varias pantallas llevan un resumen imprimible
 * (`hidden print:block`) que repite etiquetas e importes: sin filtrar, una
 * búsqueda por texto resuelve a dos elementos y el modo estricto falla.
 */
export function onScreen(page: Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true });
}

/**
 * Marca en una tabla de billetes —por el nombre de su región— un importe,
 * de mayor a menor con las denominaciones que la pantalla ofrece (bloque 4).
 */
export async function marcarBilletes(page: Page, region: string | RegExp, importe: number): Promise<void> {
  const seccion = page.getByRole("region", { name: region });
  const campos = await seccion.getByRole("textbox").all();
  const valores: { campo: (typeof campos)[number]; centimos: number }[] = [];
  for (const campo of campos) {
    const label = (await campo.getAttribute("aria-label")) ?? "";
    const m = /de ([\d.,]+) [A-Z]{3}$/.exec(label);
    valores.push({ campo, centimos: m ? Math.round(Number(m[1]!.replaceAll(".", "").replace(",", ".")) * 100) : 0 });
  }
  let resto = Math.round(importe * 100);
  for (const v of valores.sort((a, b) => b.centimos - a.centimos)) {
    const n = v.centimos > 0 ? Math.floor(resto / v.centimos) : 0;
    resto -= n * v.centimos;
    await v.campo.fill(n > 0 ? String(n) : "");
  }
  if (resto !== 0) throw new Error(`${importe} no se puede formar con las denominaciones de ${String(region)}`);
}

/**
 * En el paso de billetes de un cobro o un cambio: el cliente paga justo lo que
 * se le cobra, con los billetes de mayor a menor. Lee el importe y la moneda de
 * la propia pantalla, así que sirve para cualquier operación.
 */
export async function pagarJusto(page: Page): Promise<void> {
  const texto = (await page.getByText(/Se le cobran/).first().textContent()) ?? "";
  const m = /Se le cobran ([\d.]+(?:,\d+)?)\s*([A-Z]{3})/.exec(texto);
  if (!m) throw new Error(`No encuentro lo que se cobra en: ${texto}`);
  const importe = Number(m[1]!.replaceAll(".", "").replace(",", "."));
  await marcarBilletes(page, `Billetes del cliente de ${m[2]}`, importe);
}

/**
 * «Continuar a confirmar» en una operación que ya pasa por el paso de billetes:
 * si aparece, se completa (el cliente paga justo; las propuestas de la caja se
 * dejan como están) y se continúa.
 */
export async function continuarAConfirmar(page: Page): Promise<void> {
  const boton = page.getByRole("button", { name: "Continuar a confirmar" });
  await boton.click();
  const paso = page.getByRole("heading", { name: /^Billetes (de la entrega|del cobro)$/ });
  if (await paso.isVisible({ timeout: 4_000 }).catch(() => false)) {
    if (await page.getByText(/Se le cobran/).first().isVisible().catch(() => false)) await pagarJusto(page);
    await expect(page.getByText("Los billetes cuadran.")).toBeVisible({ timeout: 15_000 });
    await boton.click();
  }
}

/** Una foto cualquiera hace de carné en las pruebas: lo que se comprueba es el recorrido, no la imagen. */
const FOTO_DEL_CARNE = path.join(__dirname, "fixtures", "promocion.jpg");

/** Firma en el panel del móvil con el ratón: un garabato de varios trazos. */
export async function firmarEnElPanel(movil: Page): Promise<void> {
  const panel = movil.locator("canvas[data-panel-de-firma]");
  await panel.scrollIntoViewIfNeeded();
  const caja = await panel.boundingBox();
  if (!caja) throw new Error("el panel de firma no se ve");
  await movil.mouse.move(caja.x + 30, caja.y + caja.height * 0.6);
  await movil.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await movil.mouse.move(caja.x + 30 + i * 20, caja.y + caja.height * (i % 2 === 0 ? 0.35 : 0.65), { steps: 3 });
  }
  await movil.mouse.up();
}

/**
 * En la confirmación de una remesa o de un giro cobrado: hace las dos fotos
 * del carné y la firma del beneficiario como las haría el móvil del
 * trabajador —abre el enlace del QR en otra pestaña, sube anverso y reverso y
 * firma en el panel— y espera a que la caja las reciba.
 */
export async function hacerFotosDelCarne(page: Page): Promise<void> {
  const enlace = page.getByRole("link", { name: /Abrir el enlace en este equipo/ });
  await expect(enlace).toBeVisible({ timeout: 15_000 });
  const url = await enlace.getAttribute("href");
  expect(url, "la confirmación no ofrece el enlace del móvil").toBeTruthy();
  const movil = await page.context().newPage();
  await movil.setViewportSize({ width: 390, height: 844 });
  await movil.goto(url!);
  for (const cara of ["anverso", "reverso"] as const) {
    /* El botón se habilita al hidratar: antes, el archivo no llegaría a ningún manejador. */
    await expect(movil.getByRole("button", { name: `Hacer foto del ${cara}` })).toBeEnabled({ timeout: 15_000 });
    await movil.locator(`input[data-cara="${cara}"]`).setInputFiles(FOTO_DEL_CARNE);
    await expect(movil.getByRole("button", { name: `Repetir foto del ${cara}` })).toBeVisible({ timeout: 15_000 });
  }
  await firmarEnElPanel(movil);
  await movil.getByRole("button", { name: "Guardar firma" }).click();
  await expect(movil.getByText("Listo: las fotos y la firma ya están en la caja")).toBeVisible({ timeout: 15_000 });
  await movil.close();
  await expect(page.getByRole("button", { name: "Repetir fotos y firma" })).toBeVisible({ timeout: 15_000 });
}

/**
 * Enviar giro empieza identificando al remitente como el cliente de Cambio de
 * moneda. Por defecto, el cliente sembrado Carlos Pérez Rodríguez (CI
 * 90010112345, nacido el 01/01/1990, +53 5 1234 5678). Deja la prueba en el
 * formulario del giro.
 */
export async function identificarRemitente(page: Page, documento = "90010112345"): Promise<void> {
  await page.locator("#numero-documento").fill(documento);
  await page.getByRole("button", { name: "Buscar cliente" }).click();
  await page.getByRole("button", { name: /^(Seleccionar cliente y continuar|Continuar con este cliente)$/ }).click();
  await expect(page.locator("#giro-beneficiario-nombre")).toBeVisible();
}
