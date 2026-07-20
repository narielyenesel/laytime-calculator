// components/TimeLedger.tsx
'use client';

import { LedgerEntry } from '@/lib/types';

interface Props {
  ledger: LedgerEntry[];
  allowedHours: number;
}

const COLORS: Record<string, string> = {
  counts: 'var(--chart-cyan)',
  excluded: 'var(--ink-700)',
  half: 'var(--amber)',
};

export default function TimeLedger({ ledger, allowedHours }: Props) {
  const totalElapsed = ledger.reduce((s, e) => s + e.durationHours, 0);
  if (totalElapsed === 0) return null;

  const allowedPct = Math.min(100, (allowedHours / totalElapsed) * 100);

  return (
    <div>
      <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 8 }}>
        Carta de tiempo — consumo vs. permitido
      </div>
      <div style={{ position: 'relative', height: 40, borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
        {ledger.map((e, i) => (
          <div
            key={i}
            title={`${e.description} · ${e.durationHours}h · ${e.reason}`}
            style={{
              width: `${(e.durationHours / totalElapsed) * 100}%`,
              background: COLORS[e.countingMode],
              minWidth: e.durationHours > 0 ? 1 : 0,
              borderRight: '1px solid rgba(11,30,45,0.35)',
            }}
          />
        ))}
        {allowedHours > 0 && allowedHours < totalElapsed && (
          <div
            style={{
              position: 'absolute',
              left: `${allowedPct}%`,
              top: 0,
              bottom: 0,
              width: 2,
              background: 'var(--paper)',
              boxShadow: '0 0 6px rgba(237,231,218,0.8)',
            }}
            title={`Laytime permitido: ${allowedHours}h`}
          />
        )}
      </div>
      <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 12 }}>
        <Legend color={COLORS.counts} label="Cuenta" />
        <Legend color={COLORS.excluded} label="Excluido" />
        <Legend color={COLORS.half} label="Media cuenta" />
        {allowedHours > 0 && allowedHours < totalElapsed && (
          <span style={{ opacity: 0.6 }}>│ línea blanca = laytime permitido ({allowedHours}h)</span>
        )}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.85 }}>
      <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: 'inline-block' }} />
      {label}
    </span>
  );
}
