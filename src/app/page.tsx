import { redirect } from "next/navigation";

/**
 * The Worker application is the primary product, and authentication is its
 * entry point. `/design-system` remains reachable directly for internal
 * design validation.
 */
export default function RootPage(): never {
  redirect("/worker/login");
}
