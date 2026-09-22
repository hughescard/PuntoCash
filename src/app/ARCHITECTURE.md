# Routing architecture

Each PuntoCash product owns a top-level URL segment. Inside a product, route
groups separate screens that need the application shell from those that do not.

| Route            | Product               | Shell                                                               |
| ---------------- | --------------------- | ------------------------------------------------------------------- |
| `/worker/*`      | Worker                | Header + 240px sidebar (Inicio, Nueva operación, Operaciones, Caja) |
| `/kiosk/*`       | Kiosco inteligente    | Two sub-products, each with its own shell — see below               |
| `/admin/*`       | Admin de sede         | Header + sidebar, higher table density                              |
| `/super-admin/*` | Super Admin PuntoCash | Header + sidebar, global views and auditing                         |

## Route groups inside a product

```
worker/
  (auth)/        screens with no shell — login, 2FA verification, recovery
    login/         step 1 — credentials
    verificacion/  step 2 — the code sent by e-mail; no session exists yet
  (app)/         screens inside the shell — added as they are built
```

`(auth)` exists so authentication screens never inherit the application shell.
Both access steps live there for the same reason: until the verification code is
accepted there is no session, so no worker name, caja or sede may be on screen.
When the first in-shell Worker screen arrives it goes in `(app)/layout.tsx`,
which composes `AppShell` + `AppHeader` + `AppSidebar` + `AppMain`.

## Kiosk sub-products

`/kiosk` splits into two products that share nothing but the URL prefix and
the domain model in `src/features/kiosk` — they run on different hardware for
different people, and each has its own shell:

```
kiosk/
  autoservicio/   touch self-service — a client operates this directly
    layout.tsx    AppHeader only (no sidebar), composed from @/components/shell
    <servicio>/   one folder per self-service flow (cambio-moneda, remesas, giros/…)
  pantalla/       non-touch signage — played unattended on branch TVs
    layout.tsx    NOT built from @/components/shell — see the exception below
    slides/       one component per rotating slide
```

- **`/kiosk/autoservicio`** only ever prepares a request — it never moves cash
  and never completes a service on its own (see the domain note atop
  `src/features/kiosk/self-service-request.ts`). Every flow ends on a request
  code a Worker resolves at the counter. It follows the same shell rule as
  Worker: `layout.tsx` composes `AppShell` + `AppHeader`, just without a
  sidebar (manual §21, "Kiosco / pantalla inteligente": header only, larger
  controls, guided navigation).
- **`/kiosk/pantalla`** is the one screen in the product exempt from "compose
  the shell, never re-implement it": it is not an application a person
  operates, it is unattended signage with zero interactive controls, viewed
  from across a room. Its `layout.tsx` builds a full-bleed, navy,
  high-contrast surface instead of `AppShell` — the same brand-forward
  treatment the sign-in `BrandPanel` already uses, applied to the one other
  place the product deliberately goes fully navy. Do not add navigation,
  links or buttons anywhere under `pantalla/`: nothing there should ever
  invite a tap it cannot respond to.

Rules:

- A group's `layout.tsx` composes the shell from `@/components/shell`. It
  never re-implements it — except `/kiosk/pantalla`, which is deliberately not
  an application shell at all (see above).
- Shared, cross-product business UI belongs in `src/components/patterns`.
  Product-specific UI lives beside the route that owns it.
- `/design-system` is an internal development route for validating tokens and
  primitives. It is not part of any product.

See `PuntoCash_Manual_de_Marca_y_UI_v1.pdf` §10 and §21 for the structural and
per-product rules these segments implement.
