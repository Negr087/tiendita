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

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? 'cambiame-en-produccion-32-chars-min',
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
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
