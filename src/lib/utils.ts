import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formato pesos argentinos. Sin centavos porque tiendita. */
export function formatArs(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Formato sats con separadores, ej: 12.345 sats */
export function formatSats(amount: number): string {
  return `${amount.toLocaleString('es-AR')} sats`;
}

/** Genera un slug seguro para URL desde un nombre. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** "hace 3 minutos" en español */
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'hace un momento';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} día${days > 1 ? 's' : ''}`;
  return date.toLocaleDateString('es-AR');
}

/** Trunca un npub para mostrarlo: npub1abc...xyz */
export function shortNpub(npub: string): string {
  if (npub.length < 16) return npub;
  return `${npub.slice(0, 8)}…${npub.slice(-6)}`;
}
