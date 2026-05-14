# Mostrador ⚡

> Tu tienda Lightning en 60 segundos. Cobrás sats, recibís pesos.

**Hackathon:** Commerce — La Crypta · 2026
**Track:** Lightning Stores & Checkout
**Equipo:** [tu nombre]
**Demo:** [link Vercel cuando esté deployado]
**Video:** [link de Loom/YouTube]

---

## El problema

Hay aproximadamente **600.000 comercios argentinos** que no pueden cobrar online a clientes internacionales. Stripe no opera para Argentina, PayPal cobra comisiones del 5–7% más conversión a tasa oficial, y abrir Mercado Pago internacional es burocracia pura. El bitcoiner argentino que quiere comprar pan en Caballito no puede hacerlo desde el otro lado del mundo. El comerciante que solo habla español no puede vender un producto digital al exterior.

Mostrador resuelve esto sin pedirle al comerciante que entienda Bitcoin.

## Cómo funciona

```
┌──────────────┐      ┌─────────────┐      ┌────────────┐      ┌────────────┐
│  Comerciante │──┬──>│  Mostrador  │──┬──>│  Lightning │──┬──>│  Cliente   │
│  (panadero)  │  │   │   (tienda)  │  │   │  Address   │  │   │  (paga ⚡) │
└──────────────┘  │   └─────────────┘  │   └────────────┘  │   └────────────┘
                  │                    │                    │
                  │                    │                    │
                  └────── login NIP-07 ┘                    │
                                                            │
              ┌────── pago confirmado ─────────────────────┘
              │
              ▼
       ┌──────────┐
       │   Wapu   │── ARS ──> alias/CBU del comerciante
       └──────────┘
```

1. **Comerciante** se loguea con su llave Nostr (NIP-07) en menos de 5 segundos. Configura su Lightning Address (ej: `juan@walletofsatoshi.com`) y su alias bancario para recibir ARS.
2. Carga productos: pueden ser **ventas únicas** o **suscripciones recurrentes**.
3. Comparte la URL de su tienda (`mostrador.app/su-slug`) o el QR.
4. **Cliente** entra, elige producto, paga en sats desde cualquier wallet Lightning. La tasa BTC/ARS se calcula en vivo via Yadio.
5. Pago confirmado → **Mostrador dispara automáticamente Wapu** para hacer el offramp ARS al alias del comerciante.

## El diferenciador: pagos recurrentes

Mostrador es la primera plataforma del ecosistema Bitcoin argentino con **suscripciones nativas Lightning**. El comerciante define un producto tipo `SUBSCRIPTION` con un intervalo (semanal, mensual, trimestral). Cuando un cliente se suscribe, Mostrador:

- Cobra el primer ciclo de inmediato.
- Crea una `Subscription` activa.
- Un worker en background revisa cada hora qué suscripciones vencen y notifica al cliente para que pague el siguiente ciclo.
- Cliente puede cancelar en cualquier momento.
- Comerciante recibe pesos automáticamente cada ciclo.

Esto es **lo que Patreon hace, sin Patreon**: sin la comisión del 30%, sin Stripe, sin necesidad de KYC del lado del comerciante.

## Stack técnico

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Framework | Next.js 15 (App Router) | Full-stack en un repo, deploys triviales en Vercel |
| Lenguaje | TypeScript estricto | Sin `any`, todo tipado |
| Auth | NIP-07 + iron-session | Login con extensión Nostr (Alby/nos2x). Cero passwords. |
| DB | SQLite + Prisma | Cero config para el hackathon. Postgres-ready cambiando provider. |
| Pagos in | LNURL-pay | El comerciante usa su Lightning Address existente. **Mostrador nunca custodia fondos.** |
| Pagos out | Wapu API | Offramp ARS automatizado |
| Tasa BTC/ARS | Yadio | Tasa argentina informal, sin API key |
| UI | Tailwind + shadcn/ui | Diseño rápido sin renunciar a calidad |
| Validación | Zod | Schemas en API routes |
| Tests | Vitest | Lógica crítica testeada |

## Decisiones de arquitectura

### 1. Mostrador no custodia fondos.

