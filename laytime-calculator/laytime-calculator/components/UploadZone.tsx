// components/UploadZone.tsx
'use client';

import { useCallback, useRef, useState } from 'react';

export interface StagedFile {
  name: string;
  mediaType: string;
  base64: string;
  sizeKB: number;
}

interface Props {
  files: StagedFile[];
  onFilesChange: (files: StagedFile[]) => void;
}

const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

// Apunta al worker de pdf.js vía CDN (evita tener que empaquetar el worker nosotros).
const PDFJS_WORKER_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const MAX_IMAGE_DIMENSION = 1600; // px, suficiente para que la IA lea texto con claridad
const JPEG_QUALITY = 0.75;

function canvasToJpegBase64(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  return dataUrl.split(',')[1];
}

function drawImageScaled(img: HTMLImageElement | ImageBitmap, width: number, height: number) {
  let targetW = width;
  let targetH = height;
  if (targetW > MAX_IMAGE_DIMENSION || targetH > MAX_IMAGE_DIMENSION) {
    const scale = MAX_IMAGE_DIMENSION / Math.max(targetW, targetH);
    targetW = Math.round(targetW * scale);
    targetH = Math.round(targetH * scale);
  }
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img as any, 0, 0, targetW, targetH);
  return canvas;
}

/** Comprime una imagen (PNG/JPG/WEBP) redimensionándola y recodificando a JPEG liviano. */
async function compressImageFile(file: File): Promise<{ base64: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file);
  const canvas = drawImageScaled(bitmap, bitmap.width, bitmap.height);
  return { base64: canvasToJpegBase64(canvas), mediaType: 'image/jpeg' };
}

/** Rasteriza cada página de un PDF a una imagen JPEG liviana usando pdf.js en el navegador. */
async function rasterizePdf(file: File): Promise<Array<{ base64: string; mediaType: string; pageLabel: string }>> {
  const pdfjsLib: any = await import('pdfjs-dist');
  // @ts-ignore -- GlobalWorkerOptions existe en runtime aunque los tipos no siempre lo reflejen igual
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: Array<{ base64: string; mediaType: string; pageLabel: string }> = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, MAX_IMAGE_DIMENSION / Math.max(baseViewport.width, baseViewport.height));
    const viewport = page.getViewport({ scale: Math.max(scale, 1) });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    pages.push({
      base64: canvasToJpegBase64(canvas),
      mediaType: 'image/jpeg',
      pageLabel: pdf.numPages > 1 ? ` (pág. ${pageNum}/${pdf.numPages})` : '',
    });
  }
  return pages;
}

export default function UploadZone({ files, onFilesChange }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      setProcessingError(null);
      setProcessing(true);
      const staged: StagedFile[] = [...files];
      try {
        for (const file of Array.from(fileList)) {
          if (!ACCEPTED.includes(file.type)) continue;

          if (file.type === 'application/pdf') {
            const pages = await rasterizePdf(file);
            for (const p of pages) {
              staged.push({
                name: `${file.name}${p.pageLabel}`,
                mediaType: p.mediaType,
                base64: p.base64,
                sizeKB: Math.round((p.base64.length * 0.75) / 1024),
              });
            }
          } else {
            const compressed = await compressImageFile(file);
            staged.push({
              name: file.name,
              mediaType: compressed.mediaType,
              base64: compressed.base64,
              sizeKB: Math.round((compressed.base64.length * 0.75) / 1024),
            });
          }
        }
        onFilesChange(staged);
      } catch (err: any) {
        setProcessingError(
          'No se pudo procesar uno de los archivos (' + (err?.message ?? 'error desconocido') + '). Prueba con otro archivo o formato.'
        );
      } finally {
        setProcessing(false);
      }
    },
    [files, onFilesChange]
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragOver ? 'var(--chart-cyan)' : 'var(--ink-700)'}`,
          borderRadius: 4,
          padding: '48px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'rgba(79,168,184,0.06)' : 'transparent',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--chart-cyan)', marginBottom: 8 }}>
          Recap · CP · SOF · NOR
        </div>
        <div style={{ fontSize: 16, marginBottom: 4 }}>Arrastra los documentos aquí</div>
        <div style={{ fontSize: 13, opacity: 0.6 }}>
          PDF o imágenes (PNG, JPG) · se optimizan automáticamente al subirlos · o haz clic para elegir archivos
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {processing && (
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--chart-cyan)' }}>
          Optimizando documentos para el envío…
        </div>
      )}
      {processingError && (
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--amber)' }}>{processingError}</div>
      )}

      {files.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map((f, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: 'var(--ink-800)',
                borderRadius: 4,
                fontSize: 13,
              }}
            >
              <span className="mono">{f.name}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="mono" style={{ opacity: 0.5 }}>{f.sizeKB} KB</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilesChange(files.filter((_, idx) => idx !== i));
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--amber)',
                    fontSize: 13,
                  }}
                >
                  Quitar
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
