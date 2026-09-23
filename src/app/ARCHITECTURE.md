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
  layout.tsx     device gate: until this computer is linked to a caja, every
                 /worker route shows the pairing screen instead (_device/)
  (auth)/        screens with no shell — login, 2FA verification, recovery
    login/         step 1 — credentials
    verificacion/  step 2 — the code sent by e-mail; no session exists yet
  (app)/         screens inside the shell — added as they are built
```

A Worker computer carries two sessions. The **device session** (the computer
is Caja 03 of a sede) is created once by the sede's admin and remembered — see
`src/features/devices/device-link.ts`, shared with the self-service kiosk. The
**Worker session** (a person operating it) is opened with password + second
factor on top of it. `worker/layout.tsx` enforces the first; `(auth)` the second.

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
    layout.tsx    AppHeader only (no sidebar), composed from @/components/shell;
                  wraps every screen in the device gate (pairing until linked)
    <servicio>/   one folder per self-service flow (cambio-moneda, remesas, giros/…)
  pantalla/       non-touch signage — played unattended on branch TVs
    layout.tsx    NOT built from @/components/shell — see the exception below
    slides/       one component per rotating slide
  simulador-admin/  DEMO-ONLY stand-in for the admin panel's "Kioscos de
                  autoservicio" and "Cajas" sections: links and unlinks the
                  kiosk and the Worker caja
```

- **`/kiosk/autoservicio`** runs on a device linked to one sede. Until the
  sede's admin links it (QR or code, the WhatsApp/Telegram linked-device
  pattern — see `src/features/kiosk/device-session.ts`), every route under it
  renders the pairing screen instead of its own content. The client who uses
  it never signs in; the device does.
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
  links or buttons to the signage content: nothing there should ever invite
  a tap it cannot respond to. The only interactive views are configuration:
  the first-start sede picker, and the confirmation that Atrás/Esc opens to
  change the sede (see `src/features/kiosk/signage-branch.ts`).
- **`/kiosk/simulador-admin`** is not a product. The admin panel does not
  exist yet, and neither a kiosk nor a Worker caja can be used until an admin
  links it, so the demo ships this stand-in to link and unlink both. Remove it
  once `/admin` has its "Kioscos de autoservicio" and "Cajas" sections.

Rules:

- A group's `layout.tsx` composes the shell from `@/components/shell`. It
  never re-implements it — except `/kiosk/pantalla`, which is deliberately not
  an application shell at all (see above).
- Shared, cross-product business UI belongs in `src/components/patterns`.
  Product-specific UI lives beside the route that owns it.
- `/design-system` is an internal development route for validating tokens and
  primitives. It is not part of any product. Its one subroute,
  `/design-system/correos`, previews the transactional e-mails: an e-mail
  cannot be validated inside the application, because its document is rewritten
  by another program, so each one is rendered in an isolated `iframe` that the
  app's own styles never reach.

See `PuntoCash_Manual_de_Marca_y_UI_v1.pdf` §10 and §21 for the structural and
per-product rules these segments implement.
