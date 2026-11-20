# Guion del video demo — Tiendita ⚡

**Duración objetivo:** 1:30 – 2:00
**Formato:** grabación de pantalla + voz en off (OBS, Loom o el grabador de Windows `Win + Alt + R`)
**Resolución:** 1920×1080, navegador en zoom 110–125 % para que se lea bien

---

## Antes de grabar (checklist)

- [ ] Una tienda demo armada: nombre lindo, descripción, color de acento, 3 productos con foto
      (ej. *Panadería del Barrio*: pan casero, medialunas, curso online con link de entrega).
- [ ] Wallet del comercio **con verificación de pagos (LUD-21)** — que al guardar la Lightning Address no aparezca el aviso amarillo.
- [ ] Una wallet en el celular con algunos sats para pagar de verdad (Phoenix, Blink, Alby…).
- [ ] `TIENDITA_NSEC` configurado en Vercel y una app Nostr abierta en el celular (Primal, Damus o Amethyst) con la cuenta del comercio, para mostrar el DM.
- [ ] Wapu configurado (alias + titular). Si vas a mostrar pesos reales, `WAPU_MODE=real`.
- [ ] Cerrar pestañas, notificaciones y marcadores con datos personales.
- [ ] Ensayar una vez completo sin grabar.

---

## Escenas

| # | Tiempo | Pantalla | Voz en off |
|---|--------|----------|------------|
| 1 | 0:00 – 0:12 | Landing, hero "Tu tienda en 60 segundos" | "En Argentina hay 600 mil comercios que no pueden cobrarle a un cliente del exterior. Stripe no opera, PayPal se queda con casi el 7 %. Tiendita lo resuelve: cobrás en sats, recibís pesos." |
| 2 | 0:12 – 0:30 | Login → "crear cuenta" → setup: nombre, Lightning Address, alias de Wapu | "El comerciante entra con una llave Nostr: sin email, sin contraseñas, sin KYC. Pone su Lightning Address y su alias bancario. Listo, tiene tienda." |
| 3 | 0:30 – 0:45 | Productos → crear uno con precio en pesos y "qué recibe el cliente al pagar" | "Carga productos con precio en pesos. Si es digital, agrega el link que el cliente recibe al pagar." |
| 4 | 0:45 – 0:55 | Dashboard → cartel con QR → "imprimir cartel" | "Comparte su link o imprime el QR para el mostrador." |
| 5 | 0:55 – 1:20 | Tienda pública → comprar → nombre y contacto → checkout con QR → **pagar con el celular** (mostrar el celular en cámara o en espejo) → "¡Listo! PAGADO" + entrega | "El cliente elige, deja su contacto y paga con cualquier wallet Lightning. La tasa BTC/ARS se calcula en vivo. En segundos, el pago se confirma y recibe lo que compró." |
| 6 | 1:20 – 1:35 | Celular: DM de Nostr "⚡ ¡Nueva venta!" → Dashboard ventas: venta pagada + "ARS enviados" | "El comerciante recibe un aviso por Nostr con los datos del comprador, y Wapu le transfiere los pesos a su cuenta automáticamente." |
| 7 | 1:35 – 1:45 | Productos → "Publicar catálogo en Nostr" → abrir Shopstr mostrando el producto | "Y con un click, su catálogo aparece en los marketplaces de Nostr." |
| 8 | 1:45 – 1:55 | Landing, sección "Tu plata nunca pasa por nosotros" | "Tiendita nunca toca la plata: el pago va directo a la wallet del comerciante. Si mañana desaparecemos, él sigue cobrando." |
| 9 | 1:55 – 2:00 | Logo + `tienditawapu.vercel.app` + logos La Crypta / Wapu | "Tiendita. Bitcoin gana cuando deja de ser noticia." |

---

## Tips

- **Grabá por escenas** y uní después (CapCut o DaVinci Resolve, ambos gratis). Si una toma sale mal, repetís solo esa.
- **La escena 5 es la más importante**: el pago real confirmándose solo. Si el pago tarda, cortá la espera en edición.
- Grabá la voz aparte, con el celular cerca de la boca en un lugar sin eco, y sincronizala después: suena mucho mejor que el micrófono de la notebook.
- Agregá subtítulos (CapCut los genera solos): mucha gente mira sin sonido.
- Si algo falla en vivo durante la presentación, este video es tu respaldo.
