// lib/types.ts
// Modelo de datos del dominio laytime. Todo lo que entra aquí ya fue
// extraído/verificado por el usuario -- el motor de cálculo (laytimeEngine.ts)
// NO usa IA, solo aplica estas reglas de forma determinística.

export type LaytimeTermCode = 'SHINC' | 'SHEX' | 'FHEX' | 'SHEXEIU' | 'CUSTOM';

/** Cómo cuenta cada intervalo de tiempo dentro del laytime. */
export type CountingMode = 'counts' | 'excluded' | 'half';

/**
 * Regla de inicio de laytime tras el tendering del NOR.
 * - 'fixed_hours': el laytime empieza N horas después del NOR (turn time clásico), tope al inicio de un working period si corresponde.
 * - 'next_working_period': usa la regla horaria tipo 1300/0800 (si NOR se tender antes de las 12:00, cuenta desde las 13:00; si es después, cuenta desde las 08:00 del día siguiente).
 */
export type CommencementRule =
  | { type: 'fixed_hours'; hours: number }
  | { type: 'next_working_period'; morningCutoff: string; afternoonStart: string; nextDayStart: string };

export interface CPTerms {
  /** Código de términos base (define exclusión de domingos/feriados por defecto). */
  termsCode: LaytimeTermCode;
  /** Si termsCode = CUSTOM, el usuario define aquí manualmente qué días de la semana se excluyen (0=domingo..6=sábado). */
  customExcludedWeekdays?: number[];
  /** Feriados locales del puerto (fechas ISO yyyy-mm-dd) a excluir si aplica FHEX/SHEX. */
  holidays: string[];
  /** Laytime total permitido. */
  laytimeAllowedValue: number;
  laytimeAllowedUnit: 'hours' | 'days' | 'WWD';
  /** Reversible = el laytime se suma entre todos los puertos/cargas contra un único total permitido.
   *  Non-reversible = cada puerto tiene su propio laytime permitido (prorrateado o fijo por CP). */
  reversible: boolean;
  /** Si non-reversible y el CP no fija horas por puerto explícitamente, prorratear el total según cantidad de carga. */
  prorateNonReversibleByCargo?: boolean;
  /** Regla de inicio de conteo tras el NOR. */
  commencementRule: CommencementRule;
  /** WIBON: Whether In Berth Or Not -- el NOR es válido aunque el buque no esté atracado. */
  wibon: boolean;
  /** Tasa de demurrage, USD/día. */
  demurrageRatePerDay: number;
  /** Tasa de despatch, USD/día (habitualmente la mitad de demurrage). */
  despatchRatePerDay: number;
  /** 'all_time_saved' = despatch sobre todo el tiempo ahorrado; 'working_time_saved' = solo sobre working days ahorrados. */
  despatchBasis: 'all_time_saved' | 'working_time_saved';
}

/** Un evento tal como aparece en el Statement of Facts. */
export interface SOFEvent {
  id: string;
  description: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  /** Cómo cuenta este intervalo. Si no se especifica, el motor lo infiere de las reglas CP (fin de semana/feriado/etc). */
  countingModeOverride?: CountingMode;
  /** Motivo de la exclusión/half, para el audit trail (ej. "Rain - weather working day exception"). */
  note?: string;
}

export interface PortCall {
  id: string;
  portName: string;
  /** 'load' | 'discharge' */
  operation: 'load' | 'discharge';
  cargoQuantityMT: number;
  norTendered: string; // ISO datetime
  norAccepted?: string; // si difiere del tendering (ej. NOR rechazado y re-tendido)
  events: SOFEvent[];
  /** Horas de laytime permitidas específicas de este puerto (si el CP las fija puerto por puerto). */
  laytimeAllowedOverrideHours?: number;
}

export interface LaytimeCase {
  vesselName: string;
  cpDate: string;
  charterer: string;
  terms: CPTerms;
  portCalls: PortCall[];
}

/** Resultado de aplicar las reglas a un intervalo -- una fila del audit trail. */
export interface LedgerEntry {
  eventId: string;
  portCallId: string;
  description: string;
  start: string;
  end: string;
  durationHours: number;
  countingMode: CountingMode;
  countedHours: number;
  reason: string;
}

export interface PortResult {
  portCallId: string;
  portName: string;
  laytimeCommences: string;
  totalElapsedHours: number;
  totalCountedHours: number;
  laytimeAllowedHours: number;
}

export interface LaytimeResult {
  ledger: LedgerEntry[];
  portResults: PortResult[];
  totalLaytimeUsedHours: number;
  totalLaytimeAllowedHours: number;
  differenceHours: number; // positivo = despatch (sobró tiempo), negativo = demurrage
  outcome: 'demurrage' | 'despatch' | 'on_time';
  amountUSD: number;
}
