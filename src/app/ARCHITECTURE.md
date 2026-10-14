# Routing architecture

Each PuntoCash product owns a top-level URL segment. Inside a product, route
groups separate screens that need the application shell from those that do not.

| Route            | Product               | Shell                                                               |
| ---------------- | --------------------- | ------------------------------------------------------------------- |
| `/worker/*`      | Worker                | Header + 240px sidebar (Inicio, Nueva operación, Operaciones, Caja) |
| `/kiosk/*`       | Kiosco inteligente    | Two sub-products, each with its own shell — see below               |
| `/admin/*`       | Admin de sede         | Header + sidebar en tres bloques, higher table density              |
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
factor on top of it.

`worker/layout.tsx` enforces the device session: it reads the mirror cookie and
`RegisterDeviceGate` decides between the pairing screen and the application.
The worker session is **opened** in `(auth)` — the verification screen is the
only way through — but nothing re-checks it afterwards: `(app)/layout.tsx`
calls `getCurrentWorker()`, which is a mock that always returns Juan Pérez, so
typing an in-shell URL reaches it. That is deliberate in the demo (session
validity is out of the Worker FRD's scope, §16, and an in-memory gate would
expel a worker mid-jornada on any full reload), and it is the one place where
Worker and `/admin` differ: the admin shell does redirect on a missing session.
A real implementation puts the check in `(app)/layout.tsx`, mirroring
`admin/(app)/layout.tsx`.

`(auth)` exists so authentication screens never inherit the application shell.
Both access steps live there for the same reason: until the verification code is
accepted there is no session, so no worker name, caja or sede may be on screen.
When the first in-shell Worker screen arrives it goes in `(app)/layout.tsx`,
which composes `AppShell` + `AppHeader` + `AppSidebar` + `AppMain`.

## Admin console

```
admin/
  page.tsx       redirects to Inicio — `/admin` is the product's name, not a screen
  _actions.ts    the three state writes: open session, close it, pick a sede
  (auth)/        screens with no shell — login, 2FA verification, recovery
  (app)/         screens inside the shell
    layout.tsx   resolves the session AND the scope, on the server, before
                 rendering anything; redirects to `(auth)` when there is none
    not-found.tsx what an unknown route AND another operator's sede both return
```

Unlike Worker, `/admin` is **not** used on a linked terminal: there is no device
gate and no pairing screen (FR-AD-NAV-4). It opens from any browser, a phone
included — which §3 of its FRD actually requires, because linking a caja by QR
means holding the console in front of the machine being linked.

Two decisions worth keeping:

- **The session decides on the server.** `(app)/layout.tsx` reads the session
  cookie and composes the scope before a single tag is sent. This is the
  Worker device-gate lesson applied up front: an access decision taken in the
  client forces the whole app out of server rendering, and with it go the first
  paint and the real 404s (FR-DEV-1.1).
- **Scope is derived, never chosen** (rule A1). The header selector only
  filters *within* what the session already reaches, and screens read their
  sedes through `sedesVisibles(session)` rather than querying the domain — so
  filtering is not a precaution someone has to remember.

Both access steps of both products share one screen component,
`@/components/patterns/two-factor-form`: the FRD is explicit that the flow is
the same without variation (FR-AD-ACC-2), and a security formality is the last
thing worth keeping in two places.

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
