import type { Metadata } from "next";

import { OperationDetailView } from "./operation-detail-view";

interface PageProps {
  params: Promise<{ codigo: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { codigo } = await params;
  return {
    title: `Operación ${codigo}`,
    robots: { index: false, follow: false },
  };
}

/**
 * Thin server wrapper — see `operation-detail-view.tsx` for why the lookup
 * itself must run client-side.
 */
export default async function OperacionDetallePage({ params }: PageProps) {
  const { codigo } = await params;
  return <OperationDetailView codigo={codigo} />;
}
