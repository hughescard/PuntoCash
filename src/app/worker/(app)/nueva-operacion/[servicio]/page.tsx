import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UnderConstruction } from "@/components/patterns/under-construction";
import { WORKER_SERVICES, findService } from "@/features/operations/services";

interface PageProps {
  params: Promise<{ servicio: string }>;
}

/**
 * Only the known services resolve; anything else is a 404, not a placeholder.
 *
 * Built services are excluded: they own a dedicated static route which Next
 * resolves ahead of this dynamic one, so prerendering a placeholder for them
 * would only produce dead output.
 */
export function generateStaticParams() {
  return WORKER_SERVICES.filter((service) => service.status !== "available").map((service) => ({
    servicio: service.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { servicio } = await params;
  const service = findService(servicio);

  return {
    title: service?.name ?? "Servicio",
    robots: { index: false, follow: false },
  };
}

/**
 * One placeholder covering every service flow, so every card on the selector
 * leads somewhere real while the flows are still being designed. Replace each
 * with its own route as it is built.
 *
 * Back goes to the selector rather than Inicio: it is where the worker came
 * from, and where they would pick a different service.
 */
export default async function ServicioPage({ params }: PageProps) {
  const { servicio } = await params;
  const service = findService(servicio);

  if (!service) notFound();

  return (
    <UnderConstruction
      embedded
      title={service.name}
      description={`${service.description} Este flujo todavía está en diseño.`}
      backHref="/worker/nueva-operacion"
      backLabel="Volver a Nueva operación"
    />
  );
}
