/** Placas de texto: intro, problema, después del pago, sin custodia y cierre. */
import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, display, displayItalic, mono, sans } from './theme';

const Bg: React.FC<{ dark?: boolean; children: React.ReactNode }> = ({ dark, children }) => (
  <AbsoluteFill
    style={{
      background: dark
        ? `radial-gradient(circle at 20% 30%, rgba(255,212,0,0.18), transparent 45%), ${C.ink}`
        : `radial-gradient(ellipse at 70% 0%, #FFE58A 0%, ${C.paperWarm} 45%, ${C.paperDark} 100%)`,
      color: dark ? C.paper : C.ink,
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    {children}
  </AbsoluteFill>
);

function useIn(delay: number, dur = 22) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: dur });
}

const Rise: React.FC<{ delay: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  delay,
  children,
  style,
}) => {
  const p = useIn(delay);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 40}px)`, ...style }}>{children}</div>
  );
};

export const IntroCard: React.FC = () => {
  const frame = useCurrentFrame();
  const logo = useIn(0, 30);
  const hl = interpolate(frame, [38, 58], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Bg>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        <Img
          src={staticFile('tiendita-logo.png')}
          style={{ width: 150, height: 150, borderRadius: 75, transform: `scale(${logo}) rotate(${(1 - logo) * -40}deg)` }}
        />
        <Rise delay={10}>
          <div style={{ fontFamily: display, fontWeight: 900, fontSize: 150, letterSpacing: -4, lineHeight: 1 }}>
            TIENDITA
          </div>
        </Rise>
        <Rise delay={22}>
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 64, position: 'relative' }}>
            Tu tienda Lightning en{' '}
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span
                style={{
                  position: 'absolute',
                  inset: '8px -8px 2px -8px',
                  background: C.bolt,
                  transform: `scaleX(${hl}) rotate(-1deg)`,
                  transformOrigin: 'left',
                  zIndex: 0,
                }}
              />
              <span style={{ position: 'relative' }}>60 segundos</span>
            </span>
          </div>
        </Rise>
        <Rise delay={34}>
          <div style={{ fontFamily: mono, fontSize: 24, letterSpacing: 4, color: C.inkSoft, marginTop: 10 }}>
            ⚡ HACKATHON COMMERCE · LA CRYPTA · 2026
          </div>
        </Rise>
      </div>
    </Bg>
  );
};

export const ProblemCard: React.FC = () => {
  const frame = useCurrentFrame();
  const count = Math.round(
    interpolate(frame, [8, 45], [0, 600000], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  );
  return (
    <Bg dark>
      <div style={{ maxWidth: 1500, padding: '0 80px' }}>
        <Rise delay={0}>
          <div style={{ fontFamily: mono, color: C.bolt, fontSize: 26, letterSpacing: 4, marginBottom: 24 }}>
            // EL PROBLEMA
          </div>
        </Rise>
        <Rise delay={4}>
          <div style={{ fontFamily: display, fontWeight: 900, fontSize: 150, lineHeight: 1, color: C.bolt }}>
            {count.toLocaleString('es-AR')}
          </div>
        </Rise>
        <Rise delay={10}>
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 66, lineHeight: 1.15, marginTop: 16 }}>
            comercios argentinos no pueden cobrarle a un cliente del exterior.
          </div>
        </Rise>
        <Rise delay={40}>
          <div style={{ fontFamily: sans, fontSize: 38, marginTop: 40, color: '#CFC8B4', display: 'flex', gap: 36 }}>
            <span>✗ Stripe no opera en Argentina</span>
            <span>✗ PayPal cobra ~7%</span>
          </div>
        </Rise>
      </div>
    </Bg>
  );
};

export const SolutionCard: React.FC = () => (
  <Bg>
    <div style={{ textAlign: 'center' }}>
      <Rise delay={0}>
        <div style={{ fontFamily: display, fontWeight: 900, fontSize: 120, lineHeight: 1.05 }}>Tiendita lo resuelve.</div>
      </Rise>
      <Rise delay={14}>
        <div style={{ fontFamily: displayItalic, fontWeight: 300, fontSize: 96, marginTop: 20 }}>
          Cobrás sats, recibís pesos.
        </div>
      </Rise>
    </div>
  </Bg>
);

const items = [
  { icon: '⚡', text: 'El pago se confirma solo, en segundos', sub: 'verificación LUD-21 contra la wallet del comercio' },
  { icon: '🎁', text: 'El cliente recibe lo que compró', sub: 'link de descarga, código o instrucciones de retiro' },
  { icon: '💬', text: 'El comerciante recibe un aviso por Nostr', sub: 'DM con el producto y los datos del comprador' },
  { icon: '🏦', text: 'Wapu le transfiere pesos a su cuenta', sub: 'offramp automático al alias o CBU' },
];

export const AfterPaymentCard: React.FC = () => (
  <Bg dark>
    <div style={{ width: 1400 }}>
      <Rise delay={0}>
        <div style={{ fontFamily: mono, color: C.bolt, fontSize: 26, letterSpacing: 4, marginBottom: 16 }}>
          // CUANDO EL CLIENTE PAGA
        </div>
      </Rise>
      <Rise delay={4}>
        <div style={{ fontFamily: display, fontWeight: 900, fontSize: 84, marginBottom: 50 }}>Todo pasa solo.</div>
      </Rise>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
        {items.map((it, i) => (
          <Rise key={it.text} delay={16 + i * 14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
              <div
                style={{
                  width: 84,
                  height: 84,
                  flexShrink: 0,
                  borderRadius: 14,
                  background: C.bolt,
                  border: `3px solid ${C.paper}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 44,
                }}
              >
                {it.icon}
              </div>
              <div>
                <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 44 }}>{it.text}</div>
                <div style={{ fontFamily: sans, fontSize: 28, color: '#CFC8B4', marginTop: 4 }}>{it.sub}</div>
              </div>
            </div>
          </Rise>
        ))}
      </div>
    </div>
  </Bg>
);

