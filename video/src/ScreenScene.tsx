/**
 * Escena estilo "Screen Studio": una captura real dentro de una ventana de
 * navegador, con zoom de cámara suave hacia el punto de interés, cursor
 * animado que hace click y un subtítulo abajo.
 */
import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { C, H, W, mono, sans } from './theme';

export type Box = { x: number; y: number; w: number; h: number };

export interface ScreenSceneProps {
  src: string;
  url: string;
  step?: string;
  caption: string;
  /** Punto (coords de la captura) y zoom al que va la cámara */
  focus?: { x: number; y: number; zoom: number };
  /** Elemento que el cursor va a clickear */
  click?: Box;
  /** Desde dónde arranca el cursor */
  cursorFrom?: { x: number; y: number };
  /** Zona a tapar (ej. la llave privada) */
  hide?: Box;
  hideLabel?: string;
  /** Captura más alta que 1080: scroll vertical de `from` a `to` px */
  scroll?: { from: number; to: number };
  imgHeight?: number;
  /** Parches sobre la captura (ej. un emoji que no se renderizó al capturar) */
  patches?: Array<Box & { content: string; bg: string; fontSize: number }>;
}

const BASE_SCALE = 0.8; // tamaño de la ventana respecto al frame
const BAR = 44; // alto de la barra del navegador

