// lib/laytimeEngine.ts
//
// MOTOR DE CÁLCULO DE LAYTIME -- 100% determinístico, sin IA.
// Recibe datos ya estructurados (extraídos y verificados por el usuario) y aplica
// reglas fijas de charter party. Cada hora que entra o sale del conteo queda
// registrada en el "ledger" para que el resultado sea auditable línea por línea.

import {
  CPTerms,
  CommencementRule,
  CountingMode,
  LaytimeCase,
  LaytimeResult,
  LedgerEntry,
  PortCall,
  PortResult,
  SOFEvent,
} from './types';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function toDate(iso: string): Date {
  const d = new Date(iso);
  if (isNaN(d.getTime())) throw new Error(`Fecha inválida: ${iso}`);
  return d;
}

function isoDateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function startOfNextDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(24, 0, 0, 0);
  return next;
}

function excludedWeekdaysForTerms(terms: CPTerms): Set<number> {
  switch (terms.termsCode) {
    case 'SHINC':
      return new Set(); // domingos y feriados incluidos: nada se excluye por defecto
    case 'SHEX':
    case 'SHEXEIU':
      return new Set([0]); // domingo
    case 'FHEX':
      return new Set([5]); // viernes
    case 'CUSTOM':
      return new Set(terms.customExcludedWeekdays ?? []);
    default:
      return new Set();
  }
}

function isHolidayExcluded(terms: CPTerms): boolean {
  return terms.termsCode !== 'SHINC'; // SHEX, FHEX, SHEXEIU, CUSTOM (con lista) excluyen feriados listados
}

/** Determina si una fecha (día calendario) está excluida del conteo por default de términos CP. */
function isDayExcludedByDefault(d: Date, terms: CPTerms): { excluded: boolean; reason: string } {
  const weekday = d.getDay();
  const excludedWeekdays = excludedWeekdaysForTerms(terms);
  if (excludedWeekdays.has(weekday)) {
    const names = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return { excluded: true, reason: `${names[weekday]} excluido por términos ${terms.termsCode}` };
  }
  if (isHolidayExcluded(terms) && terms.holidays.includes(isoDateOnly(d))) {
    return { excluded: true, reason: `Feriado local (${isoDateOnly(d)}) excluido por términos ${terms.termsCode}` };
  }
  return { excluded: false, reason: '' };
}

function parseHHMM(time: string, referenceDate: Date): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(referenceDate);
  d.setHours(h, m ?? 0, 0, 0);
  return d;
}

/** Calcula el inicio del conteo de laytime a partir del NOR y la regla de commencement del CP. */
function computeCommencement(norTendered: Date, terms: CPTerms): Date {
  const rule: CommencementRule = terms.commencementRule;
  let candidate: Date;

  if (rule.type === 'fixed_hours') {
    candidate = new Date(norTendered.getTime() + rule.hours * HOUR_MS);
  } else {
    const cutoff = parseHHMM(rule.morningCutoff, norTendered);
    if (norTendered.getTime() <= cutoff.getTime()) {
      candidate = parseHHMM(rule.afternoonStart, norTendered);
    } else {
      const nextDay = new Date(norTendered);
      nextDay.setDate(nextDay.getDate() + 1);
      candidate = parseHHMM(rule.nextDayStart, nextDay);
    }
  }

  // Si el punto de inicio cae en un día excluido (domingo/feriado por SHEX/FHEX),
  // se corre al siguiente periodo de trabajo válido.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { excluded } = isDayExcludedByDefault(candidate, terms);
    if (!excluded) break;
    const next = new Date(candidate);
    next.setDate(next.getDate() + 1);
    if (rule.type === 'next_working_period') {
      candidate = parseHHMM(rule.nextDayStart, next);
    } else {
      next.setHours(0, 0, 0, 0);
      candidate = next;
    }
  }
  return candidate;
}

/** Divide un intervalo [start,end) en segmentos que no cruzan medianoche. */
function splitByCalendarDay(start: Date, end: Date): Array<{ start: Date; end: Date }> {
  const segments: Array<{ start: Date; end: Date }> = [];
  let cursor = new Date(start);
  while (cursor < end) {
    const dayEnd = startOfNextDay(cursor);
    const segmentEnd = dayEnd < end ? dayEnd : end;
    segments.push({ start: new Date(cursor), end: new Date(segmentEnd) });
    cursor = segmentEnd;
  }
  return segments;
}

function hoursBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / HOUR_MS;
}

/**
 * Procesa un PortCall: recorta eventos al inicio real de laytime, parte por día
 * calendario, y clasifica cada segmento como counts / excluded / half.
 */
