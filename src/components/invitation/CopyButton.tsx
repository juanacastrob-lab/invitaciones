'use client';

import { useState } from 'react';

/** Copiar una CLABE a mano, en un celular, es justo donde la gente se rinde. */
export function CopyButton({
  value,
  label,
  copiedLabel,
}: {
  value: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles el número sigue visible para copiarlo a mano.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-full border border-[var(--line)] px-3 py-1 text-xs uppercase tracking-widest text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
