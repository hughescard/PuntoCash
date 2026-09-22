import { test, expect, type Page } from "@playwright/test";

/**
 * Worker login — state and accessibility coverage.
 *
 * Outcomes are driven by the frontend mock in `src/features/auth/mock-auth.ts`,
 * which selects a result from the identifier. When a real backend replaces it,
 * these tests should be pointed at seeded accounts rather than rewritten.
 */

const VALID_PASSWORD = "puntocash";

async function signIn(page: Page, identifier: string, password: string) {
  await page.getByLabel("Usuario o correo electrónico").fill(identifier);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/worker/login");
});

test("renders the brand and the single primary action", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();
  await expect(page.getByText("Tu punto para operar con seguridad.")).toBeVisible();
  await expect(page.getByText("PuntoCash · Sistema interno")).toBeVisible();

  // No operator company, sede or caja may appear before authentication.
  await expect(page.getByRole("button", { name: "Iniciar sesión" })).toHaveCount(1);
});

test("the default state carries no credentials", async ({ page }) => {
  // Demo accounts exist for development only; they must never prefill the UI.
  await expect(page.getByLabel("Usuario o correo electrónico")).toHaveValue("");
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue("");

  // Placeholders prompt, they do not stand in for the labels (§20).
  await expect(page.getByLabel("Usuario o correo electrónico")).toHaveAttribute(
    "placeholder",
    "Ingresa tu usuario o correo",
  );
});

test("the recovery link reaches a real screen that returns to login", async ({ page }) => {
  await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();

  await expect(page).toHaveURL(/\/worker\/recuperar-acceso$/);
  await expect(page.getByRole("heading", { name: "Recuperación de acceso" })).toBeVisible();
  await expect(page.getByText("En construcción")).toBeVisible();

  await page.getByRole("link", { name: /Volver a iniciar sesión/ }).click();
  await expect(page).toHaveURL(/\/worker\/login$/);
  await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();
});

test("labels resolve to their controls with the right autocomplete", async ({ page }) => {
  const identifier = page.getByLabel("Usuario o correo electrónico");
  const password = page.getByLabel("Contraseña", { exact: true });

  await expect(identifier).toHaveAttribute("autocomplete", "username");
  await expect(password).toHaveAttribute("autocomplete", "current-password");
  await expect(password).toHaveAttribute("type", "password");
});

test("empty submit reports both fields and marks them invalid", async ({ page }) => {
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page.getByText("Introduce tu usuario o correo electrónico.")).toBeVisible();
  await expect(page.getByText("Introduce tu contraseña.")).toBeVisible();

  await expect(page.getByLabel("Usuario o correo electrónico")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );

  // Every reference must resolve, including the ones just rendered.
  const dangling = await page.evaluate(() =>
    [...document.querySelectorAll("[aria-describedby]")].flatMap((el) =>
      (el.getAttribute("aria-describedby") ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .filter((id) => !document.getElementById(id)),
    ),
  );
  expect(dangling).toEqual([]);
});

test("invalid credentials show a recoverable error and keep the form usable", async ({ page }) => {
  await signIn(page, "juan.perez", "incorrecta");

  await expect(page.getByRole("alert").filter({ hasText: "No se pudo iniciar sesión" })).toBeVisible();
  // Recoverable: the user must be able to correct and retry.
  await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeEnabled();
});

test("a blocked account closes the form", async ({ page }) => {
  await signIn(page, "bloqueado@puntocash.com", VALID_PASSWORD);

  await expect(page.getByRole("alert").filter({ hasText: "Cuenta bloqueada" })).toBeVisible();
  // Retrying cannot resolve a block, so the inputs and submit are closed.
  await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeDisabled();
  await expect(page.getByLabel("Usuario o correo electrónico")).toBeDisabled();
});

test("a network failure explains the next step", async ({ page }) => {
  await signIn(page, "error@puntocash.com", VALID_PASSWORD);

  await expect(
    page.getByRole("alert").filter({ hasText: "No se pudo conectar con PuntoCash" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeEnabled();
});

test("submitting locks the form, then correct credentials reach the 2FA step", async ({ page }) => {
  await signIn(page, "juan.perez", VALID_PASSWORD);

  // In flight: the button reports busy and the fields are locked.
  const submit = page.getByRole("button", { name: /Verificando|Iniciar sesión/ });
  await expect(submit).toHaveAttribute("aria-busy", "true");
  await expect(page.getByLabel("Usuario o correo electrónico")).toBeDisabled();

  // Correct credentials do not open a session: they emit a verification
  // challenge, and the session only exists once the code is accepted [R13].
  await expect(page).toHaveURL(/\/worker\/verificacion$/);
  await expect(page.getByRole("heading", { name: "Verifica que eres tú" })).toBeVisible();

  // Nothing of the session may be on screen before the code is verified: no
  // worker name, no caja, no sede.
  await expect(page.getByLabel("Código de verificación")).toBeVisible();
});

test("the password toggle switches visibility and reports its state", async ({ page }) => {
  const password = page.getByLabel("Contraseña", { exact: true });
  await password.fill("MiClaveSecreta");

  const show = page.getByRole("button", { name: "Mostrar contraseña" });
  await expect(show).toHaveAttribute("aria-pressed", "false");
  await show.click();

  await expect(password).toHaveAttribute("type", "text");
  const hide = page.getByRole("button", { name: "Ocultar contraseña" });
  await expect(hide).toHaveAttribute("aria-pressed", "true");

  await hide.click();
  await expect(password).toHaveAttribute("type", "password");
});