El comerciante ingresa su **Lightning Address** (ej: `juan@walletofsatoshi.com`). Cada vez que un cliente compra, Mostrador hace LNURL-pay contra esa address y el invoice se paga directo a la wallet del comerciante. Si Mostrador desaparece mañana, el comerciante sigue cobrando en la misma address. **Esto es soberanía pura.**

### 2. Identidad = llave Nostr, no email.

Cero campos de registro. El comerciante se loguea firmando un challenge con su nsec via NIP-07. Imposible de falsificar. Si alguien quiere migrar de plataforma, solo se lleva su llave: no necesita "exportar" datos.

### 3. Modo demo para pagos recurrentes.

Mostrarle al jurado AI un ciclo completo de suscripción tomaría 7 días (o 30, o 90). En `DEMO_MODE=true`, los "días" se interpretan como múltiplos configurables de segundos — por defecto, 30s. Una "suscripción semanal" en demo se renueva cada 3.5 minutos. El jurado ve el ciclo completo en vivo durante el pitch.

### 4. Wapu mock por defecto.

`WAPU_MODE=mock` simula los retiros con latencia realista y un 5% de falla aleatoria (para mostrar que el manejo de errores está implementado). Para producción real, cambiar a `WAPU_MODE=real` con API key.

## Cómo correr local

```bash
# 1. Clonar e instalar
git clone https://github.com/<tu-user>/mostrador.git
cd mostrador
npm install

# 2. Configurar entorno
cp .env.example .env
# Editar .env y poner SESSION_SECRET (openssl rand -base64 32)

# 3. Inicializar DB
npm run db:push
npm run db:seed   # opcional: datos de ejemplo

# 4. Levantar dev server
npm run dev
# → http://localhost:3000

# 5. (Opcional) Levantar el worker de suscripciones
# en otra terminal:
npm run worker:subs
```

## Estructura del repo

```
mostrador/
├── prisma/
│   └── schema.prisma          # 4 modelos: User, Product, Order, Subscription
├── src/
│   ├── app/
│   │   ├── (public)/           # Landing y página de tienda pública
│   │   ├── api/                # Endpoints REST
│   │   │   ├── auth/           # Challenge + verify Nostr
│   │   │   ├── shop/           # CRUD tienda
│   │   │   ├── products/       # CRUD productos
│   │   │   └── orders/         # Crear orden, polling status
│   │   ├── dashboard/          # Panel del comerciante
│   │   ├── login/              # Login NIP-07
│   │   ├── globals.css         # Design system
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/             # UI components reusables
│   ├── lib/                    # db, session, nostr-auth, utils
│   ├── services/               # lightning, wapu, price, orders
│   └── workers/                # subscriptions cron
└── tests/                      # Unit tests
```

## Tests

```bash
npm test
```

Cubre:
- Conversión ARS ↔ sats con tasas variables
- Verificación de eventos Nostr firmados
- Generación de slugs únicos
- Lógica de `nextBillingAt` en modo demo y modo real

## Roadmap

- [ ] **NIP-15** — publicar productos en relays Nostr para descubribilidad sin servidor central
- [ ] **NIP-04** — gated content via mensajes encriptados al npub del suscriptor
- [ ] **L402** — endpoints pagables por agentes AI (conexión con hackathon AI Agents de agosto)
- [ ] **Multi-currency** — USD, USDT, EUR como moneda de display
- [ ] **Cashu mints** — recibos como tokens portables
- [ ] **Webhooks de wallets** (LNbits, Alby Hub) para detección de pagos sin polling
- [ ] **Bulk import** desde CSV — onboardeo masivo de comercios

## Licencia

MIT — código tuyo, código mío, código de todos. Como debe ser.

## Filosofía

> Bitcoin gana cuando deja de ser noticia.

Mostrador no le enseña Bitcoin a nadie. Lo hace invisible para el comerciante, transparente para el cliente, e inevitable para el sistema.

---

**Built with ⚡ in Argentina** · [La Crypta Hackathon Commerce 2026](https://lacrypta.dev/hackathons/commerce) · [Wapu](https://wapu.shiafu.com)
