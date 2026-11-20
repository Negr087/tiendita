'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer } from 'lucide-react';

/**
 * QR de la tienda para pegar en el mostrador, la vidriera o las redes.
 * Se puede descargar como PNG o imprimir como cartel.
 */
export function ShopQR({ url, shopName }: { url: string; shopName: string }) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 1024,
      margin: 2,
      color: { dark: '#1A1A17', light: '#FFFFFF' },
    }).then(setQr);
  }, [url]);

  function handleDownload() {
    if (!qr) return;
    const a = document.createElement('a');
    a.href = qr;
    a.download = `qr-${shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    a.click();
  }

  function handlePrint() {
    if (!qr) return;
    const w = window.open('', '_blank', 'width=600,height=800');
    if (!w) return;
    const esc = (s: string) =>
      s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(shopName)}</title>
<style>
  body{font-family:system-ui,sans-serif;text-align:center;padding:48px 24px;color:#1A1A17}
  h1{font-size:40px;margin:0 0 8px}
  p{font-size:20px;margin:0 0 32px;color:#555}
  img{width:420px;max-width:100%;border:4px solid #1A1A17;padding:12px}
  .url{font-family:monospace;font-size:16px;margin-top:24px;word-break:break-all}
  .bolt{font-size:22px;margin-top:32px;font-weight:700}
</style></head><body>
  <h1>${esc(shopName)}</h1>
  <p>Escaneá y pagá con Bitcoin Lightning</p>
  <img src="${qr}" alt="QR" />
  <div class="url">${esc(url)}</div>
  <div class="bolt">⚡ aceptamos Lightning</div>
  <script>window.onload=()=>{window.print()}</script>
</body></html>`);
    w.document.close();
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="bg-white border-2 border-ink p-2 shadow-paper-sm flex-shrink-0">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt={`QR de ${shopName}`} className="w-32 h-32" />
        ) : (
          <div className="w-32 h-32 shimmer bg-paper-dark" />
        )}
      </div>
      <div className="space-y-3 text-center sm:text-left">
        <p className="text-sm text-ink-soft">
          Pegalo en el mostrador o la vidriera: tus clientes lo escanean y entran directo a tu tienda.
        </p>
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          <button onClick={handleDownload} disabled={!qr} className="btn-paper text-sm">
            <Download className="w-4 h-4" /> descargar PNG
          </button>
          <button onClick={handlePrint} disabled={!qr} className="btn-paper text-sm">
            <Printer className="w-4 h-4" /> imprimir cartel
          </button>
        </div>
      </div>
    </div>
  );
}
