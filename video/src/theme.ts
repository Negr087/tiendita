import { loadFont as loadFraunces } from '@remotion/google-fonts/Fraunces';
import { loadFont as loadInter } from '@remotion/google-fonts/InterTight';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';

export const display = loadFraunces('normal', { weights: ['400', '700', '900'], subsets: ['latin'] }).fontFamily;
export const displayItalic = loadFraunces('italic', { weights: ['300', '400'], subsets: ['latin'] }).fontFamily;
export const sans = loadInter('normal', { weights: ['400', '500', '700'], subsets: ['latin'] }).fontFamily;
export const mono = loadMono('normal', { weights: ['400', '700'], subsets: ['latin'] }).fontFamily;

// Paleta de Tiendita (tailwind.config.ts)
export const C = {
  ink: '#1A1A17',
  inkSoft: '#4A4A44',
  paper: '#FBF6E9',
  paperWarm: '#F5EFE0',
  paperDark: '#EAE2CC',
  bolt: '#FFD400',
  ok: '#2D6A4F',
  err: '#C1272D',
};

export const FPS = 30;
export const W = 1920;
export const H = 1080;
