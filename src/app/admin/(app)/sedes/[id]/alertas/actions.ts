"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/features/admin/session-server";
import { registrarEvento } from "@/features/network/audit";
import { definirReglas, resumenDeReglas, type ReglaDeMoneda } from "@/features/network/alertas";
import { mensaje } from "../../../mensajes";

export type ResultadoDeAlertas = { ok: false; error: string } | null;

/** «1.250,5» y «1250.5» son el mismo número; vacío es «sin límite». */
function numero(texto: string): number | null | "mal" {
  const t = texto.trim().replace(/\s+/g, "");
  if (t === "") return null;
  const normal = /,/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normal);
  return Number.isFinite(n) ? n : "mal";
}

/**
 * Las alertas de caja de una sede (bloque 6): por moneda, el efectivo mínimo y
 * máximo, y el mínimo de billetes de cada denominación. El formulario manda
 * `min-<moneda>`, `max-<moneda>` y `b-<moneda>-<céntimos>`; lo vacío es «sin
 * alerta».
 */
export async function guardarAlertasAction(_previo: ResultadoDeAlertas, formData: FormData): Promise<ResultadoDeAlertas> {
  const sedeId = String(formData.get("sede") ?? "");
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("sedes", "sesion-terminada") };

  const monedas = formData.getAll("moneda").map(String);
  const reglas: ReglaDeMoneda[] = [];
  for (const currency of monedas) {
    const minimo = numero(String(formData.get(`min-${currency}`) ?? ""));
    const maximo = numero(String(formData.get(`max-${currency}`) ?? ""));
    if (minimo === "mal" || maximo === "mal") {
      return { ok: false, error: `${currency}: escribe un importe válido, por ejemplo 1.500,00.` };
    }
    const billetesMinimos: Record<string, number> = {};
    for (const [campo, valor] of formData.entries()) {
      const m = new RegExp(`^b-${currency}-(\\d+)$`).exec(campo);
      if (!m) continue;
      const n = numero(String(valor));
      if (n === "mal" || (n !== null && !Number.isInteger(n))) {
        return { ok: false, error: `${currency}: los billetes mínimos son números enteros.` };
      }
      if (n !== null) billetesMinimos[m[1]!] = n;
    }
    reglas.push({ currency, minimo, maximo, billetesMinimos });
  }

  const r = definirReglas(session.scope, sedeId, reglas);
  if (!r.ok) {
    switch (r.reason) {
      case "minimo-mayor-que-maximo":
        return { ok: false, error: `${r.currency}: el mínimo no puede ser mayor que el máximo.` };
      case "importe-invalido":
        return { ok: false, error: `${r.currency}: los importes no pueden ser negativos.` };
      case "cantidad-invalida":
        return { ok: false, error: `${r.currency}: los billetes mínimos son números enteros, de cero en adelante.` };
      default:
        return { ok: false, error: mensaje("sedes", r.reason) };
    }
  }

  const sede = session.sedes.find((s) => s.id === sedeId);
  if (r.value.cambiaron && sede) {
    registrarEvento({
      actorId: session.user.id,
      actorName: session.user.fullName,
      actorRole: "admin-sede",
      type: "caja.alertas-definidas",
      subject: sede.name,
      branchId: sede.id,
      operatorId: session.operator.id,
      before: resumenDeReglas(r.value.antes),
      after: resumenDeReglas(r.value.despues),
    });
  }

  revalidatePath("/admin", "layout");
  redirect(`/admin/sedes/${sedeId}?alertas=${r.value.cambiaron ? "1" : "0"}`);
}
