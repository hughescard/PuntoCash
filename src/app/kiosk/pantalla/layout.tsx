import * as React from "react";

import { Logo } from "@/components/brand/logo";
import { ClockDisplay } from "./clock-display";

/**
 * Signage shell for `/kiosk/pantalla` — the non-touch screen played on branch
 * TVs (manual §21 "Kiosco / pantalla inteligente": alto contraste, mensajes
 * breves, marca visible).
 *
 * Deliberately NOT built from `@/components/shell` (`AppShell`/`AppHeader`):
 * that shell is the light, mouse-and-keyboard operational surface shared by
 * Worker/Admin, with a 1280px minimum width, and this is a different kind of
 * product entirely — full-bleed, unattended, viewed from a distance, with
 * nothing on the screen a person can click. The one place the existing
 * product already goes fully navy for brand presence is `BrandPanel`
 * (sign-in); this shell follows that same precedent.
 *
 * ── Target screens ──────────────────────────────────────────────────────
 * Reference hardware is a 32" TV, landscape, at either of its two common
 * panel resolutions (1366×768 and 1920×1080), plus vertical screens
 * (1080×1920). The screen never scrolls, so everything is sized from one
 * viewport-derived base font size and expressed in `em` below it:
 *
 *   base = min(1.85vh, 2.1vw)
 *     1920×1080 → 20px     1366×768 → ~14px     1080×1920 → ~23px
 *
 * Height governs in landscape, width governs in portrait, so the same
 * composition keeps its proportions — and its physical size on a 32" panel —
 * whatever the resolution. Layout differences between orientations use
 * Tailwind's `landscape:` / `portrait:` variants inside each slide.
 *
 * The logo is the one element sized in `rem` by the shared brand component,
 * so it switches lockup size by viewport height instead of scaling.
 *
 * While it plays, nothing in this subtree renders a link, a button or any
 * focusable control. The two exceptions are configuration, never content:
 * the first-start sede picker (`branch-picker.tsx`) and the "¿Cambiar la
 * sede?" confirmation that Atrás/Esc opens (`signage-screen.tsx`).
 */
export default function KioskPantallaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-primary text-[length:min(1.85vh,2.1vw)] text-white">
      <header className="flex shrink-0 items-center justify-between gap-[2em] px-[2.5em] pt-[2em] pb-[1.5em]">
        <span className="hidden [@media(max-height:899px)]:block">
          <Logo variant="onDark" size="lg" showDescriptor />
        </span>
        <span className="hidden [@media(min-height:900px)_and_(max-height:1599px)]:block">
          <Logo variant="onDark" size="xl" showDescriptor />
        </span>
        <span className="hidden [@media(min-height:1600px)]:block">
          <Logo variant="onDark" size="2xl" showDescriptor />
        </span>
        <ClockDisplay />
      </header>

      <div aria-hidden="true" className="mx-[2.5em] h-px shrink-0 bg-white/10" />

      <main className="flex min-h-0 flex-1 flex-col px-[2.5em] py-[1.75em]">{children}</main>
    </div>
  );
}
