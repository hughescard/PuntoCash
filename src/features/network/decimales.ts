/**
 * Toda moneda de la plataforma se maneja con **cuatro decimales**, sin
 * excepción y sin que nadie pueda cambiarlo (decisión del 3/11). Es una regla
 * del catálogo, no un dato de cada moneda. Vive aparte para que también la
 * lean los componentes de cliente sin arrastrar el catálogo.
 */
export const DECIMALES_DE_MONEDA = 4;
