# Routing architecture

Each PuntoCash product owns a top-level URL segment. Inside a product, route
groups separate screens that need the application shell from those that do not.

| Route            | Product               | Shell                                                               |
| ---------------- | --------------------- | ------------------------------------------------------------------- |
| `/worker/*`      | Worker                | Header + 240px sidebar (Inicio, Nueva operación, Operaciones, Caja) |
| `/kiosk/*`       | Kiosco inteligente    | Header only, larger controls, lower density                         |
| `/admin/*`       | Admin de sede         | Header + sidebar, higher table density                              |
| `/super-admin/*` | Super Admin PuntoCash | Header + sidebar, global views and auditing                         |

## Route groups inside a product

```
worker/
  (auth)/        screens with no shell — login, password recovery
    login/
  (app)/         screens inside the shell — added as they are built
```

`(auth)` exists so authentication screens never inherit the application shell.
When the first in-shell Worker screen arrives it goes in `(app)/layout.tsx`,
which composes `AppShell` + `AppHeader` + `AppSidebar` + `AppMain`.

Rules:

- A group's `layout.tsx` composes the shell from `@/components/shell`. It never
  re-implements it.
- Shared, cross-product business UI belongs in `src/components/patterns`.
  Product-specific UI lives beside the route that owns it.
- `/design-system` is an internal development route for validating tokens and
  primitives. It is not part of any product.

See `PuntoCash_Manual_de_Marca_y_UI_v1.pdf` §10 and §21 for the structural and
per-product rules these segments implement.
