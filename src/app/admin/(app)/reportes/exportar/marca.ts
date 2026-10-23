import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * La identidad de los archivos exportados — manual de marca §2, §3, §4 y §17.
 *
 * La plantilla de los reportes vive en código, no en un archivo de plantilla:
 * así el PDF y el Excel salen siempre del mismo cálculo que la pantalla y con
 * los mismos colores que la consola, y cambiar la marca es cambiar esto.
 */

export const COLOR = {
  navy: "#0B132B",
  dorado: "#D4AF37",
  blanco: "#FFFFFF",
  antracita: "#1A1D23",
  gris: "#6B7280",
  grisClaro: "#E5E7EB",
  /* Cabecera de tabla: «fondo gris claro o tratamiento sobrio» (§17). */
  cabecera: "#F3F4F6",
  /* Texto secundario sobre navy. */
  sobreNavy: "#AEB4C2",
} as const;

/** «#0B132B» → [0.043, 0.075, 0.169], para pdf-lib. */
export function rgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Montserrat, la tipografía de la marca, en sus cuatro pesos (§4). */
export const PESOS = ["400Regular", "500Medium", "600SemiBold", "700Bold"] as const;
export type Peso = (typeof PESOS)[number];

const RAIZ = path.join(process.cwd(), "assets");

export async function fuente(peso: Peso): Promise<Uint8Array> {
  return new Uint8Array(await readFile(path.join(RAIZ, "fuentes", "montserrat", `Montserrat_${peso}.ttf`)));
}

/** El logotipo completo, versión para fondo claro, en PNG: el Excel solo admite imágenes. */
export async function logoFondoClaroPng(): Promise<Buffer> {
  return readFile(path.join(RAIZ, "marca", "logo-fondo-claro.png"));
}

/** Proporción del PNG del logotipo (ancho / alto). */
export const PROPORCION_LOGO = 952 / 182;

/** El isotipo —el pin— como trazo SVG, en una caja de 24 × 32. */
export const ISOTIPO =
  "M12 0C5.373 0 0 5.373 0 12c0 8.4 10.02 18.62 11.29 19.88a1 1 0 0 0 1.42 0C13.98 30.62 24 20.4 24 12 24 5.373 18.627 0 12 0Zm0 16.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z";

/** La definición de volumen, dicha en una frase para quien recibe el archivo. */
export const DEFINICION_DE_VOLUMEN =
  "Volumen: lo operado en cada moneda, contando cada operación completada una sola vez. En un cambio de moneda cuenta la divisa comprada o vendida, no los pesos de la contrapartida; en una remesa, lo pagado; en un giro, su importe. Las monedas nunca se suman entre sí. La posición neta (comprado menos vendido) no es volumen.";
