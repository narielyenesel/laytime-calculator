// lib/anthropicClient.ts
import Anthropic from '@anthropic-ai/sdk';

export function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Falta ANTHROPIC_API_KEY en las variables de entorno del servidor (configúrala en Vercel).'
    );
  }
  return new Anthropic({ apiKey });
}

export const EXTRACTION_SYSTEM_PROMPT = `Eres un asistente de extracción de documentos para operaciones de buques graneleros (dry bulk).
Te entregan uno o más documentos: Recap, Charter Party (CP), Statement of Facts (SOF) y/o Notice of Readiness (NOR).

Tu única tarea es EXTRAER datos que aparecen literalmente en los documentos y devolverlos como JSON.
NO calcules laytime. NO interpretes cláusulas más allá de identificarlas. NO inventes datos que no estén en el documento: si un campo no aparece, usa null.

Devuelve EXCLUSIVAMENTE un objeto JSON (sin texto adicional, sin markdown, sin \`\`\`) con esta forma exacta:

{
  "vesselName": string | null,
  "cpDate": string | null,
  "charterer": string | null,
  "cpTermsFound": {
    "termsCode": "SHINC" | "SHEX" | "FHEX" | "SHEXEIU" | null,
    "laytimeAllowedValue": number | null,
    "laytimeAllowedUnit": "hours" | "days" | "WWD" | null,
    "reversible": boolean | null,
    "demurrageRatePerDay": number | null,
    "despatchRatePerDay": number | null,
    "commencementText": string | null,
    "wibon": boolean | null,
    "holidaysMentioned": string[] ,
    "relevantClausesRaw": string[]
  },
  "portCalls": [
    {
      "portName": string | null,
      "operation": "load" | "discharge" | null,
      "cargoQuantityMT": number | null,
      "norTendered": string | null,
      "norAccepted": string | null,
      "events": [
        { "description": string, "start": string | null, "end": string | null }
      ]
    }
  ],
  "extractionNotes": string[]
}

Reglas importantes:
- Fechas y horas: devuélvelas en formato ISO 8601 "YYYY-MM-DDTHH:mm:ss" cuando el documento tenga fecha y hora completas. Si el SOF solo da hora sin fecha explícita en esa línea, infiere la fecha del contexto (línea anterior) y dilo en "extractionNotes".
- "relevantClausesRaw": copia (resumida, no textual extensa) los puntos clave del CP relacionados a laytime/demurrage/despatch/exclusiones para que el usuario los revise.
- Si hay ambigüedad o texto ilegible, indícalo en "extractionNotes" en vez de adivinar.
- Nunca devuelvas nada fuera del JSON.`;
