import { test, expect, type Page } from "@playwright/test";

/**
 * Accessibility contract for the form foundation.
 *
 * `Field` renders the label, description and error; `fieldAria(spec)` produces
 * the `id` / `aria-describedby` / `aria-invalid` / `aria-required` the control
 * must carry. Nothing forces a caller to apply `fieldAria` — spreading it is a
 * convention, not a type error — so these tests are what catch a screen that
 * renders a `<Field>` and forgets to wire its control.
 *
 * The `/design-system` form examples are the fixture: every supported control
 * shape appears there once.
 */

/** One row per control rendered in the "Formularios" section. */
const FORM_FIELDS = [
  {
    label: "Nombre del cliente",
    describedBy: "Tal como aparece en el documento de identidad.",
  },
  {
    label: "Importe a entregar",
    required: true,
  },
  {
    label: "Importe a recibir",
    invalid: true,
    describedBy: "La caja no dispone de suficiente EUR para completar esta operación.",
  },
  {
    label: "Campo deshabilitado",
  },
  {
    label: "Moneda de origen",
    describedBy: "Se muestra código y nombre completo.",
  },
  {
    label: "Tipo de operación",
    invalid: true,
    describedBy: "Selecciona un tipo de operación para continuar.",
  },
  {
    label: "Selector deshabilitado",
  },
] as const;

/**
 * Single place where the label-matching strategy lives.
 *
 * Matching is intentionally not `exact`: a required field renders a visual "*"
 * inside its `<label>`, and while that span is `aria-hidden` (so screen readers
 * announce the clean name), Playwright's getByLabel matches the label's text
 * content and does see it. Substring matching keeps the test user-facing
 * without hard-coding the asterisk into every expectation.
 */
function control(page: Page, label: string) {
  return page.getByLabel(label);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/design-system");
});

test.describe("label ↔ control association", () => {
  for (const field of FORM_FIELDS) {
    test(`"${field.label}" resolves to exactly one control`, async ({ page }) => {
      // getByLabel is user-facing: it only matches if the label is genuinely
      // associated with the control, which is the whole point of fieldAria.
      const el = control(page, field.label);
      await expect(el).toHaveCount(1);
      await expect(el).toBeVisible();
    });
  }
});

test.describe("aria state", () => {
  for (const field of FORM_FIELDS) {
    test(`"${field.label}" exposes the expected aria state`, async ({ page }) => {
      const el = control(page, field.label);
      await expect(el).toBeVisible();

      // Asserted in both directions, so a field that silently loses the
      // attribute fails just as loudly as one that gains it.
      const required = "required" in field && field.required;
      const invalid = "invalid" in field && field.invalid;

      expect(await el.getAttribute("aria-required")).toBe(required ? "true" : null);
      expect(await el.getAttribute("aria-invalid")).toBe(invalid ? "true" : null);
    });
  }
});

test.describe("description and error association", () => {
  for (const field of FORM_FIELDS) {
    const expected = "describedBy" in field ? field.describedBy : undefined;

    test(`"${field.label}" ${expected ? "describes" : "omits"} its helper text`, async ({
      page,
    }) => {
      const el = control(page, field.label);
      await expect(el).toBeVisible();
      const describedBy = await el.getAttribute("aria-describedby");

      if (!expected) {
        expect(describedBy).toBeNull();
        return;
      }

      expect(describedBy).not.toBeNull();
      // The referenced element must exist and carry the expected message, which
      // is what ties an error to its own control rather than a neighbour's.
      const target = page.locator(`#${describedBy}`);
      await expect(target).toHaveCount(1);
      await expect(target).toHaveText(expected);
    });
  }
});

test.describe("page-wide invariants", () => {
  test("every aria-describedby reference resolves to a real element", async ({ page }) => {
    const dangling = await page.evaluate(() =>
      [...document.querySelectorAll("[aria-describedby]")].flatMap((el) =>
        (el.getAttribute("aria-describedby") ?? "")
          .split(/\s+/)
          .filter(Boolean)
          .filter((id) => !document.getElementById(id))
          .map((id) => ({ control: el.id || el.tagName.toLowerCase(), missing: id })),
      ),
    );

    expect(dangling).toEqual([]);
  });

  test("every label[for] points at an element that exists", async ({ page }) => {
    const orphaned = await page.evaluate(() =>
      [...document.querySelectorAll("label[for]")]
        .map((el) => el.getAttribute("for") ?? "")
        .filter((id) => !document.getElementById(id)),
    );

    expect(orphaned).toEqual([]);
  });

  test("no duplicate element ids", async ({ page }) => {
    const duplicates = await page.evaluate(() => {
      const seen = new Map<string, number>();
      for (const el of document.querySelectorAll("[id]")) {
        seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
      }
      return [...seen.entries()].filter(([, n]) => n > 1).map(([id, n]) => `${id} ×${n}`);
    });

    expect(duplicates).toEqual([]);
  });
});

test.describe("select controls stay associated", () => {
  test("the currency select opens from its label and lists options", async ({ page }) => {
    // Opening by label proves the label targets the trigger, not the Radix root.
    const trigger = control(page, "Moneda de origen");
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("option")).toHaveCount(4);
    await expect(page.getByRole("option", { name: "USD — Dólar estadounidense" })).toBeVisible();
  });

  test("the disabled select is reachable by label and stays disabled", async ({ page }) => {
    await expect(control(page, "Selector deshabilitado")).toBeDisabled();
  });
});
