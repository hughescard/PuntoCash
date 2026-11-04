import * as React from "react";

/**
 * Envía un formulario a una acción de `useActionState` **sin** que React lo
 * restablezca después.
 *
 * Con `<form action={accion}>`, React restablece el formulario tras cada
 * respuesta: los campos de texto vuelven a su `defaultValue`, y los
 * desplegables a su primera opción —también los controlados, cuyo estado sigue
 * diciendo otra cosa—. Tras un rechazo, el segundo envío mandaba entonces un
 * valor distinto del que la pantalla mostraba (el operador «sin asignar», el
 * tipo de documento en «CI»). Con `onSubmit={enviarSinReiniciar(accion)}`, lo
 * escrito se queda tal cual.
 */
export function enviarSinReiniciar(
  accion: (datos: FormData) => void,
): (evento: React.FormEvent<HTMLFormElement>) => void {
  return (evento) => {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    React.startTransition(() => accion(datos));
  };
}
