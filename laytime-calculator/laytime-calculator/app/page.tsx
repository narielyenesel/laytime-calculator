// app/page.tsx
'use client';

import { useState } from 'react';
import UploadZone, { StagedFile } from '@/components/UploadZone';
import CPTermsPanel from '@/components/CPTermsPanel';
import EventsTable from '@/components/EventsTable';
import LaytimeStatement from '@/components/LaytimeStatement';
import { runLaytimeEngine } from '@/lib/laytimeEngine';
import { CPTerms, LaytimeCase, LaytimeResult, PortCall } from '@/lib/types';

type Step = 'upload' | 'extracting' | 'review' | 'result';

const DEFAULT_TERMS: CPTerms = {
  termsCode: 'SHEX',
  holidays: [],
  laytimeAllowedValue: 72,
  laytimeAllowedUnit: 'hours',
  reversible: true,
  commencementRule: { type: 'fixed_hours', hours: 6 },
  wibon: true,
  demurrageRatePerDay: 0,
  despatchRatePerDay: 0,
  despatchBasis: 'all_time_saved',
};

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function Page() {
  const [step, setStep] = useState<Step>('upload');
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [extractionNotes, setExtractionNotes] = useState<string[]>([]);
  const [caseData, setCaseData] = useState<LaytimeCase>({
    vesselName: '',
    cpDate: '',
    charterer: '',
    terms: DEFAULT_TERMS,
    portCalls: [],
  });
  const [result, setResult] = useState<LaytimeResult | null>(null);

  const runExtraction = async () => {
    setError(null);
    setStep('extracting');
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map((f) => ({ name: f.name, mediaType: f.mediaType, base64: f.base64 })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error en la extracción');

      const ex = data.extraction;
      const terms: CPTerms = {
        ...DEFAULT_TERMS,
        termsCode: ex.cpTermsFound?.termsCode ?? DEFAULT_TERMS.termsCode,
        laytimeAllowedValue: ex.cpTermsFound?.laytimeAllowedValue ?? DEFAULT_TERMS.laytimeAllowedValue,
        laytimeAllowedUnit: ex.cpTermsFound?.laytimeAllowedUnit ?? DEFAULT_TERMS.laytimeAllowedUnit,
        reversible: ex.cpTermsFound?.reversible ?? DEFAULT_TERMS.reversible,
        demurrageRatePerDay: ex.cpTermsFound?.demurrageRatePerDay ?? 0,
        despatchRatePerDay: ex.cpTermsFound?.despatchRatePerDay ?? 0,
        wibon: ex.cpTermsFound?.wibon ?? DEFAULT_TERMS.wibon,
        holidays: ex.cpTermsFound?.holidaysMentioned ?? [],
      };

      const portCalls: PortCall[] = (ex.portCalls ?? []).map((p: any) => ({
        id: genId(),
        portName: p.portName ?? 'Puerto sin nombre',
        operation: p.operation ?? 'load',
        cargoQuantityMT: p.cargoQuantityMT ?? 0,
        norTendered: p.norTendered ?? '',
        norAccepted: p.norAccepted ?? undefined,
        events: (p.events ?? []).map((e: any) => ({
          id: genId(),
          description: e.description ?? '',
          start: e.start ?? '',
          end: e.end ?? '',
        })),
      }));

      setCaseData({
        vesselName: ex.vesselName ?? '',
        cpDate: ex.cpDate ?? '',
        charterer: ex.charterer ?? '',
        terms,
        portCalls: portCalls.length > 0 ? portCalls : caseData.portCalls,
      });
      setExtractionNotes(ex.extractionNotes ?? []);
      setStep('review');
    } catch (e: any) {
      setError(e.message ?? 'Error desconocido');
      setStep('upload');
    }
  };

  const addPortManually = () => {
    setCaseData({
      ...caseData,
      portCalls: [
        ...caseData.portCalls,
        {
          id: genId(),
          portName: '',
          operation: 'load',
          cargoQuantityMT: 0,
          norTendered: '',
          events: [],
        },
      ],
    });
  };

  const calculate = () => {
    setError(null);
    try {
      const res = runLaytimeEngine(caseData);
      setResult(res);
      setStep('result');
    } catch (e: any) {
      setError(e.message ?? 'Error al calcular');
    }
  };

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '48px 24px 100px' }}>
      <header style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--chart-cyan)' }}>
          Laytime Ledger
        </div>
        <h1 style={{ fontSize: 30, margin: '6px 0 4px', fontWeight: 700 }}>
          Cálculo de laytime — dry bulk
        </h1>
        <p style={{ opacity: 0.6, fontSize: 14, maxWidth: 560 }}>
          Sube Recap, CP, SOF y NOR. La IA extrae los datos; el cálculo de laytime corre por
          reglas fijas y auditables, no por IA.
        </p>
      </header>

      {error && (
        <div
          style={{
            background: 'rgba(201,138,58,0.12)',
            border: '1px solid var(--amber)',
            color: 'var(--amber)',
            borderRadius: 4,
            padding: '12px 16px',
            marginBottom: 24,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {step === 'upload' && (
        <section>
          <UploadZone files={files} onFilesChange={setFiles} />
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button
              disabled={files.length === 0}
              onClick={runExtraction}
              style={{
                background: files.length === 0 ? 'var(--ink-700)' : 'var(--chart-cyan)',
                color: files.length === 0 ? 'rgba(237,231,218,0.4)' : 'var(--ink-900)',
                border: 'none',
                borderRadius: 4,
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Extraer datos con IA
            </button>
            <button
              onClick={() => setStep('review')}
              style={{
                background: 'none',
                border: '1px solid var(--ink-700)',
                color: 'var(--paper)',
                borderRadius: 4,
                padding: '10px 20px',
                fontSize: 14,
              }}
            >
              Ingresar datos manualmente
            </button>
          </div>
        </section>
      )}

      {step === 'extracting' && (
        <div style={{ textAlign: 'center', padding: '80px 0', opacity: 0.7 }}>
          Leyendo documentos y extrayendo fechas, eventos y cláusulas relevantes…
        </div>
      )}

      {step === 'review' && (
        <section>
          {extractionNotes.length > 0 && (
            <div
              style={{
                background: 'var(--ink-800)',
                borderRadius: 6,
                padding: 16,
                marginBottom: 24,
                fontSize: 13,
              }}
            >
              <div style={{ opacity: 0.6, marginBottom: 6, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em' }}>
                Notas de la extracción — revisar
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {extractionNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
            <LabeledInput label="Buque" value={caseData.vesselName} onChange={(v) => setCaseData({ ...caseData, vesselName: v })} />
            <LabeledInput label="Fecha CP" value={caseData.cpDate} onChange={(v) => setCaseData({ ...caseData, cpDate: v })} />
            <LabeledInput label="Fletador" value={caseData.charterer} onChange={(v) => setCaseData({ ...caseData, charterer: v })} />
          </div>

          <div style={{ fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 12 }}>
            Términos de charter party
          </div>
          <div style={{ marginBottom: 32 }}>
            <CPTermsPanel terms={caseData.terms} onChange={(terms) => setCaseData({ ...caseData, terms })} />
          </div>

          <div style={{ fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 12 }}>
            Puertos y eventos (Statement of Facts)
          </div>
          {caseData.portCalls.map((pc) => (
            <EventsTable
              key={pc.id}
              portCall={pc}
              onChange={(updated) =>
                setCaseData({
                  ...caseData,
                  portCalls: caseData.portCalls.map((p) => (p.id === pc.id ? updated : p)),
                })
              }
              onRemove={() =>
                setCaseData({ ...caseData, portCalls: caseData.portCalls.filter((p) => p.id !== pc.id) })
              }
            />
          ))}
          <button
            onClick={addPortManually}
            style={{
              background: 'none',
              border: '1px dashed var(--ink-700)',
              borderRadius: 4,
              color: 'var(--chart-cyan)',
              padding: '8px 16px',
              fontSize: 13,
              marginBottom: 32,
            }}
          >
            + Añadir puerto
          </button>

          <div>
            <button
              onClick={calculate}
              disabled={caseData.portCalls.length === 0}
              style={{
                background: caseData.portCalls.length === 0 ? 'var(--ink-700)' : 'var(--chart-cyan)',
                color: caseData.portCalls.length === 0 ? 'rgba(237,231,218,0.4)' : 'var(--ink-900)',
                border: 'none',
                borderRadius: 4,
                padding: '12px 24px',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Calcular laytime
            </button>
          </div>
        </section>
      )}

      {step === 'result' && result && (
        <section>
          <button
            onClick={() => setStep('review')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--chart-cyan)',
              fontSize: 13,
              marginBottom: 20,
              padding: 0,
            }}
          >
            ← Volver a editar datos
          </button>
          <LaytimeStatement laytimeCase={caseData} result={result} />
        </section>
      )}
    </main>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.6, display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: 'var(--ink-800)',
          border: '1px solid var(--ink-700)',
          borderRadius: 4,
          color: 'var(--paper)',
          padding: '8px 10px',
          fontSize: 13,
          width: '100%',
        }}
      />
    </div>
  );
}
