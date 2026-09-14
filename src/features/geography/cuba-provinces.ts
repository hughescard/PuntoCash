/**
 * FRONTEND-ONLY MOCK catalog of Cuban provinces and municipalities.
 *
 * A deliberately small, clearly-mock fixture — NOT a fabricated authoritative
 * national catalog. It exists so "Giros" can demonstrate
 * province → municipality selection against a real code/label boundary; swap
 * `PROVINCE_CATALOG`/`MUNICIPALITIES_BY_PROVINCE` for a real catalog service
 * later without touching any screen that imports this module.
 *
 * The UI only ever shows `label`. The API only ever receives `code`. Both are
 * preserved together in a historical snapshot (see `operations-history.ts`),
 * so a later catalog relabel can never make a past Giro's province ambiguous.
 */

export interface CatalogEntry {
  code: string;
  label: string;
}

export const PROVINCE_CATALOG: readonly CatalogEntry[] = [
  { code: "LH", label: "La Habana" },
  { code: "MTZ", label: "Matanzas" },
  { code: "VCL", label: "Villa Clara" },
  { code: "SCU", label: "Santiago de Cuba" },
];

const MUNICIPALITIES_BY_PROVINCE: Readonly<Record<string, readonly CatalogEntry[]>> = {
  LH: [
    { code: "PDR", label: "Plaza de la Revolución" },
    { code: "CHB", label: "Centro Habana" },
    { code: "HVJ", label: "Habana Vieja" },
    { code: "PLY", label: "Playa" },
  ],
  MTZ: [
    { code: "MTZ-C", label: "Matanzas" },
    { code: "CRD", label: "Cárdenas" },
    { code: "VRD", label: "Varadero" },
  ],
  VCL: [
    { code: "SCL", label: "Santa Clara" },
    { code: "SLG", label: "Sagua la Grande" },
  ],
  SCU: [
    { code: "SCU-C", label: "Santiago de Cuba" },
    { code: "PSR", label: "Palma Soriano" },
  ],
};

export function findProvince(code: string): CatalogEntry | undefined {
  return PROVINCE_CATALOG.find((entry) => entry.code === code);
}

/** Municipalities belonging to one province — empty until a province is chosen. */
export function getMunicipalitiesForProvince(provinceCode: string): readonly CatalogEntry[] {
  return MUNICIPALITIES_BY_PROVINCE[provinceCode] ?? [];
}

export function findMunicipality(provinceCode: string, municipalityCode: string): CatalogEntry | undefined {
  return getMunicipalitiesForProvince(provinceCode).find((entry) => entry.code === municipalityCode);
}
