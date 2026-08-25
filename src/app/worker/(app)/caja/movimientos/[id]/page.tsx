import type { Metadata } from "next";

import { CashMovementDetailView } from "./cash-movement-detail-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Movimiento ${id}`,
    robots: { index: false, follow: false },
  };
}

/**
 * Thin server wrapper — see `cash-movement-detail-view.tsx` for why the
 * lookup itself must run client-side (a movement created moments ago by
 * Ajustar efectivo/Registrar fondeo inicial only exists in the browser's
 * copy of the mock ledger).
 */
export default async function CajaMovimientoDetallePage({ params }: PageProps) {
  const { id } = await params;
  return <CashMovementDetailView movementId={id} />;
}
