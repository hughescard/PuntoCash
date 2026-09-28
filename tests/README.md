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

## Antes de cualquier prueba de `/worker`: el equipo está vinculado

Desde que el equipo de cada caja se vincula (Worker FRD §2.1), `RegisterDeviceGate`
envuelve **todas** las rutas de `/worker` y muestra la pantalla de vinculación —no el
inicio de sesión, no el shell— mientras ese vínculo no existe. El vínculo vive en el
`localStorage` del propio equipo.

Un contexto de navegador arranca vacío, así que sin sembrarlo ninguna prueba de Worker
vería la aplicación. `playwright.config.ts` lo siembra en `use.storageState`, apuntando a
**Caja 03 de PuntoCash Vedado**, que es la única caja con datos operativos simulados
(saldos, jornada, movimientos) y la misma que el simulador de la demo permite elegir.

Es la línea base honesta: en producción una caja es una máquina que un administrador ya
vinculó, y ninguna prueba trata del momento anterior a eso. Una prueba futura que
necesite ver la pantalla de vinculación se sale por archivo con
`test.use({ storageState: undefined })`.

Si aparecen fallos masivos en todo `/worker` —incluido el propio login, fallando en su
primera aserción—, esto es lo primero que hay que mirar.

Desde que la decisión la toma el servidor leyendo la cookie espejo (FR-DEV-1.1), el vínculo hay que
sembrarlo en **los dos sitios**: `localStorage`, que es la fuente de verdad a la que el terminal
reacciona, y la cookie `pc_caja_device`, que es lo que el layout lee. Sembrar solo uno deja al servidor
y al cliente en desacuerdo, y la suite entraría en un refresco por navegación. `playwright.config.ts`
siembra los dos a la vez y los deriva del mismo objeto, para que no puedan separarse.

Con eso una caja vinculada llega con el shell ya pintado desde el servidor. Las esperas
`await page.getByRole("main").waitFor()` repartidas por las specs siguen siendo correctas y se
mantienen: cubren el primer arranque de un equipo y, sobre todo, las re-navegaciones a mitad de prueba,
donde una lectura sincrónica del DOM —`.count()`, `allTextContents()`, `$$eval`, `page.evaluate`— no
espera a nada y mide una tabla que se está rehaciendo.

## Pruebas de dominio, sin navegador

`caja-domain-*.spec.ts` y `network-domain.spec.ts` comprueban reglas, no pantallas: no
usan `page`. `network-domain.spec.ts` corre **en serie** porque el dominio es un mock en
memoria con estado compartido, y toda prueba que muta deja el estado como lo encontró.

## Scope

These do **not** test visual appearance, tokens or layout. Brand compliance is
verified by rendering `/design-system` at 1440×900 and reviewing it against
`PuntoCash_Manual_de_Marca_y_UI_v1.pdf`.
