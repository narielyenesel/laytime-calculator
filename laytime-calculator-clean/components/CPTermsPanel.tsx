// components/CPTermsPanel.tsx
'use client';

import { CPTerms } from '@/lib/types';

interface Props {
  terms: CPTerms;
  onChange: (terms: CPTerms) => void;
}

const fieldStyle: React.CSSProperties = {
  background: 'var(--ink-900)',
  border: '1px solid var(--ink-700)',
  borderRadius: 4,
  color: 'var(--paper)',
  padding: '8px 10px',
  fontSize: 13,
  width: '100%',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  opacity: 0.6,
  marginBottom: 4,
  display: 'block',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export default function CPTermsPanel({ terms, onChange }: Props) {
  const set = <K extends keyof CPTerms>(key: K, value: CPTerms[K]) =>
    onChange({ ...terms, [key]: value });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
      <Field label="Términos">
        <select
          style={fieldStyle}
          value={terms.termsCode}
          onChange={(e) => set('termsCode', e.target.value as CPTerms['termsCode'])}
        >
          <option value="SHINC">SHINC (domingos/feriados incluidos)</option>
          <option value="SHEX">SHEX (domingos/feriados excluidos)</option>
          <option value="FHEX">FHEX (viernes/feriados excluidos)</option>
          <option value="SHEXEIU">SHEX EIU (excluidos aun si se usan)</option>
          <option value="CUSTOM">Personalizado</option>
        </select>
      </Field>

      <Field label="Laytime permitido">
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            style={fieldStyle}
            value={terms.laytimeAllowedValue}
            onChange={(e) => set('laytimeAllowedValue', Number(e.target.value))}
          />
          <select
            style={{ ...fieldStyle, width: 100 }}
            value={terms.laytimeAllowedUnit}
            onChange={(e) => set('laytimeAllowedUnit', e.target.value as CPTerms['laytimeAllowedUnit'])}
          >
            <option value="hours">horas</option>
            <option value="days">días</option>
            <option value="WWD">WWD</option>
          </select>
        </div>
      </Field>

      <Field label="Reversible">
        <select
          style={fieldStyle}
          value={terms.reversible ? 'yes' : 'no'}
          onChange={(e) => set('reversible', e.target.value === 'yes')}
        >
          <option value="yes">Sí — un solo total entre puertos</option>
          <option value="no">No — laytime separado por puerto</option>
        </select>
      </Field>

      <Field label="Demurrage (USD/día)">
        <input
          type="number"
          style={fieldStyle}
          value={terms.demurrageRatePerDay}
          onChange={(e) => set('demurrageRatePerDay', Number(e.target.value))}
        />
      </Field>

      <Field label="Despatch (USD/día)">
        <input
          type="number"
          style={fieldStyle}
          value={terms.despatchRatePerDay}
          onChange={(e) => set('despatchRatePerDay', Number(e.target.value))}
        />
      </Field>

      <Field label="WIBON">
        <select
          style={fieldStyle}
          value={terms.wibon ? 'yes' : 'no'}
          onChange={(e) => set('wibon', e.target.value === 'yes')}
        >
          <option value="yes">Sí</option>
          <option value="no">No</option>
        </select>
      </Field>

      <Field label="Regla de inicio de laytime">
        <select
          style={fieldStyle}
          value={terms.commencementRule.type}
          onChange={(e) => {
            if (e.target.value === 'fixed_hours') {
              set('commencementRule', { type: 'fixed_hours', hours: 6 });
            } else {
              set('commencementRule', {
                type: 'next_working_period',
                morningCutoff: '12:00',
                afternoonStart: '13:00',
                nextDayStart: '08:00',
              });
            }
          }}
        >
          <option value="fixed_hours">Horas fijas tras NOR</option>
          <option value="next_working_period">Próximo periodo de trabajo (1300/0800)</option>
        </select>
      </Field>

      {terms.commencementRule.type === 'fixed_hours' ? (
        <Field label="Horas tras NOR">
          <input
            type="number"
            style={fieldStyle}
            value={terms.commencementRule.hours}
            onChange={(e) =>
              set('commencementRule', { type: 'fixed_hours', hours: Number(e.target.value) })
            }
          />
        </Field>
      ) : (
        <>
          <Field label="Corte mañana / inicio tarde">
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="time"
                style={fieldStyle}
                value={terms.commencementRule.morningCutoff}
                onChange={(e) =>
                  set('commencementRule', {
                    ...terms.commencementRule,
                    type: 'next_working_period',
                    morningCutoff: e.target.value,
                  } as CPTerms['commencementRule'])
                }
              />
              <input
                type="time"
                style={fieldStyle}
                value={terms.commencementRule.afternoonStart}
                onChange={(e) =>
                  set('commencementRule', {
                    ...terms.commencementRule,
                    type: 'next_working_period',
                    afternoonStart: e.target.value,
                  } as CPTerms['commencementRule'])
                }
              />
            </div>
          </Field>
          <Field label="Inicio día siguiente">
            <input
              type="time"
              style={fieldStyle}
              value={terms.commencementRule.nextDayStart}
              onChange={(e) =>
                set('commencementRule', {
                  ...terms.commencementRule,
                  type: 'next_working_period',
                  nextDayStart: e.target.value,
                } as CPTerms['commencementRule'])
              }
            />
          </Field>
        </>
      )}

      <Field label="Feriados locales (separados por coma, YYYY-MM-DD)">
        <input
          type="text"
          style={fieldStyle}
          value={terms.holidays.join(', ')}
          onChange={(e) =>
            set(
              'holidays',
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
        />
      </Field>
    </div>
  );
}