function processPortCall(
  portCall: PortCall,
  terms: CPTerms
): { entries: LedgerEntry[]; result: PortResult } {
  const norTendered = toDate(portCall.norAccepted ?? portCall.norTendered);
  const commences = computeCommencement(norTendered, terms);

  const entries: LedgerEntry[] = [];
  let totalElapsed = 0;
  let totalCounted = 0;

  const sortedEvents = [...portCall.events].sort(
    (a, b) => toDate(a.start).getTime() - toDate(b.start).getTime()
  );

  for (const event of sortedEvents) {
    let evStart = toDate(event.start);
    let evEnd = toDate(event.end);
    if (evEnd <= commences) continue; // evento termina antes de que empiece a correr el laytime
    if (evStart < commences) evStart = commences; // recorta la parte previa al inicio de laytime
    if (evEnd <= evStart) continue;

    for (const seg of splitByCalendarDay(evStart, evEnd)) {
      const durationHours = hoursBetween(seg.start, seg.end);
      totalElapsed += durationHours;

      let mode: CountingMode;
      let reason: string;

      if (event.countingModeOverride) {
        mode = event.countingModeOverride;
        reason = event.note ?? `Excepción manual: ${event.description}`;
      } else {
        const { excluded, reason: defReason } = isDayExcludedByDefault(seg.start, terms);
        mode = excluded ? 'excluded' : 'counts';
        reason = excluded ? defReason : 'Cuenta como laytime normal';
      }

      const countedHours = mode === 'counts' ? durationHours : mode === 'half' ? durationHours / 2 : 0;
      totalCounted += countedHours;

      entries.push({
        eventId: event.id,
        portCallId: portCall.id,
        description: event.description,
        start: seg.start.toISOString(),
        end: seg.end.toISOString(),
        durationHours: Math.round(durationHours * 100) / 100,
        countingMode: mode,
        countedHours: Math.round(countedHours * 100) / 100,
        reason,
      });
    }
  }

  const allowedHours =
    portCall.laytimeAllowedOverrideHours ??
    (terms.reversible ? 0 : allowedHoursForSinglePort(portCall, terms));

  return {
    entries,
    result: {
      portCallId: portCall.id,
      portName: portCall.portName,
      laytimeCommences: commences.toISOString(),
      totalElapsedHours: Math.round(totalElapsed * 100) / 100,
      totalCountedHours: Math.round(totalCounted * 100) / 100,
      laytimeAllowedHours: Math.round(allowedHours * 100) / 100,
    },
  };
}

function totalAllowedHours(terms: CPTerms): number {
  switch (terms.laytimeAllowedUnit) {
    case 'hours':
      return terms.laytimeAllowedValue;
    case 'days':
    case 'WWD': // simplificación: WWD tratado como días calendario completos (ver README, limitación conocida)
      return terms.laytimeAllowedValue * 24;
  }
}

function allowedHoursForSinglePort(portCall: PortCall, terms: CPTerms): number {
  if (!terms.prorateNonReversibleByCargo) return 0;
  return 0; // se calcula después con el total de carga de todos los puertos, ver runLaytimeEngine
}

export function runLaytimeEngine(laytimeCase: LaytimeCase): LaytimeResult {
  const { terms, portCalls } = laytimeCase;
  const totalAllowed = totalAllowedHours(terms);

  let ledger: LedgerEntry[] = [];
  const portResults: PortResult[] = [];

  // Si es non-reversible y se debe prorratear por carga, calculamos la porción de cada puerto.
  const totalCargo = portCalls.reduce((sum, p) => sum + p.cargoQuantityMT, 0);

  for (const portCall of portCalls) {
    const { entries, result } = processPortCall(portCall, terms);
    if (
      !terms.reversible &&
      !portCall.laytimeAllowedOverrideHours &&
      terms.prorateNonReversibleByCargo &&
      totalCargo > 0
    ) {
      result.laytimeAllowedHours =
        Math.round(((portCall.cargoQuantityMT / totalCargo) * totalAllowed) * 100) / 100;
    }
    ledger = ledger.concat(entries);
    portResults.push(result);
  }

  const totalLaytimeUsedHours =
    Math.round(portResults.reduce((sum, r) => sum + r.totalCountedHours, 0) * 100) / 100;

  const totalLaytimeAllowedHours = terms.reversible
    ? totalAllowed
    : Math.round(portResults.reduce((sum, r) => sum + r.laytimeAllowedHours, 0) * 100) / 100;

  const differenceHours =
    Math.round((totalLaytimeAllowedHours - totalLaytimeUsedHours) * 100) / 100;

  let outcome: LaytimeResult['outcome'] = 'on_time';
  let amountUSD = 0;

  if (differenceHours < 0) {
    outcome = 'demurrage';
    amountUSD = Math.round((Math.abs(differenceHours) / 24) * terms.demurrageRatePerDay * 100) / 100;
  } else if (differenceHours > 0) {
    outcome = 'despatch';
    // 'working_time_saved' es una simplificación adicional: en este motor se aplica igual
    // que 'all_time_saved' salvo que se documente una regla más específica del CP.
    amountUSD = Math.round((differenceHours / 24) * terms.despatchRatePerDay * 100) / 100;
  }

  return {
    ledger,
    portResults,
    totalLaytimeUsedHours,
    totalLaytimeAllowedHours,
    differenceHours,
    outcome,
    amountUSD,
  };
}
