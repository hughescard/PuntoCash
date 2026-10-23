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

import { asignacionVigente, estaEnAlcance, sedesEnAlcance } from "./assignments";
import type { Assignment } from "./assignments";
import { allRegistersOf, findRegisterById, registersOf } from "./registers";
import type { Register } from "./registers";
import { equipoDeCaja, equiposDeSede, findTerminalById, kioscosDeSede } from "./devices";
import type { Terminal } from "./devices";
import { findSedeById } from "./sedes";
import type { Sede } from "./sedes";
import { cajasConMoneda, monedasDeSede } from "./currencies";
import type { MonedaDeSede, MonedaEnCaja } from "./currencies";
import { EFECTOS_EN_TASAS, motivoFueraDeVigor, tableroPublico, tasasDeSede } from "./rates";
import type { MotivoSinCotizacion, TasaDeSede, TasaPublica } from "./rates";
import { promocionesPublicas, promocionPorId, todasLasPromociones } from "./promotions";
import {
  diaDeSede,
  diferenciasDelDia,
  jornadaAbiertaDeCaja,
  jornadaAbiertaDeTrabajador,
  jornadaPorId,
  jornadasDeSede,
  jornadasDeTrabajador,
} from "./jornadas";
import type { DiaDeSede, DiferenciaDelDia, Jornada } from "./jornadas";
import { operacionesDeJornada, operacionesDeSede, operacionPorCodigo, type OperacionDeRed } from "./operaciones";
import { solicitudesDeJornada, solicitudesDeSede, solicitudPorId, type Solicitud } from "./aprobaciones";
import type { Promocion } from "./promotions";
import { ADMIN_USERS, administradorPrincipalDe, findAdminUserById } from "./operators";
import type { AdminUser } from "./operators";
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
  /**
   * Los usuarios administradores del operador del alcance — §8 y §8.2.
   *
   * Aquí el alcance no es una lista de sedes sino el **operador**: un usuario
   * administrador pertenece a la empresa, no a una sucursal. Con alcance global
   * —PuntoCash— son todos, porque PuntoCash los ve (aunque no los gobierne).
   */
  usuarios(): readonly AdminUser[];
  /** Un usuario, o `null` si no existe **o** es de otra empresa (indistinguibles). */
  usuario(userId: string): AdminUser | null;
  /** El administrador principal de la empresa del alcance; `null` con alcance global. */
  administradorPrincipal(): AdminUser | null;
  /** La lista de monedas de la sede — FRD §9 Monedas. */
  monedas(sedeId: string): readonly MonedaDeSede[];
  /** Cajas activas de la sede con esa moneda habilitada, y su saldo. */
  cajasConMoneda(sedeId: string, code: string): readonly MonedaEnCaja[];
  /** Las tasas definidas de la sede, en vigor o no — Tasas. */
  tasas(sedeId: string): readonly TasaDeSede[];
  /** Por qué esa moneda no puede cotizarse en la sede, o `null` si puede. */
  motivoSinCotizacion(sedeId: string, code: string): MotivoSinCotizacion | null;
  /** Las tasas que se retirarían con esa moneda (**FR-AD-MON-8**). */
  tasasQueArrastra(sedeId: string, code: string): readonly string[];
  /**
   * Las promociones que afectan a alguna sede del alcance: las de la empresa y
   * las de red. `sedesEnAlcance` dice en cuáles de **esas** sedes se exhibe;
   * las demás sedes de una promoción de red no se nombran (**FR-AD-PROM-1**).
   */
  promociones(): readonly PromocionVisible[];
  promocion(id: string): PromocionVisible | null;
  /**
   * Lo que la pantalla de la sala de una sede muestra hoy: su tablero de tasas
   * y sus promociones en pantalla (**FR-AD-SEDE-11**). Es la misma lectura que
   * hace la pantalla, no una reconstrucción.
   */
  tablero(sedeId: string): readonly TasaPublica[];
  promocionesEnPantalla(sedeId: string): ReturnType<typeof promocionesPublicas>;
  /** Las jornadas de una sede — Jornadas (**FR-AD-JOR-1**). */
  jornadas(sedeId: string): readonly Jornada[];
  jornada(id: string): Jornada | null;
  jornadaAbiertaDeCaja(registerId: string): Jornada | null;
  jornadaAbiertaDeTrabajador(workerId: string): Jornada | null;
  /** Las jornadas de un trabajador en sedes del alcance, de la más reciente a la más antigua. */
  jornadasDeTrabajador(workerId: string): readonly Jornada[];
  /** Cómo va el día de una sede, caja por caja (**FR-AD-HOME-6**, **FR-AD-SEDE-10**). */
  diaDeSede(sedeId: string): DiaDeSede | null;
  /** Las diferencias de hoy y los cierres forzados sin contar (**FR-AD-HOME-2**). */
  diferenciasDelDia(sedeId: string): readonly DiferenciaDelDia[];
  /** Las operaciones de una sede — Operaciones (**FR-AD-OPS-1**). */
  operaciones(sedeId: string): readonly OperacionDeRed[];
  operacion(codigo: string): OperacionDeRed | null;
  operacionesDeJornada(jornadaId: string): readonly OperacionDeRed[];
  /** Las solicitudes de aprobación de una sede — Aprobaciones (**FR-AD-APR-1**). */
  solicitudes(sedeId: string): readonly Solicitud[];
  solicitud(id: string): Solicitud | null;
  solicitudesDeJornada(jornadaId: string): readonly Solicitud[];
}

