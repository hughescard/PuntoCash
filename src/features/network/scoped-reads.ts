/**
 * LAS LECTURAS CON ALCANCE — la cara de este dominio que ve una consola.
 *
 * ── Qué problema resuelve ─────────────────────────────────────────────────
 * Hasta aquí, la resolución del alcance y **todas las escrituras** recibían un
 * `Scope` explícito, pero las **lecturas por sede** no: `registersOf`,
 * `workersOf`, `kioscosDeSede` y compañía se indexan por identificador y
 * contestan por cualquier sede de la red. No había fuga, porque cada pantalla
 * solo les pasaba sedes salidas de `sedesVisibles(session)` — pero la garantía
 * era de **disciplina**: la primera pantalla que leyera un identificador de la
 * URL y preguntara directamente, filtraba la red entera sin que nada se
 * quejara.
 *
 * Esto cambia el orden: una consola no obtiene las lecturas, obtiene una
 * **vista ya atada a su alcance**. Fuera de ese alcance toda respuesta es la
 * de algo que no existe —`null`, lista vacía—, que es exactamente lo que
 * **FR-AD-NAV-2** y **FR-AD-NAV-3** exigen: una sede ajena y una inexistente
 * no se distinguen. Si se distinguieran, probar identificadores bastaría para
 * averiguar qué administra otra empresa.
 *
 * La regla operativa, y está impuesta por `eslint.config.mjs`: **dentro de
 * `src/app/admin` no se importan las lecturas en bruto**, se pide esta vista.
 * Dos sitios siguen leyendo en bruto a propósito, los dos fuera de esas
 * pantallas: `features/admin/session.ts`, que es quien **resuelve** el alcance
 * y por tanto no puede tenerlo todavía, y `features/admin/register-guards.ts`,
 * que alimenta una escritura **ya comprobada** por `retirarCaja`.
 *
 * ── Por qué una vista y no un parámetro más ───────────────────────────────
 * Añadir `scope` a `registersOf` habría roto Worker y Kiosco, que leen sedes y
 * cajas con toda legitimidad y **no tienen alcance de administración**: tienen
 * una sesión de dispositivo. Una caja no sabe de operadores ni le hace falta.
 * Así que las lecturas en bruto se quedan donde están, para los terminales, y
 * la administración entra por aquí.
 *
 * ── Lo que esto todavía no es ─────────────────────────────────────────────
 * Sigue siendo un mock en memoria y la vista no autoriza nada: filtra. Quien
 * implemente el backend tiene que construir el endpoint con el alcance dentro
 * —no un endpoint abierto que el cliente filtre después—, y esta es la forma
 * que debe copiar.
 */

import { asignacionVigente, estaEnAlcance } from "./assignments";
import type { Assignment } from "./assignments";
import { allRegistersOf, findRegisterById, registersOf } from "./registers";
import type { Register } from "./registers";
import { equipoDeCaja, equiposDeSede, findTerminalById, kioscosDeSede } from "./devices";
import type { Terminal } from "./devices";
import { findSedeById } from "./sedes";
import type { Sede } from "./sedes";
import { workersOf } from "./workers";
import type { NetworkWorker } from "./workers";
import type { Scope } from "./scope";

/**
 * Las lecturas de la red acotadas a un alcance. Los nombres dicen qué
 * devuelven y no hay un par ambiguo: `cajasActivas` son las operables y
 * `cajasConHistorico` incluye las retiradas, que siguen siendo consultables
 * [R9]. Las dos leen lo mismo que `registersOf` y `allRegistersOf`; lo que
 * añaden es que una sede ajena contesta como una inexistente.
 */
export interface RedEnAlcance {
  /** La sede, o `null` si no existe **o** no es del alcance (indistinguibles). */
  sede(sedeId: string): Sede | null;
  /** Cajas operables de la sede. */
  cajasActivas(sedeId: string): readonly Register[];
  /** Todas, incluidas las retiradas. */
  cajasConHistorico(sedeId: string): readonly Register[];
  /** Trabajadores adscritos, activos y desactivados. */
  trabajadores(sedeId: string): readonly NetworkWorker[];
  /** Kioscos de autoservicio de la sede: se atan a la sede, no a un mostrador. */
  kioscos(sedeId: string): readonly Terminal[];
  /** Todos los equipos de la sede, cajas y kioscos — las dos pestañas de §3. */
  equipos(sedeId: string): readonly Terminal[];
  /** Un equipo por su identificador, si su sede es del alcance. */
  equipo(terminalId: string): Terminal | null;
  /** El equipo de una caja. Resuelve la caja primero y comprueba **su** sede. */
  equipoDeCaja(registerId: string): Terminal | null;
  cajaTieneEquipo(registerId: string): boolean;
  /** La asignación vigente de la sede. El historial completo es del Super Admin [A1]. */
  asignacionVigente(sedeId: string): Assignment | null;
}

/**
 * La vista de la red para un alcance.
 *
 * El alcance se comprueba **en cada lectura** y no una vez al crear la vista.
 * Es a propósito: el dominio es mutable en memoria, una asignación puede
 * revocarse, y una vista que hubiera fotografiado sus sedes al nacer seguiría
 * contestando por una sede que ya no administra nadie si alguien la guardara
 * en una constante de módulo. Comprobar cada vez cuesta un filtro sobre diez
 * sedes y elimina esa trampa.
 */
export function redEnAlcance(scope: Scope): RedEnAlcance {
  /** Dentro del alcance o no. Es la única condición de todo este módulo. */
  function dentro(sedeId: string): boolean {
    return estaEnAlcance(scope, sedeId);
  }

  /** La sede de una caja, cuando la caja existe y su sede es del alcance. */
  function sedeDeCaja(registerId: string): string | null {
    const caja = findRegisterById(registerId);
    if (!caja || !dentro(caja.branchId)) return null;
    return caja.branchId;
  }

  return {
    sede(sedeId) {
      return dentro(sedeId) ? findSedeById(sedeId) : null;
    },

    cajasActivas(sedeId) {
      return dentro(sedeId) ? registersOf(sedeId) : [];
    },

    cajasConHistorico(sedeId) {
      return dentro(sedeId) ? allRegistersOf(sedeId) : [];
    },

    trabajadores(sedeId) {
      return dentro(sedeId) ? workersOf(sedeId) : [];
    },

    kioscos(sedeId) {
      return dentro(sedeId) ? kioscosDeSede(sedeId) : [];
    },

    equipos(sedeId) {
      return dentro(sedeId) ? equiposDeSede(sedeId) : [];
    },

    equipo(terminalId) {
      const terminal = findTerminalById(terminalId);
      return terminal && dentro(terminal.branchId) ? terminal : null;
    },

    equipoDeCaja(registerId) {
      return sedeDeCaja(registerId) === null ? null : equipoDeCaja(registerId);
    },

    cajaTieneEquipo(registerId) {
      return sedeDeCaja(registerId) !== null && equipoDeCaja(registerId) !== null;
    },

    asignacionVigente(sedeId) {
      return dentro(sedeId) ? asignacionVigente(sedeId) : null;
    },
  };
}
