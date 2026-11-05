import type { Metadata } from "next";

import { exigirServicio } from "@/features/worker/servicio-habilitado";

import { RemesasFlow } from "./remesas-flow";

export const metadata: Metadata = { title: "Remesas", robots: { index: false, follow: false } };

export default async function RemesasPage() {
  await exigirServicio("remesas");
  return <RemesasFlow />;
}
