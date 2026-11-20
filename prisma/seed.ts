/**
 * Seed — datos de ejemplo para demo y desarrollo
 *
 * Crea un comerciante de ejemplo (Panadería del Barrio) con algunos productos.
 * Útil para ver la UI sin tener que crear todo
 * desde cero cada vez.
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding...');

  // Borrar datos previos del seed
  await db.order.deleteMany({});
  await db.product.deleteMany({});
  await db.user.deleteMany({});

  // Comerciante de ejemplo
  // npub real de ejemplo de Nostr (jb55) — solo para que el seed sea válido
  const panadero = await db.user.create({
    data: {
      npub: 'npub1xtscya34g58tk0z605fvr788k263gsu6cy9x0mhnm87echrgufzsevkk5s',
      slug: 'panaderia-del-barrio',
      shopName: 'Panadería del Barrio',
      shopDescription:
        'Pan recién horneado todos los días. Vendemos online y físico en Av. Cabildo 2400, Belgrano.',
      shopAccent: '#FFD400',
      lightningAddress: 'panadero@walletofsatoshi.com',
      wapuAlias: 'panaderia.barrio',
      wapuReceiverName: 'Juan Pérez',
      displayName: 'Juan Pérez',
    },
  });

  // Productos
  await db.product.createMany({
    data: [
      {
        userId: panadero.id,
        name: 'Pan casero (1kg)',
        description: 'Hogaza de masa madre, fermentación de 24hs.',
        priceArs: 3000,
      },
      {
        userId: panadero.id,
        name: 'Medialunas (docena)',
        description: 'Recién horneadas, frescas todos los días.',
        priceArs: 4500,
      },
      {
        userId: panadero.id,
        name: 'Curso online: pan en casa',
        description: '12 videos + grupo privado de Telegram. Acceso de por vida.',
        priceArs: 8000,
      },
    ],
  });

  console.log('✓ Seed completo. Tienda demo: /panaderia-del-barrio');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
