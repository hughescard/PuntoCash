"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Store } from "lucide-react";

import { cn } from "@/lib/utils";
import { direccionParaOtraSede } from "@/lib/filtros-en-url";
import {
  ADMIN_SCOPE_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  ALCANCE_TODAS,
} from "@/features/admin/session";
import { seleccionarAlcance } from "@/app/admin/_actions";

/**
 * Selector de alcance de la cabecera — **FR-AD-SCOPE-2 a FR-AD-SCOPE-5**.
 *
 * No amplía nada: el alcance lo fija la sesión y esto solo elige dentro de él.
 * Por eso ofrece "Todas mis sedes" más las sedes que el servidor ya resolvió;
 * la lista llega como propiedad y este componente nunca consulta el dominio.
 *
 * ── Por qué un `select` nativo y no el `Select` del sistema ───────────────
 * El `Select` del sistema (Radix) está definido sobre superficie clara y no
 * envía formularios por sí mismo. Aquí hacen falta las dos cosas: el control
 * vive sobre navy, y la elección se guarda con una **acción de servidor** para
 * que la siguiente representación ya venga filtrada desde el servidor. Un
 * `select` nativo dentro de un formulario da exactamente eso, con teclado y
 * lectores de pantalla incluidos, y sin inventar un patrón visual nuevo: usa
 * los mismos tokens que los enlaces de la cabecera.
 *
 * ── Por qué cambiar de sede recarga la página ────────────────────────────
 * Costó tres intentos llegar aquí, así que conviene dejarlo escrito.
 *
 * El selector vive en el **layout** y lo que filtra vive debajo. Guardar la
 * cookie con una acción de servidor no basta, ni siquiera redirigiendo: el
 * enrutador de Next resuelve esa navegación de forma blanda y **reutiliza el
 * segmento del layout que ya tenía en caché**. El resultado era siempre el
 * mismo — la pantalla filtrada por Vedado bajo un selector que seguía diciendo
 * "Todas mis sedes"— y esa opción quedaba además inservible, porque elegir lo
 * que el control ya muestra no dispara ningún cambio.
 *
 * Se comprobó midiendo: tras recargar a mano, layout y pantalla coincidían.
 * O sea que el dato era correcto y lo que fallaba era quién lo volvía a leer.
 *
 * Así que el control escribe la cookie él mismo y pide una **carga completa**.
 * No hay caché de enrutador que valga: layout y pantalla se generan juntos con
 * la misma cookie. Es más caro que una navegación blanda, y es el precio
 * correcto para algo que se hace unas pocas veces al día y que no puede
 * mostrar dos verdades a la vez.
 *
 * La acción de servidor sigue existiendo para quien no tenga JavaScript.
 *
 * ── Por qué está controlado y no con `defaultValue` ──────────────────────
 * Con `defaultValue`, React vuelve a aplicar ese valor en **cada** nueva
 * representación de un `select` sin controlar. Como este componente vive en el
 * layout y lo que filtra vive debajo, bastaba con que el layout llegara con la
 * sede anterior para que el control volviera solo a "Todas mis sedes" con la
 * tabla ya filtrada — y, peor, para que esa opción quedara inservible, porque
 * elegir lo que el control ya muestra no dispara ningún cambio.
 *
 * Controlado, la elección se ve en el acto y el servidor la confirma después.
 * Si el servidor responde otra cosa —la sede dejó de estar asignada a mitad de
 * sesión, FR-AD-SCOPE-6— manda el servidor, que es lo correcto.
 */
