import { notFound } from "next/navigation";

/**
 * Cualquier dirección de la consola que no existe — **FR-AD-NAV-3**.
 *
 * Sin esto, una dirección mal escrita como `/admin/foo` recibe la página por
 * defecto del marco, en inglés y sin el shell. Así recibe exactamente lo mismo
 * que un recurso inexistente o de otra empresa: «No encontramos lo que
 * buscabas», dentro del shell (`not-found.tsx`).
 */
export default function DireccionInexistente(): never {
  notFound();
}
