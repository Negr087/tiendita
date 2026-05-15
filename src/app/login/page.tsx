import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NostrLoginButton } from '@/components/NostrLoginButton';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="btn-ghost mb-8 inline-flex">
          <ArrowLeft className="w-4 h-4" /> volver
        </Link>

        <div className="card-paper">
          <div className="flex items-center mb-4">
            <img src="/tiendita-logo.png" alt="Tiendita" className="h-9 rounded-full" /><span className="font-display font-black tracking-tight text-xl ml-2">TIENDITA</span>
          </div>

          <h1 className="font-display text-4xl font-black leading-tight mb-3">
            Entrar a tu tienda
          </h1>
          <p className="text-ink-soft mb-8 leading-relaxed">
            Tiendita no usa passwords ni emails. Podés crear una cuenta en segundos
            o conectarte con tu extensión Nostr (Alby, nos2x).
          </p>

          <NostrLoginButton />
        </div>

        <p className="text-receipt text-center mt-8">
          primera vez? tiendita crea tu tienda automáticamente.
          <br />
          sin password, sin email.
        </p>
      </div>
    </main>
  );
}
