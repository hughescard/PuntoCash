import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Las lecturas del dominio de la red que NO reciben alcance.
 *
 * Están indexadas por identificador y contestan por cualquier sede de la red,
 * porque Worker y Kiosco las necesitan así: leen su sede y su caja con toda
 * legitimidad y no tienen alcance de administración, tienen una sesión de
 * dispositivo. Una pantalla de `/admin`, en cambio, siempre trabaja dentro de
 * un alcance, y ahí estas funciones son una fuga esperando a ocurrir: basta
 * con leer un identificador de la URL y preguntar.
 *
 * Por eso dentro de `src/app/admin` se piden a `redEnAlcance(scope)`
 * (`features/network/scoped-reads.ts`), que contesta como si no existiera todo
 * lo que esté fuera del alcance — que es lo que exigen FR-AD-NAV-2 y
 * FR-AD-NAV-3. Esta regla es lo que convierte esa norma en algo comprobable:
 * sin ella la garantía vuelve a depender de que alguien se acuerde.
 *
 * Las ESCRITURAS no están aquí: ya reciben un `Scope` y lo comprueban. Y dos
 * módulos de `src/features/admin` siguen leyendo en bruto a propósito, fuera
 * del alcance de esta regla: `session.ts`, que es quien resuelve el alcance y
 * por tanto no puede tenerlo todavía, y `register-guards.ts`, que alimenta una
 * escritura ya comprobada.
 *
 * Una lectura nueva que aparezca en este dominio se añade a las dos listas: a
 * la vista y a esta. Las que todavía no tienen vista —`historialDeSede`,
 * `listarEventos`, las tablas enteras como `SEDES` o `WORKERS`— están aquí
 * igualmente, para que la sección que las necesite tenga que extender la
 * vista en vez de saltársela.
 */
const LECTURAS_SIN_ALCANCE = {
  "@/features/network/sedes": [
    "findSedeById",
    "findSedeByCode",
    "findBranchById",
    "searchBranches",
    "sedeOfreceServicio",
    "sedeCotiza",
    "SEDES",
    "BRANCHES",
  ],
  "@/features/network/registers": ["registersOf", "allRegistersOf", "findRegisterById", "REGISTERS"],
  "@/features/network/devices": [
    "equipoDeCaja",
    "cajaTieneEquipo",
    "equiposDeSede",
    "kioscosDeSede",
    "findTerminalById",
    // Lecturas y escrituras del propio terminal: no son de una pantalla de
    // administración, que trabaja siempre dentro de un alcance.
    "resolverTerminal",
    "retoVigente",
    "emitirReto",
    "marcarActividad",
    "TERMINALS",
  ],
  "@/features/network/workers": [
    "workersOf",
    "workersOfOperator",
    "findWorkerById",
    "findWorkerByIdentifier",
    "WORKERS",
  ],
  "@/features/network/assignments": [
    "asignacionVigente",
    "operadorVigente",
    "operadorVigenteEn",
    "historialDeSede",
    "historialDeOperador",
    "sedesDeOperador",
    "ASSIGNMENTS",
  ],
  "@/features/network/operators": [
    "findOperatorById",
    "findAdminUserById",
    "adminUsersOf",
    "activeAdminUsersOf",
    "administradorPrincipalDe",
    "OPERATORS",
    "ADMIN_USERS",
  ],
  "@/features/network/audit": ["listarEventos", "AUDIT_EVENTS"],
  "@/features/network/currencies": [
    "monedasDeSede",
    "sedeManejaMoneda",
    "cajasConMoneda",
    "monedasDeCaja",
  ],
  "@/features/network/rates": ["tasasDeSede", "tasaDe", "motivoFueraDeVigor", "tableroPublico"],
  "@/features/network/promotions": ["todasLasPromociones", "promocionPorId", "promocionesPublicas", "imagenDePromocion"],
  "@/features/network/jornadas": [
    "jornadasDeSede",
    "jornadaPorId",
    "jornadaAbiertaDeCaja",
    "jornadaAbiertaDeTrabajador",
    "jornadasDeTrabajador",
    "diaDeSede",
    "diferenciasDelDia",
  ],
  "@/features/network/operaciones": ["operacionesDeSede", "operacionPorCodigo", "operacionesDeJornada"],
  "@/features/network/aprobaciones": ["solicitudesDeSede", "solicitudPorId", "solicitudesDeJornada"],
};

const MENSAJE_SIN_ALCANCE =
  "Esta lectura no recibe alcance. Desde /admin se lee con redEnAlcance(session.scope) " +
  "de @/features/network/scoped-reads, que contesta como si no existiera lo que esté " +
  "fuera del alcance (FR-AD-NAV-2, FR-AD-NAV-3).";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/app/admin/**/*.ts", "src/app/admin/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...Object.entries(LECTURAS_SIN_ALCANCE).map(([name, importNames]) => ({
              name,
              importNames,
              message: MENSAJE_SIN_ALCANCE,
            })),
            {
              // El barril reexporta todo lo anterior, así que sin esto se
              // esquivaría la regla importando de `@/features/network`.
              name: "@/features/network",
              importNames: Object.values(LECTURAS_SIN_ALCANCE).flat(),
              message: MENSAJE_SIN_ALCANCE,
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code tooling — not application source.
    ".claude/**",
    // Local UI/brand skill tooling — not application source.
    ".agents/**",
  ]),
]);

export default eslintConfig;
