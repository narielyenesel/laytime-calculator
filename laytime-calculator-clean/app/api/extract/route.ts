// app/api/extract/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, EXTRACTION_SYSTEM_PROMPT } from '@/lib/anthropicClient';
import type Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface IncomingFile {
  name: string;
  mediaType: string; // application/pdf, image/png, image/jpeg, etc.
  base64: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const files: IncomingFile[] = body.files;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'No se recibieron archivos.' }, { status: 400 });
    }

    const client = getAnthropicClient();

    const content: Anthropic.Messages.ContentBlockParam[] = [];
    for (const f of files) {
      if (f.mediaType === 'application/pdf') {
        content.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: f.base64 },
        });
      } else if (f.mediaType.startsWith('image/')) {
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: f.mediaType as any, data: f.base64 },
        });
      }
    }
    content.push({
      type: 'text',
      text: `Documentos adjuntos: ${files.map((f) => f.name).join(', ')}. Extrae los datos según las instrucciones.`,
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 16000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'La extracción no devolvió texto.' }, { status: 502 });
    }

    let cleaned = textBlock.text.trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return NextResponse.json(
        { error: 'No se pudo interpretar la respuesta de extracción como JSON.', raw: cleaned },
        { status: 502 }
      );
    }

    return NextResponse.json({ extraction: parsed });
  } catch (err: any) {
    console.error('Error en /api/extract:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Error desconocido en la extracción.' },
      { status: 500 }
    );
  }
}