export function ScopeSelector({
  id,
  sedes,
  selectedId,
  block = false,
}: {
  /**
   * Único por instancia: la cabecera y la franja del teléfono representan cada
   * una la suya, y dos controles con el mismo `id` romperían la asociación con
   * su etiqueta justo en el que está visible.
   */
  id: string;
  /** Cada entrada se identifica por **código y nombre** (**FR-AD-SCOPE-2**). */
  sedes: readonly { id: string; code: string; name: string }[];
  selectedId: string | null;
  /** A todo lo ancho, como en la franja de alcance del teléfono. */
  block?: boolean;
}): React.JSX.Element {
  const pathname = usePathname();

  const [value, setValue] = React.useState(selectedId ?? ALCANCE_TODAS);

  /* El servidor tiene la última palabra: cuando llega con otra sede —o sin
     ninguna, FR-AD-SCOPE-6— el control se pone al día.

     Se ajusta **durante el render**, comparando con lo último que dijo el
     servidor, y no en un efecto: es el patrón que React documenta para
     «ajustar estado cuando cambia una propiedad», y evita el render en cascada
     de un `setState` dentro de un efecto. Importa que siga siendo controlado:
     un `<select>` no controlado vuelve a su `defaultValue` en cada
     actualización, que es el defecto que tenía este control. */
  const [ultimoDelServidor, setUltimoDelServidor] = React.useState(selectedId);
  if (ultimoDelServidor !== selectedId) {
    setUltimoDelServidor(selectedId);
    setValue(selectedId ?? ALCANCE_TODAS);
  }

  function elegir(next: string) {
    setValue(next);
    recordarAlcance(next);
    // Carga completa, no navegación del enrutador — ver la nota de arriba.
    // FR-AD-SCOPE-5: con los filtros de la pantalla, salvo los de una sede.
    window.location.assign(direccionParaOtraSede(pathname, window.location.search));
  }

  return (
    <form
      action={seleccionarAlcance}
      className={cn("flex items-center", block && "w-full")}
    >
      {/* La acción redirige aquí mismo: el cambio de sede es una navegación,
          no una mutación silenciosa, y así el layout y la pantalla se vuelven a
          pedir juntos con la cookie ya puesta. */}
      <input type="hidden" name="desde" value={pathname} />

      <label htmlFor={id} className="sr-only">
        Sede que estás viendo
      </label>

      <div className={cn("relative flex items-center", block && "w-full")}>
        <Store
          className="pointer-events-none absolute left-3 size-[18px] text-gold"
          aria-hidden="true"
        />

        <select
          id={id}
          name="sede"
          value={value}
          onChange={(event) => elegir(event.currentTarget.value)}
          className={cn(
            "h-control-sm appearance-none rounded-control",
            block ? "w-full" : "min-w-[14rem]",
            "border border-white/20 bg-white/[0.08] pl-10 pr-9",
            "text-label font-medium text-white",
            "transition-colors duration-(--duration-fast) ease-(--ease-standard)",
            "hover:border-white/30 hover:bg-white/[0.12]",
            "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-gold",
            /* Las opciones las pinta el sistema operativo sobre superficie
               clara, así que su color se fija aparte del control. */
            "[&>option]:bg-surface [&>option]:text-text-primary",
          )}
        >
          <option value={ALCANCE_TODAS}>Todas mis sedes</option>
          {sedes.map((sede) => (
            <option key={sede.id} value={sede.id}>
              {sede.code} — {sede.name}
            </option>
          ))}
        </select>

        <ChevronDown
          className="pointer-events-none absolute right-3 size-[18px] text-text-on-primary-muted"
          aria-hidden="true"
        />
      </div>

      {/* Sin JavaScript el cambio no se envía solo; el botón lo hace posible y
          desaparece en cuanto hay JavaScript, para no duplicar el control. */}
      <noscript>
        <button
          type="submit"
          className="ml-2 h-control-sm rounded-control border border-white/20 px-3 text-label text-white"
        >
          Aplicar
        </button>
      </noscript>
    </form>
  );
}

/**
 * Deja constancia de la sede elegida donde el servidor la leerá en la próxima
 * petición. La escribe el cliente a propósito: es un filtro de vista, no una
 * autorización, y el servidor vuelve a decidir en cada petición qué sedes
 * alcanza la sesión (`resolveAdminSession`).
 */
function recordarAlcance(value: string): void {
  const comun = `path=/admin; samesite=lax`;

  document.cookie =
    value === ALCANCE_TODAS
      ? `${ADMIN_SCOPE_COOKIE}=; ${comun}; max-age=0`
      : `${ADMIN_SCOPE_COOKIE}=${encodeURIComponent(value)}; ${comun}; max-age=${ADMIN_SESSION_MAX_AGE_SECONDS}`;
}

/**
 * FR-AD-SCOPE-6: la sede elegida ya no es de la empresa. Se olvida la elección
 * en cuanto se avisa, para que el aviso salga una sola vez y para que, si esa
 * sede vuelve a asignarse más adelante, la consola no se filtre sola a ella.
 */
export function OlvidarAlcance(): null {
  React.useEffect(() => {
    recordarAlcance(ALCANCE_TODAS);
  }, []);
  return null;
}
