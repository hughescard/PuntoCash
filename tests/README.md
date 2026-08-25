# UI tests

Regression tests for the design-system foundation. Run with:

```
npm run test:ui
```

The Playwright config starts `npm run dev` automatically, and reuses a dev
server you already have running.

## What is covered

`design-system-forms.spec.ts` guards the **form accessibility contract**.

`Field` renders the label, description and error; `fieldAria(spec)` produces the
`id` / `aria-describedby` / `aria-invalid` / `aria-required` that the control
must carry. Applying `fieldAria` is a convention — nothing in the type system
forces it — so a screen can render a perfectly valid-looking `<Field>` whose
control is not associated with its label at all. These tests are what catch it.

The `/design-system` form examples are the fixture: every supported control
shape (text input, amount input with a currency prefix, error state, disabled
input, Radix select, disabled select) appears there exactly once.

Checks:

| Area              | Assertion                                                        |
| ----------------- | ---------------------------------------------------------------- |
| Label association | `getByLabel()` resolves to exactly one visible control            |
| Required          | `aria-required="true"` present — and absent when not required     |
| Invalid           | `aria-invalid="true"` present — and absent when valid             |
| Descriptions      | `aria-describedby` resolves and carries the expected message      |
| Errors            | the referenced element is the field's own error, not a neighbour's |
| Selects           | the label targets the trigger, which opens and lists its options  |
| Page-wide         | no dangling `aria-describedby`, no orphaned `label[for]`, no duplicate ids |

Assertions are made in **both directions** — a field that silently loses an
attribute fails as loudly as one that gains it.

## Adding a field

Add a row to `FORM_FIELDS` in the spec. The three per-field suites are
table-driven, so one row extends all of them.

## Verifying the tests still bite

These tests are only worth their runtime if they fail when the contract breaks.
To confirm, delete a `{...fieldAria(...)}` spread from one control in
`src/app/design-system/showcase.tsx` and re-run: it should fail four checks
across four suites. Restore it afterwards.

## Scope

These do **not** test visual appearance, tokens or layout. Brand compliance is
verified by rendering `/design-system` at 1440×900 and reviewing it against
`PuntoCash_Manual_de_Marca_y_UI_v1.pdf`.
