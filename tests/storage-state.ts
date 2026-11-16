/**
 * Dónde viven los servidores de la suite. Ver `playwright.config.ts`.
 *
 * Antes este archivo sembraba la caja de Worker en `localStorage`: la caja era
 * del navegador. Desde el recableado vive en la red, y cada prueba de Worker
 * pide su propio puesto al servidor (`worker-fixture.ts`).
 */
export const BASE_URL = "http://localhost:3000";
export const WORKER_BASE_URL = "http://localhost:3001";
