import { test, expect } from "@playwright/test";

import {
  ADMIN_PASSWORD as PASSWORD,
  MARTA,
  YULIET,
  signInAsAdmin,
  submitCredentials,
} from "./admin-helpers";

/**
 * Acceso a la consola de administración — **FR-AD-ACC-1 a FR-AD-ACC-8**.
 *
 * Los desenlaces los decide el mock `src/features/admin/admin-auth.ts`, que
 * elige por el identificador y por el estado que el dominio ya conoce. Cuando
 * exista backend, estas pruebas deben apuntarse a cuentas sembradas, no
 * reescribirse.
 *
 * Lo que de verdad se vigila aquí es el **mensaje único**: usuario que no
 * existe, contraseña equivocada y empresa suspendida tienen que leerse igual
 * desde fuera. Si alguna vez dejan de hacerlo, probar identificadores bastaría
 * para averiguar qué cuentas existen y en qué estado está una empresa.
 */

test.describe("pantalla de credenciales", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
  });

  test("se identifica como la consola de administración y solo muestra PuntoCash", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();
    await expect(page.getByText("Administración de sede").first()).toBeVisible();

    // Antes de autenticarse no puede aparecer ninguna empresa operadora (A9).
    await expect(page.getByText(/Malecón|Caribe|Oriente|Cienfuegos/)).toHaveCount(0);

    // Una sola acción primaria en el contexto (§9).
    await expect(page.getByRole("button", { name: "Iniciar sesión" })).toHaveCount(1);
  });

  test("no trae credenciales precargadas", async ({ page }) => {
    await expect(page.getByLabel("Usuario o correo electrónico")).toHaveValue("");
    await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue("");
  });

  test("valida los campos vacíos antes de enviar nada", async ({ page }) => {
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page.getByText("Introduce tu usuario o correo electrónico.")).toBeVisible();
    await expect(page.getByText("Introduce tu contraseña.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("el enlace de recuperación llega al trámite real y devuelve al acceso", async ({ page }) => {
    await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();

    await expect(page).toHaveURL(/\/admin\/recuperar-acceso$/);

    /* Hasta la v5.2 esto era un marcador que decía «pídeselo a PuntoCash», y
       con §8 construida dejó de ser cierto. **FR-AD-ACC-8**: es el mismo
       trámite de tres pasos que Worker, del mismo componente compartido. */
    await expect(page.getByRole("heading", { name: "¿Olvidaste tu contraseña?" })).toBeVisible();
    await expect(page.getByLabel("Usuario o correo electrónico")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviarme un código" })).toBeEnabled();

    /* Lo único propio de esta consola: a quién se le pide ayuda cuando el
       correo registrado ya no sirve. Si algún día dijera otra cosa, el
       requisito tendría que cambiar antes. */
    await expect(page.getByText(/administrador principal/)).toBeVisible();

    await page.getByRole("link", { name: /Volver a iniciar sesión/ }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

test.describe("el motivo del rechazo nunca se revela", () => {
  const MENSAJE = "Credenciales incorrectas";

  const casos = [
    { nombre: "usuario que no existe", identifier: "nadie@ejemplo.cu", password: PASSWORD },
    { nombre: "contraseña equivocada", identifier: MARTA, password: "otra-cosa" },
    { nombre: "empresa suspendida por PuntoCash", identifier: YULIET, password: PASSWORD },
  ];

  for (const caso of casos) {
    test(`${caso.nombre} → el mismo mensaje`, async ({ page }) => {
      await page.goto("/admin/login");
      await submitCredentials(page, caso.identifier, caso.password);

      await expect(page.getByText(MENSAJE)).toBeVisible();
      // Sigue en la primera pantalla: no se emitió ningún código.
      await expect(page).toHaveURL(/\/admin\/login$/);
    });
  }
});

test("las credenciales correctas no abren sesión: llevan al segundo factor", async ({ page }) => {
  await page.goto("/admin/login");
  await submitCredentials(page, MARTA, PASSWORD);

  await expect(page).toHaveURL(/\/admin\/verificacion$/);
  await expect(page.getByRole("heading", { name: "Verifica que eres tú" })).toBeVisible();

  // El correo de destino se muestra enmascarado, nunca entero.
  await expect(page.getByText(MARTA)).toHaveCount(0);
});

test("el código verificado abre la sesión y aterriza en Inicio", async ({ page }) => {
  await signInAsAdmin(page, MARTA);

  await expect(page).toHaveURL(/\/admin\/inicio$/);
  await expect(page.getByRole("heading", { name: /^Hola, Marta$/ })).toBeVisible();
});

test("un código incorrecto no abre sesión y descuenta un intento", async ({ page }) => {
  await page.goto("/admin/login");
  await submitCredentials(page, MARTA, PASSWORD);
  await page.waitForURL(/\/admin\/verificacion$/);

  await page.getByLabel("Código de verificación").fill("111111");

  await expect(page.getByText("Código incorrecto")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/verificacion$/);
});

test.describe("sin sesión no se representa nada de la consola", () => {
  const rutas = ["/admin", "/admin/inicio", "/admin/sedes", "/admin/cajas"];

  for (const ruta of rutas) {
    test(`${ruta} devuelve al inicio de sesión`, async ({ page }) => {
      await page.goto(ruta);

      await expect(page).toHaveURL(/\/admin\/login$/);
      // Y no se ha filtrado ni un dato de la consola por el camino.
      await expect(page.getByRole("navigation", { name: "Navegación principal" })).toHaveCount(0);
    });
  }
});

test("la verificación alcanzada por enlace directo lo dice en vez de redirigir en silencio", async ({
  page,
}) => {
  await page.goto("/admin/verificacion");

  await expect(page.getByText("La verificación ya no está activa")).toBeVisible();
  await page.getByRole("link", { name: /Volver a iniciar sesión/ }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
});
