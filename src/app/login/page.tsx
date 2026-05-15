import Link from 'next/link';
import { ArrowLeft, Zap } from 'lucide-react';
import { NostrLoginButton } from '@/components/NostrLoginButton';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="btn-ghost mb-8 inline-flex">
          <ArrowLeft className="w-4 h-4" /> volver
        </Link>

        <div className="card-paper">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 fill-bolt stroke-ink" />
            <span className="font-display font-black tracking-tight text-xl">MOSTRADOR</span>
          </div>

          <h1 className="font-display text-4xl font-black leading-tight mb-3">
            Entrar a tu tienda
          </h1>
          <p className="text-ink-soft mb-8 leading-relaxed">
            Mostrador no usa passwords ni emails. Tu identidad es tu llave Nostr.
            Si no tenés extensión, te recomendamos{' '}
            <a href="https://getalby.com" target="_blank" rel="noopener" className="underline font-medium">
              Alby
            </a>
            .
          </p>

          <NostrLoginButton />
        </div>

        <p className="text-receipt text-center mt-8">
          es la primera vez? la primera vez que entres con tu llave,
          <br />
          mostrador crea tu tienda automáticamente.
        </p>
      </div>
    </main>
  );
}
