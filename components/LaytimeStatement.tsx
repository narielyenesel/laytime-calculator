// components/LaytimeStatement.tsx
'use client';

import { LaytimeCase, LaytimeResult } from '@/lib/types';
import TimeLedger from './TimeLedger';

interface Props {
  laytimeCase: LaytimeCase;
  result: LaytimeResult;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export default function LaytimeStatement({ laytimeCase, result }: Props) {
  const outcomeColor =
    result.outcome === 'demurrage' ? 'var(--amber)' : result.outcome === 'despatch' ? 'var(--moss)' : 'var(--chart-cyan)';
  const outcomeLabel =
    result.outcome === 'demurrage' ? 'DEMURRAGE A PAGAR' : result.outcome === 'despatch' ? 'DESPATCH A FAVOR' : 'EN HORA — SIN DIFERENCIA';

  const downloadCSV = () => {
    const header = 'Puerto,Evento,Inicio,Fin,Horas,Modo,Horas contadas,Motivo\n';
    const rows = result.ledger
      .map((e) => {
        const port = result.portResults.find((p) => p.portCallId === e.portCallId)?.portName ?? '';
        return [port, e.description, e.start, e.end, e.durationHours, e.countingMode, e.countedHours, e.reason]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',');
      })
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laytime_${laytimeCase.vesselName.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div
        style={{
          background: 'var(--paper)',
          color: 'var(--ink-900)',
          borderRadius: 6,
          padding: 32,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.55 }}>
              Laytime & Demurrage Statement
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{laytimeCase.vesselName}</div>
            <div style={{ fontSize: 13, opacity: 0.65 }}>
              CP {laytimeCase.cpDate} · {laytimeCase.charterer}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.55 }}>
              Resultado
            </div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: outcomeColor }}>
              {outcomeLabel}
            </div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700 }}>
              USD {fmt(result.amountUSD)}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            padding: '16px 0',
            borderTop: '1px solid var(--paper-dim)',
            borderBottom: '1px solid var(--paper-dim)',
            marginBottom: 20,
          }}
        >
          <Stat label="Laytime usado" value={`${fmt(result.totalLaytimeUsedHours)} h`} />
          <Stat label="Laytime permitido" value={`${fmt(result.totalLaytimeAllowedHours)} h`} />
          <Stat
            label="Diferencia"
            value={`${result.differenceHours >= 0 ? '+' : ''}${fmt(result.differenceHours)} h`}
          />
        </div>

        <TimeLedgerWrapper result={result} />

        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 10 }}>
            Resultado por puerto
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--paper-dim)' }}>
                <th style={{ padding: '6px 8px 6px 0' }}>Puerto</th>
                <th style={{ padding: '6px 8px' }}>Laytime inicia</th>
                <th style={{ padding: '6px 8px' }}>Horas contadas</th>
                <th style={{ padding: '6px 8px' }}>Horas permitidas</th>
              </tr>
            </thead>
            <tbody>
              {result.portResults.map((p) => (
                <tr key={p.portCallId} style={{ borderBottom: '1px solid var(--paper-dim)' }}>
                  <td style={{ padding: '8px 8px 8px 0' }}>{p.portName}</td>
                  <td className="mono" style={{ padding: 8 }}>{new Date(p.laytimeCommences).toLocaleString()}</td>
                  <td className="mono" style={{ padding: 8 }}>{fmt(p.totalCountedHours)}</td>
                  <td className="mono" style={{ padding: 8 }}>{fmt(p.laytimeAllowedHours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6 }}>
          Audit trail — cada hora, línea por línea
        </div>
        <button
          onClick={downloadCSV}
          style={{
            background: 'none',
            border: '1px solid var(--chart-cyan)',
            color: 'var(--chart-cyan)',
            borderRadius: 4,
            padding: '6px 14px',
            fontSize: 12,
          }}
        >
          Exportar CSV
        </button>
      </div>

      <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid var(--ink-700)', borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--ink-800)' }}>
            <tr style={{ textAlign: 'left', opacity: 0.6, textTransform: 'uppercase', fontSize: 10.5 }}>
              <th style={{ padding: 8 }}>Evento</th>
              <th style={{ padding: 8 }}>Inicio</th>
              <th style={{ padding: 8 }}>Fin</th>
              <th style={{ padding: 8 }}>Horas</th>
              <th style={{ padding: 8 }}>Modo</th>
              <th style={{ padding: 8 }}>Contadas</th>
              <th style={{ padding: 8 }}>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {result.ledger.map((e, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--ink-800)' }}>
                <td style={{ padding: 8 }}>{e.description}</td>
                <td className="mono" style={{ padding: 8 }}>{new Date(e.start).toLocaleString()}</td>
                <td className="mono" style={{ padding: 8 }}>{new Date(e.end).toLocaleString()}</td>
                <td className="mono" style={{ padding: 8 }}>{fmt(e.durationHours)}</td>
                <td style={{ padding: 8 }}>
                  <span
                    style={{
                      color:
                        e.countingMode === 'counts'
                          ? 'var(--chart-cyan)'
                          : e.countingMode === 'excluded'
                          ? 'inherit'
                          : 'var(--amber)',
                      opacity: e.countingMode === 'excluded' ? 0.5 : 1,
                    }}
                  >
                    {e.countingMode}
                  </span>
                </td>
                <td className="mono" style={{ padding: 8 }}>{fmt(e.countedHours)}</td>
                <td style={{ padding: 8, opacity: 0.7 }}>{e.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.55 }}>{label}</div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function TimeLedgerWrapper({ result }: { result: LaytimeResult }) {
  return (
    <div style={{ color: 'var(--ink-900)' }}>
      <style>{`
        .mono { color: inherit; }
      `}</style>
      <div
        style={{
          // reutiliza el mismo componente pero sobre fondo claro: forzamos variables locales
        }}
      >
        <div
          style={
            {
              '--paper': '#0b1e2d',
            } as React.CSSProperties
          }
        >
          <TimeLedger ledger={result.ledger} allowedHours={result.totalLaytimeAllowedHours} />
        </div>
      </div>
    </div>
  );
}
