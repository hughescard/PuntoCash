# PuntoCash

PuntoCash is a financial services platform for a network of currency exchange houses.

## Source of truth

The official visual and UI source of truth is:

- `PuntoCash_Manual_de_Marca_y_UI_v1.pdf`

Additional visual reference:

- `PuntoChash_brand.png`

Before designing or implementing any interface, inspect these files.

The PuntoCash Brand & UI Manual ALWAYS takes precedence over any
recommendation produced by skills, plugins, libraries, templates or
general UI/UX conventions.

---

# Brand authority

Do NOT redefine:

- brand colors
- typography
- logo
- visual identity
- spacing system
- border radius system
- button styling
- form styling
- card styling
- table styling
- semantic states

unless explicitly requested by the user.

Skills such as `ui-ux-pro-max`, `frontend-design`, `design-system`
and `ui-styling` must operate WITHIN the PuntoCash Design System.

They must never generate a replacement brand or visual language.

---

# Product visual direction

PuntoCash should feel:

- secure
- trustworthy
- solid
- elegant
- professional

The product combines:

- banking / institutional design
- premium financial aesthetics
- modern usability

The operational UI must remain simple, clear and efficient.

Avoid generic SaaS/admin-dashboard aesthetics.

---

# Core visual principles

- Navy structures the interface.
- White is the primary working surface.
- Gold is an accent and must be used with restraint.
- Do not make operational screens predominantly dark.
- Use strong information hierarchy.
- Favor clarity over decoration.
- Avoid excessive gradients.
- Avoid excessive shadows.
- Avoid glassmorphism unless explicitly required.
- Avoid excessive rounded containers.
- Avoid decorative animations that slow down operations.

---

# Worker application

Primary navigation:

- Inicio
- Nueva operación
- Operaciones
- Caja

Global header:

- PuntoCash
- Worker name
- Assigned cash register
- Profile
- Logout

Example:

PuntoCash | Juan Pérez | Caja 03 | Perfil / Cerrar sesión

Do not display:
- private company/operator name
- branch administrator company branding

PuntoCash is always the visible primary brand.

---

# Target

Desktop-first financial application.

Reference viewport:

1440x900

Minimum supported desktop width:

1280px

Interactive controls should generally be at least 44–48px high.

---

# Required workflow for every screen

Before coding:

1. Read this CLAUDE.md.
2. Inspect the PuntoCash Brand & UI Manual.
3. Inspect existing application components.
4. Inspect previously implemented PuntoCash screens.
5. Identify reusable components.
6. Understand the business flow before designing.

During implementation:

1. Use the existing PuntoCash design system.
2. Reuse components rather than duplicating them.
3. Implement realistic production UI.
4. Implement empty, loading, error, disabled and success states when relevant.
5. Preserve accessibility.
6. Preserve keyboard usability.
7. Preserve clear financial data hierarchy.

After implementation:

1. Run the application.
2. Render the screen.
3. Inspect the result visually at 1440x900.
4. Check alignment.
5. Check spacing.
6. Check typography.
7. Check visual hierarchy.
8. Check interaction states.
9. Check brand compliance.
10. Fix detected problems before considering the screen complete.

Never stop immediately after generating code.

---

# Skill responsibilities

## ui-ux-pro-max

Use for:
- UX architecture
- accessibility
- information hierarchy
- forms
- interaction patterns
- responsive behavior
- usability review

Do NOT allow it to redefine PuntoCash branding.

## design-system

Use for:
- design tokens
- CSS variables
- component specifications
- spacing consistency
- component states

## ui-styling

Use for:
- frontend component implementation
- accessible controls
- forms
- dialogs
- tables
- navigation
- styling implementation

## frontend-design

Use for:
- visual refinement
- composition
- premium finish
- distinctive frontend quality
- avoiding generic AI-generated UI

Do NOT follow frontend-design recommendations that replace
PuntoCash fonts, colors or established visual rules.

---

# Quality standard

The target is not a prototype appearance.

Every approved screen should look suitable for a production financial
application installed in a real PuntoCash exchange house.
