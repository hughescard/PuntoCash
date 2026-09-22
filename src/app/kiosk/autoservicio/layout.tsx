import * as React from "react";
import Link from "next/link";

import { AppHeader, AppMain, AppShell } from "@/components/shell/app-shell";
import { Logo } from "@/components/brand/logo";
import { Home } from "lucide-react";

/**
 * Self-service kiosk shell — manual §10 structure, §21 "Kiosco inteligente"
 * pattern: header only, no sidebar, larger controls, guided navigation.
 *
 * Unlike the Worker shell, there is no signed-in identity to show in the
 * header — a kiosk has no operator, so the header carries only the brand and
 * a single, always-available way back to the start. Screens inside a flow add
 * their own "Cancelar" affordance (see `KioskFlowHeader`), matching how the
 * Worker flows keep exactly one escape hatch per screen.
 */
export default function KioskAutoservicioLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      header={
        <AppHeader
          brand={<Logo variant="onDark" size="md" showDescriptor />}
          actions={
            <Link
              href="/kiosk/autoservicio"
              className="inline-flex h-control items-center gap-2 rounded-control px-4 text-label font-semibold text-white transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:bg-white/[0.08] outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <Home className="size-[18px]" aria-hidden="true" />
              Inicio
            </Link>
          }
        />
      }
    >
      <AppMain>{children}</AppMain>
    </AppShell>
  );
}
