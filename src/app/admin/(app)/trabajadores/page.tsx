import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Alert, Button } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { maskEmail } from "@/features/auth/two-factor";
import { getAdminSession } from "@/features/admin/session-server";
import type { Jornada } from "@/features/network/jornadas";
import { fechaCorta } from "../jornadas/formato";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { TrabajadoresList, type TrabajadorRow } from "./trabajadores-list";

export const metadata: Metadata = {
  title: "Administración de sede · Trabajadores",
  robots: { index: false, follow: false },
};

/**
 * Trabajadores — **§7 del FRD**.
 *
 * El área donde el Admin crea personas y, desde la v3.0 del documento, **el
 * único lugar del producto donde se desactiva a una** (**[A4]**, **[A14]**).
 *
 * Las filas se componen **en el servidor**, incluidas las fechas y el correo
 * enmascarado. Formatear una fecha en el cliente que el servidor ya pintó
 * produce un desajuste de hidratación en cuanto las zonas horarias no
 * coinciden, y es un fallo que no se ve en la máquina de quien lo escribe.
 *
 * El correo sale **enmascarado por el mismo `maskEmail` que usa la
 * verificación en dos pasos**, no por una copia: **FR-AD-TRAB-1** pide
 * «correo de verificación enmascarado», y que las dos pantallas lo enmascaren
 * igual es parte de que se lea como el mismo dato.
 *
 * La lectura va por la vista con alcance, sede a sede: así una sede ajena no
 * aporta ni una fila, y no hay forma de que esta pantalla vea a alguien de
 * otra empresa (**[A1]**, **FR-AD-TRAB-5**).
 *
 */
export default async function AdminTrabajadoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const inicial = await searchParams;

  const red = redEnAlcance(session.scope);

  const sedes = session.sedes.map((sede) => ({ id: sede.id, name: sede.name }));

  const filas: TrabajadorRow[] = session.sedes.flatMap((sede) =>
    red.trabajadores(sede.id).map((trabajador) => ({
      id: trabajador.id,
      fullName: trabajador.fullName,
      identifier: trabajador.identifier,
      sedeId: sede.id,
      sedeName: sede.name,
      correo: maskEmail(trabajador.email),
      status: trabajador.status,
      /* `formatDate(new Date(...))`, no `formatIsoDate`: ese es para fechas de
         calendario («1990-01-01») y parte por guiones, así que con un instante
         ISO completo el día sale «01T09:00:00.000Z» y la fecha es inválida.
         `createdAt` es un instante. */
      alta: formatDate(new Date(trabajador.createdAt)),
      ultimaJornada: ultimaJornada(red.jornadasDeTrabajador(trabajador.id)[0]),
    })),
  );

  /* Orden estable y útil: por sede y, dentro de ella, alfabético. El dominio
     no promete ninguno, y una tabla que cambia de orden entre recargas es
     difícil de leer y de probar. */
  filas.sort((a, b) => a.sedeName.localeCompare(b.sedeName) || a.fullName.localeCompare(b.fullName));

  return (
    <>
      <PageHeader
        title="Trabajadores"
        description="Las personas que operan las cajas de tus sedes."
        actions={
          <Button asChild>
            <Link href="/admin/trabajadores/nuevo">
              <UserPlus aria-hidden="true" />
              Dar de alta
            </Link>
          </Button>
        }
      />

      {filas.length === 0 ? (
        /* **FR-AD-STATE-1**: este vacío y el de «tus filtros no devuelven
           nada» no comparten mensaje. Aquí no hay nadie todavía, que es un
           estado del negocio y no del filtro. */
        <Alert variant="info" title="Todavía no hay trabajadores en tus sedes">
          Cuando des de alta a alguien aparecerá aquí, con la sede en la que puede operar.
        </Alert>
      ) : (
        <TrabajadoresList rows={filas} sedes={sedes} inicial={inicial} />
      )}
    </>
  );
}

function ultimaJornada(j: Jornada | undefined): TrabajadorRow["ultimaJornada"] {
  if (!j) return null;
  return j.estado === "abierta"
    ? { id: j.id, texto: `Abierta ahora · ${j.cajaNombre}`, abierta: true }
    : { id: j.id, texto: `${fechaCorta(j.openedAt)} · ${j.cajaNombre}`, abierta: false };
}
