import * as React from "react";

import { AppHeader, AppMain, AppShell } from "@/components/shell/app-shell";
import { Logo } from "@/components/brand/logo";
import { getCurrentWorker } from "@/features/worker/session";
import { WorkerIdentity } from "./worker-identity";
import { WorkerSidebar } from "./worker-sidebar";

/**
 * Authenticated Worker shell — manual §10 "Estructura global de las aplicaciones".
 *
 *   Header 72px · Sidebar 240px · Área principal con padding de 32px
 *
 * Every operational Worker screen inherits this. The `(auth)` group next to it
 * deliberately does not, so sign-in and recovery stay full-screen.
 *
 * Screens must not render their own header or sidebar.
 */
export default function WorkerAppLayout({ children }: { children: React.ReactNode }) {
  const worker = getCurrentWorker();

  return (
    <AppShell
      header={
        <AppHeader
          brand={<Logo variant="onDark" size="md" />}
          actions={<WorkerIdentity worker={worker} />}
        />
      }
      sidebar={<WorkerSidebar />}
    >
      <AppMain>{children}</AppMain>
    </AppShell>
  );
}
