/**
 * FRONTEND-ONLY MOCK of the network's sedes (sucursales).
 *
 * Every PuntoCash sede is PuntoCash to the client, whichever merchant
 * administers it — so nothing here carries an operator name (AGENTS.md:
 * "PuntoCash is always the visible primary brand").
 *
 * The kiosk reads this list in two places:
 *
 *   · `/kiosk/pantalla` — the first time a signage screen starts it lists
 *     every sede so whoever installs it can pick the one it stands in
 *     (Pantalla FRD §1.1 "Selección de sede").
 *   · `/kiosk/autoservicio` — a linked kiosk knows its sede through its
 *     device session (`@/features/kiosk/device-session`), and shows it.
 *
 * A real backend replaces this list with the network's sede registry, which
 * belongs to the administration layer.
 */

export interface Branch {
  id: string;
  /** Public name shown to clients, always under the PuntoCash brand. */
  name: string;
  address: string;
  /** City and province, used by the sede picker to filter. */
  locality: string;
  hours: string;
  phone: string;
}

export const BRANCHES: readonly Branch[] = [
  {
    id: "sede-vedado",
    name: "PuntoCash Vedado",
    address: "Calle 23 esq. a L, Vedado",
    locality: "Plaza de la Revolución, La Habana",
    hours: "Lunes a sábado · 8:30 a.m. – 6:00 p.m.",
    phone: "+53 7 838 1234",
  },
  {
    id: "sede-habana-vieja",
    name: "PuntoCash Obispo",
    address: "Obispo No. 257 e/ Aguiar y Cuba",
    locality: "La Habana Vieja, La Habana",
    hours: "Lunes a sábado · 9:00 a.m. – 6:00 p.m.",
    phone: "+53 7 861 5520",
  },
  {
    id: "sede-miramar",
    name: "PuntoCash Miramar",
    address: "5ta Avenida esq. a 42, Miramar",
    locality: "Playa, La Habana",
    hours: "Lunes a viernes · 8:30 a.m. – 5:30 p.m.",
    phone: "+53 7 204 7788",
  },
  {
    id: "sede-matanzas",
    name: "PuntoCash Matanzas",
    address: "Calle Medio No. 28004 e/ Jovellanos y Matanzas",
    locality: "Matanzas, Matanzas",
    hours: "Lunes a sábado · 8:30 a.m. – 5:00 p.m.",
    phone: "+53 45 24 3310",
  },
  {
    id: "sede-santa-clara",
    name: "PuntoCash Santa Clara",
    address: "Boulevard No. 12 e/ Villuendas y Plácido",
    locality: "Santa Clara, Villa Clara",
    hours: "Lunes a sábado · 8:30 a.m. – 5:30 p.m.",
    phone: "+53 42 20 6641",
  },
  {
    id: "sede-camaguey",
    name: "PuntoCash Camagüey",
    address: "República No. 356 e/ San Martín y Correa",
    locality: "Camagüey, Camagüey",
    hours: "Lunes a sábado · 8:30 a.m. – 5:00 p.m.",
    phone: "+53 32 29 8120",
  },
  {
    id: "sede-holguin",
    name: "PuntoCash Holguín",
    address: "Calle Libertad No. 187 e/ Frexes y Aguilera",
    locality: "Holguín, Holguín",
    hours: "Lunes a sábado · 8:30 a.m. – 5:00 p.m.",
    phone: "+53 24 42 5096",
  },
  {
    id: "sede-santiago",
    name: "PuntoCash Santiago",
    address: "Enramadas No. 402 e/ San Félix y Carnicería",
    locality: "Santiago de Cuba, Santiago de Cuba",
    hours: "Lunes a sábado · 8:30 a.m. – 5:30 p.m.",
    phone: "+53 22 65 3471",
  },
];

export function findBranchById(id: string | null | undefined): Branch | null {
  if (!id) return null;
  return BRANCHES.find((branch) => branch.id === id) ?? null;
}

/** Lower-cases and strips accents so "camaguey" finds "Camagüey". */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Filter used by the sede picker while the installer types. Matches name,
 * address and locality, accent- and case-insensitively; an empty query
 * returns the whole network.
 */
export function searchBranches(query: string): readonly Branch[] {
  const needle = normalize(query);
  if (!needle) return BRANCHES;
  return BRANCHES.filter((branch) =>
    normalize(`${branch.name} ${branch.address} ${branch.locality}`).includes(needle),
  );
}

/** One of a sede's cajas — what a Worker terminal is linked to (Worker FRD §2.1). */
export interface Register {
  id: string;
  branchId: string;
  /** "Caja 03" — the name shown in the Worker header and on every comprobante. */
  name: string;
}

/** Cajas per sede in the demo. A real backend reads them from the sede registry. */
const DEMO_REGISTERS_PER_BRANCH = 4;

export function registersOf(branchId: string): readonly Register[] {
  if (!findBranchById(branchId)) return [];
  return Array.from({ length: DEMO_REGISTERS_PER_BRANCH }, (_, i) => {
    const number = String(i + 1).padStart(2, "0");
    return { id: `${branchId}:caja-${number}`, branchId, name: `Caja ${number}` };
  });
}

export function findRegisterById(id: string | null | undefined): Register | null {
  if (!id) return null;
  const branchId = id.split(":")[0] ?? "";
  return registersOf(branchId).find((register) => register.id === id) ?? null;
}
