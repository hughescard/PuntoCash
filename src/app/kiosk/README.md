# (kiosk)

See ../ARCHITECTURE.md § "Kiosk sub-products". Two products live here, each
with its own shell:

- `autoservicio/` — touch self-service; shell composed from
  `@/components/shell`, same as every other product.
- `pantalla/` — non-touch signage; the one deliberate exception to
  "the shell is composed from `@/components/shell` and must not be
  re-implemented". See its `layout.tsx` for why.
- `simulador-admin/` — DEMO-ONLY stand-in for the admin panel: links and
  unlinks the self-service kiosk and the Worker caja, which cannot be used
  until they are linked.
