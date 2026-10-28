import { notFound } from "next/navigation";

/** Cualquier dirección de la consola que no existe recibe el 404 dentro del shell (FR-SA-NAV-3). */
export default function DireccionInexistente(): never {
  notFound();
}
