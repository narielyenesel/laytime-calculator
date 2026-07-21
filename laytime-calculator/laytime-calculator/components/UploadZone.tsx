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
  canvas.height
