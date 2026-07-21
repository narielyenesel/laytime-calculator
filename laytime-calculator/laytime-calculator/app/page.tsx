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

    const MAX_BATCH_BYTES = 3.2 * 1024 * 1024;
    const batches: StagedFile[][] = [];
    let current: StagedFile[] = [];
    let currentBytes = 0;
    for (const f of files) {
      const fBytes = f.base64.length * 0.75;
      if (current.length > 0 && currentBytes +
