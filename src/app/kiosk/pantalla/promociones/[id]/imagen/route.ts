import { imagenDePromocion } from "@/features/network/promotions";

/**
 * La imagen de una promoción, para la pantalla informativa y para las
 * vistas previas de la consola (**FR-AD-PROM-12**).
 *
 * Va aparte del resto de los datos de la pantalla para no reenviar la imagen
 * entera cada vez que la pantalla pregunta si algo cambió: la dirección lleva
 * la versión de la imagen, así que el navegador la guarda y solo la vuelve a
 * pedir cuando alguien la cambia.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const imagen = imagenDePromocion(id);
  if (!imagen) return new Response("No encontrada", { status: 404 });
  return new Response(Buffer.from(imagen.datos, "base64"), {
    headers: {
      "Content-Type": imagen.tipo,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
