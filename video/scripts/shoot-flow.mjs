/**
 * Recorre tienditawapu.vercel.app como un usuario real y guarda capturas
 * 1920x1080 de cada paso + un manifest.json con la posición de cada elemento
 * clickeado (para animar el cursor en Remotion).
 *
 * Crea una tienda demo real en producción con una llave Nostr descartable.
 *
 * Uso: LD_LIBRARY_PATH=.libs/root/usr/lib/x86_64-linux-gnu node scripts/shoot-flow.mjs
 */
import fs from 'node:fs';
import { launch } from './browser.mjs';

const BASE = 'https://tienditawapu.vercel.app';
const OUT = new URL('../public/shots/', import.meta.url).pathname;
const LN_ADDRESS = 'negr0@lawallet.io';
const SLUG = 'la-panaderia-del-barrio';

const manifest = {};

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.setDefaultTimeout(30_000);

async function box(locator) {
  const b = await locator.boundingBox();
  return b ? { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } : null;
}

/** Captura la pantalla; `target` es el elemento que se clickea a continuación. */
async function shot(name, { target, extra = {}, fullPage = false } = {}) {
  await page.waitForTimeout(700);
  if (target) await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage });
  const entry = { ...extra };
  if (target) entry.click = await box(target);
  for (const [k, v] of Object.entries(extra)) {
    if (v && typeof v === 'object' && 'boundingBox' in v) entry[k] = await box(v);
  }
  manifest[name] = entry;
  fs.writeFileSync(`${OUT}manifest.json`, JSON.stringify(manifest, null, 2));
  console.log('📸', name, entry.click ? `click @ ${entry.click.x},${entry.click.y}` : '');
}

async function typeSlow(locator, text) {
  await locator.click();
  await locator.fill('');
  await locator.pressSequentially(text, { delay: 15 });
}

// ── 1. Login: crear cuenta ──────────────────────────────────────────────
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
const createBtn = page.getByRole('button', { name: /crear cuenta/i });
await shot('01-login', { target: createBtn });
await createBtn.click();

const nsecCode = page.locator('code').first();
await nsecCode.waitFor();
const checkbox = page.getByRole('checkbox');
await checkbox.check();
const createShop = page.getByRole('button', { name: /crear mi tienda/i });
await shot('02-nsec', { target: createShop, extra: { blur: nsecCode } });
await createShop.click();

// ── 2. Setup ────────────────────────────────────────────────────────────
await page.waitForURL(/dashboard\/setup/);
await page.waitForLoadState('networkidle');
await typeSlow(page.getByPlaceholder('Ej: Panadería del Barrio'), 'Panadería del Barrio');
const slugInput = page.getByPlaceholder('panaderia-del-barrio');
await slugInput.fill(SLUG);
await typeSlow(
  page.getByPlaceholder(/Pan recién horneado/),
  'Pan de masa madre, medialunas y facturas recién horneadas. Cabildo 2400, Belgrano.',
);
let next = page.getByRole('button', { name: /siguiente|continuar/i }).first();
await shot('03-setup-tienda', { target: next });
await next.click();

await typeSlow(page.getByPlaceholder('vos@walletofsatoshi.com'), LN_ADDRESS);
next = page.getByRole('button', { name: /siguiente|continuar/i }).last();
await shot('04-setup-lightning', { target: next });
await next.click();

await typeSlow(page.getByPlaceholder('panaderia.barrio'), 'panaderia.barrio');
await typeSlow(page.getByPlaceholder('Juan Pérez'), 'Juan Pérez');
const finish = page.getByRole('button', { name: /crear mi tienda/i });
await shot('05-setup-wapu', { target: finish });
await finish.click();

// Puede ir directo al dashboard o mostrar el aviso de LUD-21
await Promise.race([
  page.waitForURL(/\/dashboard$/, { timeout: 40_000 }),
  page.getByText(/Tienda creada. Un aviso/).waitFor({ timeout: 40_000 }),
  page.locator('.text-err').first().waitFor({ timeout: 40_000 }),
]);
if (await page.locator('.text-err').first().isVisible().catch(() => false)) {
  await page.screenshot({ path: `${OUT}error-setup.png` });
  throw new Error('Setup falló: ' + (await page.locator('.text-err').first().innerText()));
}
manifest.lud21Warning = await page.getByText(/Tienda creada. Un aviso/).isVisible().catch(() => false);
if (manifest.lud21Warning) {
  const go = page.getByRole('button', { name: /ir a mi tienda/i });
  await shot('05b-setup-aviso', { target: go });
  await go.click();
  await page.waitForURL(/\/dashboard$/);
}

