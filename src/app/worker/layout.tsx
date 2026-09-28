import * as React from "react";
import { cookies } from "next/headers";

import { DEVICE_COOKIE_NAMES, parseDeviceCookie } from "@/features/devices/device-cookie";
import { RegisterDeviceGate } from "./_device/register-device-gate";

/**
 * Toda ruta de Worker se usa en un equipo vinculado a una caja de una sede
 * (Worker FRD §2.1, FR-DEV-1.1).
 *
 * El servidor lee la cookie espejo del vínculo
 * (`features/devices/device-cookie.ts`) y le dice al gate qué debe pintar
 * **antes de hidratar**. Eso es lo que evita el fotograma en blanco que tenía
 * la versión anterior, en la que el gate no podía saber nada hasta que el
 * navegador se lo contaba.
 *
 * `children` se renderiza siempre en el servidor, tanto si el equipo está
 * vinculado como si no, y es el gate quien elige mostrarlo. Es deliberado:
 * es lo que mantiene el render de servidor de toda la aplicación y, con él,
 * que una ruta inexistente responda **404** de verdad, porque `notFound()`
 * llega a ejecutarse. El coste es que el HTML de la aplicación viaja también
 * a un equipo sin vincular; en una demostración con datos simulados eso no
 * expone nada, y con la credencial emitida por el servidor (**FR-DEV-8**) el
 * servidor podrá decidir de verdad y dejar de enviarlo.
 */
export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const device = parseDeviceCookie(store.get(DEVICE_COOKIE_NAMES.caja)?.value);

  return <RegisterDeviceGate serverLinked={device !== null}>{children}</RegisterDeviceGate>;
}
