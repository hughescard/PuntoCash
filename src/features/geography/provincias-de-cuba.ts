/**
 * Las provincias de Cuba, completas, para dar de alta una sede.
 *
 * El catálogo de `cuba-provinces.ts` es una maqueta pequeña pensada para
 * Giros (cuatro provincias) y no alcanza para la red: ya hay sedes en Pinar
 * del Río, Sancti Spíritus, Camagüey u Holguín. Aquí basta el nombre, porque
 * la localidad de una sede se guarda como texto —«Municipio, Provincia»—, que
 * es lo que edita también Admin de sede y lo que muestra la Pantalla.
 */
export const PROVINCIAS_DE_CUBA: readonly string[] = [
  "Pinar del Río",
  "Artemisa",
  "La Habana",
  "Mayabeque",
  "Matanzas",
  "Cienfuegos",
  "Villa Clara",
  "Sancti Spíritus",
  "Ciego de Ávila",
  "Camagüey",
  "Las Tunas",
  "Holguín",
  "Granma",
  "Santiago de Cuba",
  "Guantánamo",
  "Isla de la Juventud",
];

/** «Plaza de la Revolución, La Habana» → «La Habana». Sin coma, la localidad entera. */
export function provinciaDeLocalidad(localidad: string): string {
  const partes = localidad.split(",");
  return (partes.length > 1 ? partes.at(-1)! : localidad).trim();
}

/** «Plaza de la Revolución, La Habana» → «Plaza de la Revolución». */
export function municipioDeLocalidad(localidad: string): string {
  return localidad.split(",")[0]!.trim();
}