export interface PromocionVisible {
  promo: Promocion;
  sedesEnAlcance: readonly string[];
  /** Si es de esta empresa (editable mientras no venza) o de PuntoCash. */
  propia: boolean;
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

  /** Si un usuario administrador es de la empresa del alcance. */
  function esDeLaEmpresa(user: AdminUser): boolean {
    return scope.kind === "global" || user.operatorId === scope.operatorId;
  }

  /** La sede de una caja, cuando la caja existe y su sede es del alcance. */
  function sedeDeCaja(registerId: string): string | null {
    const caja = findRegisterById(registerId);
    if (!caja || !dentro(caja.branchId)) return null;
    return caja.branchId;
  }

  function visible(promo: Promocion): PromocionVisible | null {
    if (scope.kind !== "global" && promo.origen === "operador" && promo.operatorId !== scope.operatorId) {
      return null;
    }
    const alcance = sedesEnAlcance(scope);
    const sedes = promo.sedes === "red" ? alcance : promo.sedes.filter((s) => alcance.includes(s));
    if (sedes.length === 0) return null;
    return { promo, sedesEnAlcance: sedes, propia: promo.origen === "operador" };
  }

  return {
    sede(sedeId) {
      return dentro(sedeId) ? findSedeById(sedeId) : null;
    },

    promociones() {
      return todasLasPromociones()
        .map(visible)
        .filter((p): p is PromocionVisible => p !== null);
    },

    promocion(id) {
      const promo = promocionPorId(id);
      return promo ? visible(promo) : null;
    },

    tablero(sedeId) {
      return dentro(sedeId) ? tableroPublico(sedeId) : [];
    },

    promocionesEnPantalla(sedeId) {
      return dentro(sedeId) ? promocionesPublicas(sedeId) : [];
    },

    jornadas(sedeId) {
      return dentro(sedeId) ? jornadasDeSede(sedeId) : [];
    },

    jornada(id) {
      const j = jornadaPorId(id);
      return j && dentro(j.sedeId) ? j : null;
    },

    jornadaAbiertaDeCaja(registerId) {
      return sedeDeCaja(registerId) === null ? null : jornadaAbiertaDeCaja(registerId);
    },

    jornadaAbiertaDeTrabajador(workerId) {
      const j = jornadaAbiertaDeTrabajador(workerId);
      return j && dentro(j.sedeId) ? j : null;
    },

    jornadasDeTrabajador(workerId) {
      return jornadasDeTrabajador(workerId).filter((j) => dentro(j.sedeId));
    },

    diaDeSede(sedeId) {
      return dentro(sedeId) ? diaDeSede(sedeId) : null;
    },

    solicitudes(sedeId) {
      return dentro(sedeId) ? solicitudesDeSede(sedeId) : [];
    },

    solicitud(id) {
      const s = solicitudPorId(id);
      return s && dentro(s.sedeId) ? s : null;
    },

    solicitudesDeJornada(jornadaId) {
      const j = jornadaPorId(jornadaId);
      return j && dentro(j.sedeId) ? solicitudesDeJornada(jornadaId) : [];
    },

    operaciones(sedeId) {
      return dentro(sedeId) ? operacionesDeSede(sedeId) : [];
    },

    operacion(codigo) {
      const o = operacionPorCodigo(codigo);
      return o && dentro(o.sedeId) ? o : null;
    },

    operacionesDeJornada(jornadaId) {
      const j = jornadaPorId(jornadaId);
      return j && dentro(j.sedeId) ? operacionesDeJornada(jornadaId) : [];
    },

    diferenciasDelDia(sedeId) {
      return dentro(sedeId) ? diferenciasDelDia(sedeId) : [];
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

    usuarios() {
      return ADMIN_USERS.filter(esDeLaEmpresa);
    },

    usuario(userId) {
      const user = findAdminUserById(userId);
      return user && esDeLaEmpresa(user) ? user : null;
    },

    administradorPrincipal() {
      return scope.kind === "operator" ? administradorPrincipalDe(scope.operatorId) : null;
    },

    monedas(sedeId) {
      return dentro(sedeId) ? monedasDeSede(sedeId) : [];
    },

    cajasConMoneda(sedeId, code) {
      return dentro(sedeId) ? cajasConMoneda(sedeId, code) : [];
    },

    tasas(sedeId) {
      return dentro(sedeId) ? tasasDeSede(sedeId) : [];
    },

    motivoSinCotizacion(sedeId, code) {
      return dentro(sedeId) ? motivoFueraDeVigor(sedeId, code) : "sin-servicio";
    },

    tasasQueArrastra(sedeId, code) {
      return dentro(sedeId) ? EFECTOS_EN_TASAS.tasasQueArrastra(sedeId, code) : [];
    },
  };
}
