# Correos de autenticación

Un solo correo, el del código de verificación (2FA). Se construye con
`buildVerificationCodeEmail()` y se envía desde el backend; en el demo nada se
envía — el mock de `../two-factor.ts` se limita a crear el reto.

## Uso

```ts
import { buildVerificationCodeEmail } from "@/features/auth/emails/verification-code-email";

const { subject, html, text } = buildVerificationCodeEmail({
  workerName: "Juan Pérez",
  code: "482913",
  expiresInMinutes: 5,
  requestedAt: new Date(),
  timeZone: "America/Havana",
  logoUrl: "https://<cdn>/puntocash-isotipo-96.png", // opcional
});
```

El resultado trae `subject`, `preheader`, `html` y `text`. **Enviar siempre las
dos partes** (`multipart/alternative`): un cliente que bloquea HTML debe seguir
recibiendo el código legible, y un correo solo-HTML puntúa peor en los filtros
de spam — que es lo último que quiere un correo del que depende poder abrir la
caja.

## Lo que decide el backend, no esta plantilla

- **Generación del código.** Seis dígitos de un generador criptográficamente
  seguro (`crypto.randomInt`, no `Math.random`). No derivarlo del identificador,
  de la hora ni de un contador.
- **Almacenamiento.** Guardar un hash del código, no el código. Se compara en
  tiempo constante y se borra al verificarse.
- **Vigencia y límites.** 5 minutos de vigencia, 3 intentos y 3 envíos por reto,
  60 s entre envíos. Son los valores que la pantalla representa; si cambian,
  cambian en los dos lados a la vez (`expiresInMinutes` aquí,
  `TTL_MS`/`MAX_ATTEMPTS`/`MAX_SENDS`/`RESEND_COOLDOWN_MS` en `../two-factor.ts`).
- **Envío.** Cola con reintento, y registro del envío para auditoría. Lo que se
  audita es que se envió, a qué cuenta y cuándo; **nunca el código**.

## Lo que este correo no hace, y no debe empezar a hacer

- **No lleva enlace ni botón que complete el acceso.** Un "verificar ahora" en
  el correo convierte el buzón en la credencial: cualquiera con acceso al correo
  entra sin tocar la caja. El código se teclea en la pantalla ya abierta.
- **No lleva el código en el asunto.** El asunto se lee en la pantalla de
  bloqueo del teléfono, delante de quien esté al lado del mostrador.
- **No nombra la sede, la caja ni al mercante.** Cuando este correo sale todavía
  no hay sesión ni identidad verificada, y la marca visible es siempre PuntoCash
  (CLAUDE.md, regla A9).
- **No adjunta nada** y no exige imágenes: con las imágenes bloqueadas —como lo
  recibirá la mayoría— el correo sigue siendo reconociblemente PuntoCash.

## Cabeceras recomendadas

```
From: PuntoCash <no-responder@puntocash.com>
Reply-To: (ninguno)
Auto-Submitted: auto-generated
X-Entity-Ref-ID: <id del reto>     # evita el agrupado de Gmail entre reenvíos
```

No incluir `List-Unsubscribe`: es un correo transaccional de seguridad, no una
comunicación de la que se pueda dar de baja.

## Ejemplo renderizado

`documentacion/emails/correo-codigo-verificacion.html` es la salida de
`buildVerificationCodeEmail()` con datos de ejemplo, para abrir en un navegador
sin montar nada. Es una copia estática: si se cambia la plantilla, hay que
regenerarla.

## Revisar cambios de la plantilla

La maquetación es de tabla y con estilos en línea a propósito — el porqué está
en la cabecera de `verification-code-email.ts`. Antes de dar por bueno un cambio,
renderizar el HTML y verlo al menos en Gmail (web y Android), Outlook de
escritorio y Mail de iOS, con imágenes bloqueadas y a 320px de ancho.