export const ScreenScene: React.FC<ScreenSceneProps> = ({
  src,
  url,
  step,
  caption,
  focus,
  click,
  cursorFrom,
  hide,
  hideLabel,
  scroll,
  imgHeight = H,
  patches = [],
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  // ── Cámara ──────────────────────────────────────────────────────────
  const zoomIn = spring({ frame: frame - 12, fps, config: { damping: 200, mass: 1.4 }, durationInFrames: 45 });
  const target = focus ?? { x: W / 2, y: H / 2, zoom: 1 };
  const fx = interpolate(zoomIn, [0, 1], [W / 2, target.x]);
  const fy = interpolate(zoomIn, [0, 1], [H / 2, target.y]);
  const z = interpolate(zoomIn, [0, 1], [1, target.zoom]);
  const intro = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 });

  // ── Scroll (capturas de página completa) ────────────────────────────
  const scrollY = scroll
    ? interpolate(frame, [10, durationInFrames - 15], [scroll.from, scroll.to], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.cubic),
      })
    : 0;

  // ── Cursor ──────────────────────────────────────────────────────────
  const clickAt = Math.round(durationInFrames * 0.66);
  const moveStart = Math.round(durationInFrames * 0.3);
  const start = cursorFrom ?? { x: W * 0.62, y: H * 0.78 };
  const end = click ? { x: click.x + click.w / 2, y: click.y + click.h / 2 } : start;
  const move = interpolate(frame, [moveStart, clickAt - 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.45, 0, 0.2, 1),
  });
  // leve curva en la trayectoria, como una mano real
  const cx = interpolate(move, [0, 1], [start.x, end.x]) + Math.sin(move * Math.PI) * -30;
  const cy = interpolate(move, [0, 1], [start.y, end.y]) + Math.sin(move * Math.PI) * -20;
  const press = interpolate(frame, [clickAt - 2, clickAt, clickAt + 5], [1, 0.82, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ripple = interpolate(frame, [clickAt, clickAt + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cursorOpacity = interpolate(frame, [moveStart - 10, moveStart], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const highlight = interpolate(frame, [clickAt - 14, clickAt - 4, clickAt + 20, clickAt + 30], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Subtítulo ───────────────────────────────────────────────────────
  const capIn = spring({ frame: frame - 6, fps, config: { damping: 200 }, durationInFrames: 18 });

  // Transformación de cámara: el punto (fx, fy) de la captura queda centrado
  const s = BASE_SCALE * z;
  const camera = `translate(${W / 2}px, ${H / 2 + 10}px) scale(${s}) translate(${-fx}px, ${-fy}px)`;

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 70% 0%, #FFE58A 0%, ${C.paperWarm} 45%, ${C.paperDark} 100%)` }}>
      {/* grilla sutil de fondo */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.ink}0A 1px, transparent 1px), linear-gradient(90deg, ${C.ink}0A 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <AbsoluteFill style={{ opacity: intro, transform: `translateY(${(1 - intro) * 30}px)` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: camera }}>
          {/* Ventana del navegador */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: -BAR,
              width: W,
              height: H + BAR,
              borderRadius: 20,
              border: `4px solid ${C.ink}`,
              boxShadow: `14px 14px 0 0 ${C.ink}, 0 40px 80px rgba(0,0,0,0.25)`,
              overflow: 'hidden',
              background: C.paper,
            }}
          >
            <div
              style={{
                height: BAR,
                background: C.paperDark,
                borderBottom: `3px solid ${C.ink}`,
                display: 'flex',
                alignItems: 'center',
                padding: '0 18px',
                gap: 10,
              }}
            >
              {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
                <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c, border: `2px solid ${C.ink}` }} />
              ))}
              <div
                style={{
                  marginLeft: 24,
                  flex: 1,
                  maxWidth: 900,
                  height: 28,
                  borderRadius: 14,
                  background: C.paper,
                  border: `2px solid ${C.ink}33`,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  fontFamily: mono,
                  fontSize: 16,
                  color: C.inkSoft,
                }}
              >
                🔒 {url}
              </div>
            </div>
            <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden' }}>
              <Img
                src={staticFile(`shots/${src}`)}
                style={{ position: 'absolute', left: 0, top: -scrollY, width: W, height: imgHeight }}
              />
              {patches.map((p, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: p.x,
                    top: p.y - scrollY,
                    width: p.w,
                    height: p.h,
                    background: p.bg,
                    fontSize: p.fontSize,
                    lineHeight: `${p.h}px`,
                    textAlign: 'center',
                  }}
                >
                  {p.content}
                </div>
              ))}
              {hide && (
                <div
                  style={{
                    position: 'absolute',
                    left: hide.x - 4,
                    top: hide.y - 4,
                    width: hide.w + 8,
                    height: hide.h + 8,
                    background: C.paperDark,
                    border: `2px dashed ${C.ink}66`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: mono,
                    fontSize: 18,
                    color: C.inkSoft,
                  }}
                >
                  {hideLabel ?? '•••• oculto ••••'}
                </div>
              )}
            </div>
          </div>

          {/* Resaltado del elemento a clickear */}
          {click && (
            <div
              style={{
                position: 'absolute',
                left: click.x - 8,
                top: click.y - 8,
                width: click.w + 16,
                height: click.h + 16,
                borderRadius: 10,
                border: `4px solid ${C.bolt}`,
                boxShadow: `0 0 0 6px ${C.ink}22`,
                opacity: highlight,
              }}
            />
          )}

          {/* Cursor */}
          {click && (
            <div style={{ position: 'absolute', left: cx, top: cy, opacity: cursorOpacity }}>
              <div
                style={{
                  position: 'absolute',
                  left: -40 * ripple,
                  top: -40 * ripple,
                  width: 80 * ripple,
                  height: 80 * ripple,
                  borderRadius: '50%',
                  border: `5px solid ${C.bolt}`,
                  opacity: 1 - ripple,
                }}
              />
              <svg
                width={44}
                height={44}
                viewBox="0 0 24 24"
                style={{ transform: `scale(${press})`, transformOrigin: '4px 3px', filter: 'drop-shadow(2px 4px 4px rgba(0,0,0,0.35))' }}
              >
                <path d="M4 3l15 7.5-6.5 1.8L9.5 19z" fill={C.ink} stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>
      </AbsoluteFill>

      {/* Subtítulo */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 56,
          display: 'flex',
          justifyContent: 'center',
          opacity: capIn,
          transform: `translateY(${(1 - capIn) * 40}px)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            background: C.ink,
            color: C.paper,
            padding: '20px 34px',
            borderRadius: 14,
            boxShadow: `8px 8px 0 0 ${C.bolt}`,
            maxWidth: 1500,
          }}
        >
          {step && (
            <span
              style={{
                fontFamily: mono,
                fontSize: 22,
                fontWeight: 700,
                background: C.bolt,
                color: C.ink,
                padding: '6px 12px',
                borderRadius: 6,
                whiteSpace: 'nowrap',
              }}
            >
              {step}
            </span>
          )}
          <span style={{ fontFamily: sans, fontSize: 38, fontWeight: 500, lineHeight: 1.25 }}>{caption}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
