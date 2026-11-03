/**
 * Lo que se compara al buscar en un listado: minúsculas y sin tildes, para
 * que «camaguey» encuentre «Camagüey» y «marrero» encuentre «Marrero». Es lo
 * mismo que ya hacía el dominio al buscar sedes; los listados lo usan igual.
 */
export function sinTildes(valor: string | null | undefined): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
