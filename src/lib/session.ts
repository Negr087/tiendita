import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  userId?: string;
  npub?: string;
  // Challenge en curso (antes de que termine login)
  pendingChallenge?: {
    challenge: string;
    issuedAt: number;
  };
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production') {
    // Sin secreto propio, cualquiera que lea el código puede falsificar sesiones.
    throw new Error('SESSION_SECRET no configurado (mínimo 32 caracteres). Generá uno con: openssl rand -base64 32');
  }
  return 'dev-only-secret-no-usar-en-produccion-0000';
}

const sessionOptions: Omit<SessionOptions, 'password'> = {
  cookieName: 'tiendita_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 días
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, {
    ...sessionOptions,
    password: getSessionSecret(),
  });
}
