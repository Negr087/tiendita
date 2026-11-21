import React from 'react';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { AfterPaymentCard, CustodyCard, IntroCard, OutroCard, ProblemCard, SolutionCard } from './Cards';
import { ScreenScene, type Box, type ScreenSceneProps } from './ScreenScene';
import manifest from '../public/shots/manifest.json';

const m = manifest as unknown as Record<string, { click?: Box; blur?: Box }>;
const SITE = 'tienditawapu.vercel.app';
const T = 15; // frames de transición

type Scene =
  | { kind: 'card'; el: React.FC; frames: number }
  | { kind: 'screen'; props: ScreenSceneProps; frames: number };

const scenes: Scene[] = [
  { kind: 'card', el: IntroCard, frames: 95 },
  { kind: 'card', el: ProblemCard, frames: 135 },
  { kind: 'card', el: SolutionCard, frames: 80 },
  {
    kind: 'screen',
    frames: 220,
    props: {
      src: 'landing-full.png',
      url: SITE,
      caption: 'Una landing que explica todo en 3 pasos',
      scroll: { from: 0, to: 1900 },
      imgHeight: 3721,
    },
  },
  {
    kind: 'screen',
    frames: 120,
    props: {
      src: '01-login.png',
      url: `${SITE}/login`,
      step: '01',
      caption: 'Entrás con una llave Nostr. Sin email ni contraseñas.',
      focus: { x: 960, y: 560, zoom: 1.4 },
      click: m['01-login']?.click,
    },
  },
  {
    kind: 'screen',
    frames: 105,
    props: {
      src: '02-nsec.png',
      url: `${SITE}/login`,
      step: '01',
      caption: 'Tu llave es tu cuenta: la guardás y listo.',
      focus: { x: 960, y: 640, zoom: 1.45 },
      click: m['02-nsec']?.click,
      hide: m['02-nsec']?.blur,
      hideLabel: 'nsec1 •••••••••••• (oculta)',
    },
  },
  {
    kind: 'screen',
    frames: 125,
    props: {
      src: '03-setup-tienda.png',
      url: `${SITE}/dashboard/setup`,
      step: '02',
      caption: 'Nombre de la tienda y tu URL pública',
      focus: { x: 768, y: 500, zoom: 1.5 },
      click: m['03-setup-tienda']?.click,
    },
  },
  {
    kind: 'screen',
    frames: 125,
    props: {
      src: '04-setup-lightning.png',
      url: `${SITE}/dashboard/setup`,
      step: '02',
      caption: 'Tu Lightning Address: los sats van directo a tu wallet',
      focus: { x: 860, y: 470, zoom: 1.7 },
      click: m['04-setup-lightning']?.click,
    },
  },
  {
    kind: 'screen',
    frames: 125,
    props: {
      src: '05-setup-wapu.png',
      url: `${SITE}/dashboard/setup`,
      step: '02',
      caption: 'Tu alias bancario: Wapu te convierte los sats en pesos',
      focus: { x: 860, y: 520, zoom: 1.6 },
      click: m['05-setup-wapu']?.click,
    },
  },
  {
    kind: 'screen',
    frames: 155,
    props: {
      src: '06-producto-form.png',
      url: `${SITE}/dashboard/products`,
      step: '03',
      caption: 'Precio en pesos y lo que recibe el cliente al pagar',
      focus: { x: 770, y: 560, zoom: 1.5 },
      click: m['06-producto-form']?.click,
    },
  },
  {
    kind: 'screen',
    frames: 125,
    props: {
      src: '07-productos.png',
      url: `${SITE}/dashboard/products`,
      step: '03',
      caption: 'Con un click, tu catálogo se publica en Nostr',
      focus: { x: 860, y: 560, zoom: 1.4 },
      click: m['07-productos']?.click,
      cursorFrom: { x: 700, y: 420 },
    },
  },
  {
    kind: 'screen',
    frames: 125,
    props: {
      src: '08-dashboard-qr.png',
      url: `${SITE}/dashboard`,
      step: '04',
      caption: 'Tu link y tu QR, listos para compartir',
      focus: { x: 1000, y: 360, zoom: 1.5 },
      click: m['08-dashboard-qr']?.click,
      cursorFrom: { x: 1300, y: 600 },
    },
  },
  {
    kind: 'screen',
    frames: 80,
    props: {
      src: '09-cartel.png',
      url: 'cartel imprimible',
      step: '04',
      caption: 'Imprimís el cartel y lo pegás en el mostrador',
      focus: { x: 960, y: 470, zoom: 1.15 },
    },
  },
  {
    kind: 'screen',
    frames: 125,
    props: {
      src: '10-tienda.png',
      url: `${SITE}/la-panaderia-del-barrio`,
      step: '05',
      caption: 'Tu cliente entra a tu tienda y elige',
      focus: { x: 1100, y: 640, zoom: 1.3 },
      click: m['10-tienda']?.click,
    },
  },
  {
    kind: 'screen',
    frames: 120,
    props: {
      src: '11-datos-comprador.png',
      url: `${SITE}/la-panaderia-del-barrio`,
      step: '05',
      caption: 'Deja su nombre y contacto para coordinar la entrega',
      focus: { x: 1150, y: 800, zoom: 1.5 },
      click: m['11-datos-comprador']?.click,
      cursorFrom: { x: 900, y: 700 },
    },
  },
  {
    kind: 'screen',
    frames: 155,
    props: {
      src: '12-checkout.png',
      url: `${SITE}/checkout`,
      step: '06',
      caption: 'Paga con cualquier wallet Lightning. Tasa BTC/ARS en vivo.',
      focus: { x: 960, y: 440, zoom: 1.5 },
    },
  },
  { kind: 'card', el: AfterPaymentCard, frames: 190 },
  {
    kind: 'screen',
    frames: 120,
    props: {
      src: '14-ventas.png',
      url: `${SITE}/dashboard/orders`,
      step: '07',
      caption: 'Cada venta en tu panel, con los datos del comprador',
      focus: { x: 780, y: 260, zoom: 1.75 },
      patches: [{ x: 347, y: 200, w: 14, h: 16, content: '📇', bg: '#FBF6EA', fontSize: 12 }],
    },
  },
  { kind: 'card', el: CustodyCard, frames: 135 },
  { kind: 'card', el: OutroCard, frames: 160 },
];

export const totalFrames = scenes.reduce((s, sc) => s + sc.frames, 0) - T * (scenes.length - 1);

export const TienditaVideo: React.FC = () => (
  <TransitionSeries>
    {scenes.flatMap((sc, i) => {
      const seq = (
        <TransitionSeries.Sequence key={`s${i}`} durationInFrames={sc.frames}>
          {sc.kind === 'card' ? <sc.el /> : <ScreenScene {...sc.props} />}
        </TransitionSeries.Sequence>
      );
      if (i === scenes.length - 1) return [seq];
      // Entre pantallas del mismo paso: slide; resto: fade
      const next = scenes[i + 1];
      const presentation =
        sc.kind === 'screen' && next.kind === 'screen' ? slide({ direction: 'from-right' }) : fade();
      return [
        seq,
        <TransitionSeries.Transition key={`t${i}`} presentation={presentation} timing={linearTiming({ durationInFrames: T })} />,
      ];
    })}
  </TransitionSeries>
);
