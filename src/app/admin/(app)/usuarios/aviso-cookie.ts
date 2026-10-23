/**
 * La cookie con la que se recuerda que el aviso de Usuarios ya se leyó.
 *
 * Vive aparte de `aviso-solo-tuya.tsx` a propósito: lo que exporta un módulo
 * `"use client"` llega al servidor como referencia de cliente, no como valor,
 * y la página no podría leer la cookie con ese nombre.
 */
export const AVISO_USUARIOS_LEIDO = "pc_admin_aviso_usuarios";
