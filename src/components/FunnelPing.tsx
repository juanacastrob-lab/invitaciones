'use client';

import { useEffect } from 'react';
import { track } from '@/lib/funnel-client';
import type { FunnelStep } from '@/lib/funnel';

/** Registra un paso al montar (portada, gracias). No pinta nada. */
export function FunnelPing({ step, meta, region }: { step: FunnelStep; meta?: Record<string, unknown>; region?: string }) {
  useEffect(() => { track(step, { meta, region }); }, [step, meta, region]);
  return null;
}
