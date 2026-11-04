import { cache } from "react";
import { cookies } from "next/headers";

import {
  SUPER_ADMIN_SESSION_COOKIE,
  parseSuperAdminSession,
  resolveSuperAdminSession,
  type SuperAdminSession,
} from "./session";

/** La sesión leída en el servidor, una vez por petición (ver el gemelo de Admin). */
export const getSuperAdminSession = cache(async function getSuperAdminSession(): Promise<SuperAdminSession | null> {
  const store = await cookies();
  const userId = parseSuperAdminSession(store.get(SUPER_ADMIN_SESSION_COOKIE)?.value);
  return userId ? resolveSuperAdminSession(userId) : null;
});
