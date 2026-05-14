'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button onClick={handleCopy} className="btn-paper" aria-label="copiar">
      {copied ? (
        <>
          <Check className="w-4 h-4 text-ok" /> {label ? '¡copiado!' : ''}
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" /> {label ?? ''}
        </>
      )}
    </button>
  );
}
