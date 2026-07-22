// components/EventsTable.tsx
'use client';

import { PortCall, SOFEvent, CountingMode } from '@/lib/types';

interface Props {
  portCall: PortCall;
  onChange: (portCall: PortCall) => void;
  onRemove: () => void;
}

const cellInput: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid var(--ink-700)',
  color: 'var(--paper)',
  padding: '6px 4px',
  fontSize: 13,
  width: '100%',
};

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function EventsTable({ portCall, onChange, onRemove }: Props) {
  const updateField = <K extends keyof PortCall>(key: K, value: PortCall[K]) =>
    onChange({ ...portCall, [key]: value });

  const updateEvent = (id: string, patch: Partial<SOFEvent>) =>
    onChange({
      ...portCall,
      events: portCall.events.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)),
    });

  const addEvent = () =>
    onChange({
      ...portCall,
      events: [
        ...portCall.events,
        { id: genId(), description: 'Nuevo evento', start: '', end: '' },
      ],
    });

  const removeEvent = (id: string) =>
    onChange({ ...portCall, events: portCall.events.filter((ev) => ev.id !== id) });

  return (
    <div style={{ border: '1px solid var(--ink-700)', borderRadius: 6, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <input
          style={{ ...cellInput, fontSize: 15, fontWeight: 600, maxWidth: 240 }}
          value={portCall.portName}
          onChange={(e) => updateField('portName', e.target.value)}
          placeholder="Nombre del puerto"
        />
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', color: 'var(--amber)', fontSize: 12 }}
        >
          Quitar puerto
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 11, opacity: 0.6 }}>Operación</label>
          <select
            style={cellInput}
            value={portCall.operation}
            onChange={(e) => updateField('operation', e.target.value as PortCall['operation'])}
          >
            <option value="load">Carga</option>
            <option value="discharge">Descarga</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, opacity: 0.6 }}>Cantidad (MT)</label>
          <input
            type="number"
            style={cellInput}
            value={portCall.cargoQuantityMT}
            onChange={(e) => updateField('cargoQuantityMT', Number(e.target.value))}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, opacity: 0.6 }}>NOR tendido</label>
          <input
            type="datetime-local"
            style={cellInput}
            value={portCall.norTendered?.slice(0, 16) ?? ''}
            onChange={(e) => updateField('norTendered', e.target.value)}
          />
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', opacity: 0.6, fontSize: 11, textTransform: 'uppercase' }}>
            <th style={{ paddingBottom: 6 }}>Evento</th>
            <th style={{ paddingBottom: 6 }}>Inicio</th>
            <th style={{ paddingBottom: 6 }}>Fin</th>
            <th style={{ paddingBottom: 6 }}>Conteo</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {portCall.events.map((ev) => (
            <tr key={ev.id}>
              <td style={{ paddingRight: 8 }}>
                <input
                  style={cellInput}
                  value={ev.description}
                  onChange={(e) => updateEvent(ev.id, { description: e.target.value })}
                />
              </td>
              <td style={{ paddingRight: 8 }}>
                <input
                  type="datetime-local"
                  style={cellInput}
                  value={ev.start?.slice(0, 16) ?? ''}
                  onChange={(e) => updateEvent(ev.id, { start: e.target.value })}
                />
              </td>
              <td style={{ paddingRight: 8 }}>
                <input
                  type="datetime-local"
                  style={cellInput}
                  value={ev.end?.slice(0, 16) ?? ''}
                  onChange={(e) => updateEvent(ev.id, { end: e.target.value })}
                />
              </td>
              <td style={{ paddingRight: 8 }}>
                <select
                  style={cellInput}
                  value={ev.countingModeOverride ?? 'auto'}
                  onChange={(e) =>
                    updateEvent(ev.id, {
                      countingModeOverride:
                        e.target.value === 'auto' ? undefined : (e.target.value as CountingMode),
                    })
                  }
                >
                  <option value="auto">Auto (según CP)</option>
                  <option value="counts">Forzar: cuenta</option>
                  <option value="excluded">Forzar: excluido</option>
                  <option value="half">Forzar: media cuenta</option>
                </select>
              </td>
              <td>
                <button
                  onClick={() => removeEvent(ev.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--amber)', fontSize: 12 }}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={addEvent}
        style={{
          marginTop: 12,
          background: 'none',
          border: '1px dashed var(--ink-700)',
          borderRadius: 4,
          color: 'var(--chart-cyan)',
          padding: '6px 12px',
          fontSize: 12,
        }}
      >
        + Añadir evento
      </button>
    </div>
  );
}