// ── 3. Color de acento (configuración) ──────────────────────────────────
await page.goto(`${BASE}/dashboard/settings`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Tomate' }).click();
await page.getByRole('button', { name: /guardar cambios/i }).click();
await page.getByText(/guardado/).waitFor();

// ── 4. Productos ────────────────────────────────────────────────────────
const products = [
  {
    name: 'Pan de masa madre (1kg)',
    description: 'Hogaza de campo, fermentación de 24 horas. Sale del horno todos los días a las 8.',
    price: '4500',
    delivery: 'Retirá tu pan en Cabildo 2400 mostrando esta pantalla. ¡Gracias por tu compra!',
  },
  {
    name: 'Medialunas de manteca (docena)',
    description: 'Las clásicas del barrio, con almíbar. Recién hechas.',
    price: '6000',
    delivery: 'Retirá tus medialunas en Cabildo 2400 mostrando esta pantalla.',
  },
  {
    name: 'Curso online: pan en casa',
    description: '12 videos paso a paso para hacer tu propia masa madre. Acceso de por vida.',
    price: '15000',
    delivery: 'Tu acceso al curso: https://tienditawapu.vercel.app/la-panaderia-del-barrio — código PAN-2026',
  },
];

await page.goto(`${BASE}/dashboard/products`, { waitUntil: 'networkidle' });
for (const [i, p] of products.entries()) {
  const newBtn = page.getByRole('button', { name: /nuevo producto/i });
  if (await newBtn.isVisible().catch(() => false)) await newBtn.click();
  await typeSlow(page.getByPlaceholder('Pan casero (1kg)'), p.name);
  await typeSlow(page.getByPlaceholder('Hogaza de masa madre, fermentación de 24hs.'), p.description);
  await typeSlow(page.getByPlaceholder(/Link de descarga, código/), p.delivery);
  await typeSlow(page.getByPlaceholder('5000'), p.price);
  const submit = page.getByRole('button', { name: /crear producto/i });
  if (i === 2) await shot('06-producto-form', { target: submit });
  await submit.click();
  await page.getByText(p.name).first().waitFor();
}
await page.waitForTimeout(800);
const publishBtn = page.getByRole('button', { name: /^publicar$/i });
await shot('07-productos', { target: publishBtn, fullPage: false });

// ── 5. Dashboard con QR ─────────────────────────────────────────────────
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
const printBtn = page.getByRole('button', { name: /imprimir cartel/i });
await shot('08-dashboard-qr', { target: printBtn });

// Cartel imprimible (popup)
const [popup] = await Promise.all([
  page.waitForEvent('popup'),
  printBtn.click(),
]);
await popup.setViewportSize({ width: 1920, height: 1080 });
await popup.evaluate(() => { window.print = () => {}; });
await popup.waitForLoadState('load');
await popup.waitForTimeout(800);
await popup.screenshot({ path: `${OUT}09-cartel.png` });
manifest['09-cartel'] = {};
await popup.close();

// ── 6. Tienda pública + compra (otro contexto = cliente) ────────────────
const buyerCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const buyer = await buyerCtx.newPage();
buyer.setDefaultTimeout(30_000);
const shotBuyer = async (name, opts = {}) => {
  await buyer.waitForTimeout(700);
  if (opts.target) await opts.target.scrollIntoViewIfNeeded();
  await buyer.waitForTimeout(300);
  await buyer.screenshot({ path: `${OUT}${name}.png`, fullPage: !!opts.fullPage });
  const entry = {};
  if (opts.target) entry.click = await box(opts.target);
  manifest[name] = entry;
  fs.writeFileSync(`${OUT}manifest.json`, JSON.stringify(manifest, null, 2));
  console.log('📸', name, entry.click ? `click @ ${entry.click.x},${entry.click.y}` : '');
};

await buyer.goto(`${BASE}/${SLUG}`, { waitUntil: 'networkidle' });
await buyer.screenshot({ path: `${OUT}10-tienda-full.png`, fullPage: true });
const buyButtons = buyer.getByRole('button', { name: /comprar con Lightning/i });
const breadBuy = buyButtons.last(); // orden: más nuevo primero → el pan es el último
await shotBuyer('10-tienda', { target: breadBuy });
await breadBuy.click();
await typeSlow(buyer.getByPlaceholder('tu nombre'), 'Lucía Fernández');
await typeSlow(buyer.getByPlaceholder(/WhatsApp, email o dirección/), 'WhatsApp +54 9 11 5555-0123');
const goPay = buyer.getByRole('button', { name: /ir a pagar/i });
await shotBuyer('11-datos-comprador', { target: goPay });
await goPay.click();

await buyer.waitForURL(/checkout/, { timeout: 40_000 });
await buyer.waitForLoadState('networkidle');
await buyer.locator('img[alt="Lightning invoice"]').waitFor();
manifest.checkoutUrl = buyer.url();
const demoBtn = buyer.getByRole('button', { name: /simular pago/i });
manifest.demoMode = await demoBtn.isVisible().catch(() => false);
await shotBuyer('12-checkout', { target: manifest.demoMode ? demoBtn : undefined });

if (manifest.demoMode) {
  await demoBtn.click();
  await buyer.getByText('¡Listo!').waitFor({ timeout: 40_000 });
  await buyer.waitForTimeout(1500);
  await shotBuyer('13-pagado');
}

// ── 7. Ventas del comerciante ───────────────────────────────────────────
await page.goto(`${BASE}/dashboard/orders`, { waitUntil: 'networkidle' });
await shot('14-ventas');
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
await shot('15-dashboard-final');

fs.writeFileSync(`${OUT}manifest.json`, JSON.stringify(manifest, null, 2));
console.log('✅ listo', JSON.stringify({ demoMode: manifest.demoMode, lud21Warning: manifest.lud21Warning }));
await browser.close();