export const CustodyCard: React.FC = () => (
  <Bg>
    <div style={{ maxWidth: 1500, textAlign: 'center' }}>
      <Rise delay={0}>
        <div style={{ fontFamily: mono, fontSize: 26, letterSpacing: 4, color: C.inkSoft, marginBottom: 24 }}>
          // EL DIFERENCIADOR
        </div>
      </Rise>
      <Rise delay={6}>
        <div style={{ fontFamily: display, fontWeight: 900, fontSize: 110, lineHeight: 1.05 }}>Tu plata nunca</div>
      </Rise>
      <Rise delay={14}>
        <div style={{ fontFamily: displayItalic, fontWeight: 300, fontSize: 110, lineHeight: 1.05 }}>
          pasa por nosotros.
        </div>
      </Rise>
      <Rise delay={30}>
        <div style={{ fontFamily: sans, fontSize: 38, marginTop: 44, color: C.inkSoft, lineHeight: 1.4 }}>
          El pago va directo a la wallet del comerciante.
          <br />
          Si Tiendita desaparece mañana, él sigue cobrando.
        </div>
      </Rise>
    </div>
  </Bg>
);

export const OutroCard: React.FC = () => (
  <Bg dark>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
      <Rise delay={0}>
        <Img src={staticFile('tiendita-logo.png')} style={{ width: 130, height: 130, borderRadius: 65 }} />
      </Rise>
      <Rise delay={6}>
        <div style={{ fontFamily: display, fontWeight: 900, fontSize: 120, letterSpacing: -3 }}>TIENDITA</div>
      </Rise>
      <Rise delay={14}>
        <div
          style={{
            fontFamily: mono,
            fontSize: 40,
            background: C.bolt,
            color: C.ink,
            padding: '12px 28px',
            borderRadius: 10,
          }}
        >
          tienditawapu.vercel.app
        </div>
      </Rise>
      <Rise delay={24}>
        <div style={{ fontFamily: displayItalic, fontSize: 48, marginTop: 20, color: '#CFC8B4' }}>
          “Bitcoin gana cuando deja de ser noticia.”
        </div>
      </Rise>
      <Rise delay={36}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginTop: 30 }}>
          <span style={{ fontFamily: mono, fontSize: 22, letterSpacing: 3, color: '#CFC8B4' }}>
            HACKATHON COMMERCE · LA CRYPTA 2026
          </span>
          <div style={{ background: C.paper, borderRadius: 12, padding: '10px 18px', display: 'flex', gap: 24, alignItems: 'center' }}>
            <Img src={staticFile('lacrypta-logo.png')} style={{ height: 48 }} />
            <Img src={staticFile('wapu-logo.png')} style={{ height: 48 }} />
          </div>
        </div>
      </Rise>
    </div>
  </Bg>
);
