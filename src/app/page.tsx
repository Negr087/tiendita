import Link from 'next/link';
import { Zap, Store, Repeat, ArrowRight, Check } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* ==================== NAV ==================== */}
      <nav className="border-b-2 border-ink bg-paper-warm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/tiendita-logo.png" alt="Tiendita" className="h-9 rounded-full" /><span className="font-display font-black tracking-tight text-xl ml-2">TIENDITA</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/explore" className="btn-ghost hidden sm:inline-flex">
              explorar tiendas
            </Link>
            <Link href="/login" className="btn-bolt">
              abrir mi tienda <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ==================== HERO ==================== */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32 relative">
        {/* Stamp decorativo */}
        <div className="absolute top-12 right-6 md:right-20 stamp border-err text-err opacity-90 hidden md:block">
          OPEN SOURCE ·{' '}
          <img src="/wapu-logo.png" alt="Wapu" className="inline h-7 align-middle" />
        </div>

        <p className="text-receipt mb-6 animate-fade-up">
          ⚡ Hackathon Commerce · La Crypta · 2026
        </p>

        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tighter text-balance animate-fade-up">
          Tu tienda
          <br />
          en <span className="bg-bolt px-2 -mx-1 inline-block -rotate-1">60 segundos</span>.
          <br />
          <span className="italic font-light">Cobrás sats,</span>
          <br />
          <span className="italic font-light">recibís pesos.</span>
        </h1>

        <p className="mt-8 text-xl md:text-2xl text-ink-soft max-w-2xl text-pretty leading-relaxed animate-fade-up [animation-delay:120ms]">
          Hay 600 mil comercios argentinos excluidos del sistema financiero global.
          Tiendita los enchufa al mundo. Sin Stripe, sin KYC, sin custodios.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 animate-fade-up [animation-delay:240ms]">
          <Link href="/login" className="btn-bolt text-lg px-7 py-3.5">
            abrir mi tienda gratis <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="#como-funciona" className="btn-ghost text-lg">
            ver cómo funciona →
          </Link>
        </div>

        {/* Métricas tipo recibo */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-ink border-2 border-ink shadow-paper">
          {[
            { v: '60s', l: 'crear tienda' },
            { v: '0%', l: 'KYC del comerciante' },
            { v: '⚡', l: 'pagos instantáneos' },
            { v: 'ARS', l: 'cobrás en pesos' },
          ].map((m, i) => (
            <div key={i} className="bg-paper-warm p-6 text-center">
              <div className="text-4xl md:text-5xl font-display font-black">{m.v}</div>
              <div className="text-receipt mt-2">{m.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== CÓMO FUNCIONA ==================== */}
      <section id="como-funciona" className="bg-ink text-paper py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,212,0,0.15), transparent 40%)'
        }} />
        <div className="max-w-6xl mx-auto px-6 relative">
          <p className="text-bolt font-mono text-sm uppercase tracking-widest mb-3">
            // así de simple
          </p>
          <h2 className="font-display text-5xl md:text-6xl font-black leading-tight mb-16 max-w-3xl text-balance">
            Tres pasos. Cero<br/>conocimiento de Bitcoin requerido.
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                n: '01',
                icon: Store,
                title: 'Abrís tu tienda',
                body: 'Conectás tu Nostr, ponés tu alias bancario, cargás tus productos. Tenés URL pública y QR para imprimir.',
                detail: 'tiendita.app/tu-nombre',
              },
              {
                n: '02',
                icon: Zap,
                title: 'Tu cliente paga',
                body: 'Escanea el QR desde cualquier wallet Lightning. La tasa BTC/ARS se calcula al instante, sin sorpresas.',
                detail: 'pago confirmado en 3 segundos',
              },
              {
                n: '03',
                icon: Repeat,
                title: 'Recibís pesos',
                body: 'Wapu hace el offramp automático. Te llegan los pesos al alias que configuraste. Sin intermediarios.',
                detail: 'directo a tu CBU/alias',
              },
            ].map((s) => (
              <div
                key={s.n}
                className="bg-paper-warm text-ink p-8 border-2 border-bolt shadow-[8px_8px_0_0_theme(colors.bolt.DEFAULT)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform"
              >
                <div className="flex items-start justify-between mb-6">
                  <span className="font-mono text-sm text-ink-mute">{s.n}</span>
                  <s.icon className="w-6 h-6" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-3">{s.title}</h3>
                <p className="text-ink-soft leading-relaxed mb-4">{s.body}</p>
                <div className="text-receipt border-t border-ink/20 pt-3">
                  → {s.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== EL DIFERENCIADOR: SUSCRIPCIONES ==================== */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-receipt mb-3">// el diferenciador</p>
            <h2 className="font-display text-4xl md:text-5xl font-black leading-tight mb-6 text-balance">
              No solo ventas.<br />
              <span className="italic font-light">Suscripciones</span> también.
            </h2>
            <p className="text-lg text-ink-soft leading-relaxed mb-6">
              ¿Sos panadero y querés vender la <em>bolsa de pan semanal</em>?
              ¿Sos profe y vendés clase mensual? ¿Barbero con corte trimestral?
            </p>
            <p className="text-lg text-ink-soft leading-relaxed">
              Tiendita es la primera plataforma del ecosistema Bitcoin
              argentino con <strong>pagos recurrentes nativos</strong>. Lo que
              Patreon hace, sin Patreon. Sin la comisión del 30%.
              Sin necesidad de Stripe.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                'Cliente paga la primera vez con Lightning',
                'Cada ciclo se renueva automáticamente',
                'Vos recibís pesos en tu cuenta sin tocar nada',
                'Cliente puede cancelar cuando quiera',
              ].map((x) => (
                <li key={x} className="flex items-start gap-3">
                  <Check className="w-5 h-5 mt-0.5 text-ok flex-shrink-0" strokeWidth={3} />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mock visual de un producto suscripción */}
          <div className="card-paper relative">
            <div className="absolute -top-3 -right-3 stamp bg-bolt border-ink">
              SUSCRIPCIÓN
            </div>
            <div className="aspect-video bg-paper-dark border-2 border-ink mb-4 flex items-center justify-center text-6xl">
              🥖
            </div>
            <p className="text-receipt mb-2">PANADERÍA DEL BARRIO</p>
            <h3 className="font-display text-3xl font-bold mb-2">Bolsa semanal</h3>
            <p className="text-ink-soft mb-4">
              Pan recién horneado todos los sábados a la mañana.
            </p>
            <div className="perforated my-4" />
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs uppercase text-ink-mute">precio</span>
              <span>
                <span className="font-display text-3xl font-black">$5.000</span>
                <span className="text-ink-mute"> / semana</span>
              </span>
            </div>
            <button className="btn-bolt w-full mt-6 justify-center" disabled>
              suscribirme con Lightning <Zap className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ==================== STACK TÉCNICO ==================== */}
      <section className="bg-paper-dark border-y-2 border-ink py-20">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-receipt mb-3">// para los que les interesa el código</p>
          <h2 className="font-display text-4xl md:text-5xl font-black mb-12 max-w-2xl text-balance">
            Construido sobre los pilares de La Crypta.
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Lightning', desc: 'Pagos instantáneos en BTC' },
              { name: 'Nostr', desc: 'Identidad soberana, NIP-07' },
              { name: 'Wapu', desc: 'Offramp ARS automatizado' },
              { name: 'Open Source', desc: 'MIT · GitHub público' },
            ].map((p) => (
              <div key={p.name} className="border-l-2 border-ink pl-4">
                <div className="font-display text-2xl font-bold mb-1">{p.name}</div>
                <div className="text-sm text-ink-soft">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CTA FINAL ==================== */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="font-display text-4xl md:text-6xl font-black leading-tight mb-6 text-balance">
          Bitcoin gana cuando<br />
          <span className="italic font-light">deja de ser noticia.</span>
        </h2>
        <p className="text-xl text-ink-soft mb-10 max-w-2xl mx-auto text-pretty">
          Tiendita no te enseña Bitcoin. Lo hace invisible. Y eso es exactamente
          como ganamos esta batalla.
        </p>
        <Link href="/login" className="btn-bolt text-lg px-8 py-4">
          empezar ahora <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t-2 border-ink bg-paper-warm">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div>
              <img src="/tiendita-logo.png" alt="Tiendita" className="h-12 rounded-full" />
            </div>
            <p className="text-receipt mt-2">
              hecho en argentina · open source · powered by{' '}
              <img src="/wapu-logo.png" alt="Wapu" className="inline h-5 align-middle ml-1" />
            </p>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="https://github.com/Negr087" className="hover:underline inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              github
            </a>
            <a href="https://lacrypta.ar" className="hover:underline inline-flex items-center gap-1.5">
              <img src="/lacrypta-logo.png" alt="La Crypta" className="w-4 h-4 rounded-sm" />
              la crypta
            </a>
            <a href="https://wapupay.com" className="hover:underline inline-flex items-center gap-1.5">
              <img src="/wapu-logo.png" alt="Wapu" className="w-4 h-4 rounded-sm" />
              wapu
            </a>
            <a href="https://primal.net/negr0" className="hover:underline inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm-8 152v-48l-32 32a8 8 0 0 1-11.31-11.31l48-48a8 8 0 0 1 13.31 6V176a8 8 0 0 1-16 0Zm72-48-48 48a8 8 0 0 1-13.31-6V80a8 8 0 0 1 16 0v48l32-32a8 8 0 0 1 11.31 11.31Z"/>
              </svg>
              nostr
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
