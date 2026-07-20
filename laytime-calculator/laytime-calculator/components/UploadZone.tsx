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

export default function UploadZone({ files, onFilesChange }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const staged: StagedFile[] = [...files];
      for (const file of Array.from(fileList)) {
        if (!ACCEPTED.includes(file.type)) continue;
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        staged.push({
          name: file.name,
          mediaType: file.type,
          base64,
          sizeKB: Math.round(file.size / 1024),
        });
      }
      onFilesChange(staged);
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
        <div style={{ fontSize: 13, opacity: 0.6 }}>PDF o imágenes (PNG, JPG) · o haz clic para elegir archivos</div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

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
