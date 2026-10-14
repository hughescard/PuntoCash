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

/** Abre la jornada con un fondeo inicial y deja la pantalla en Caja. */
export async function openJornada(
  page: Page,
  funds: Record<string, string> = { CUP: "200000", USD: "4250", EUR: "1185" },
): Promise<void> {
  await page.goto("/worker/caja/fondeo-inicial");
  await esperarFondeoVivo(page);
  for (const [currency, value] of Object.entries(funds)) {
    await rellenar(page.getByLabel(`Fondo inicial en ${currency}`), value);
  }
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Confirmar y abrir caja" }).click();
  await expect(page.getByRole("heading", { name: "Caja abierta correctamente" })).toBeVisible({
    timeout: 5000,
  });
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
