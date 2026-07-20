import { runLaytimeEngine } from './lib/laytimeEngine';
import { LaytimeCase } from './lib/types';

// Caso: NOR martes 08:00, laytime empieza 6h después (14:00 martes).
// Carga desde 14:00 martes hasta 14:00 jueves (48h elapsed).
// Términos SHEX: domingo excluido (no aplica aquí, no hay domingo en el rango).
// Laytime permitido: 40 horas. Se espera: usado 48h, allowed 40h -> demurrage de 8h.
const testCase: LaytimeCase = {
  vesselName: 'MV Test',
  cpDate: '2026-01-01',
  charterer: 'Test Charterer',
  terms: {
    termsCode: 'SHEX',
    holidays: [],
    laytimeAllowedValue: 40,
    laytimeAllowedUnit: 'hours',
    reversible: true,
    commencementRule: { type: 'fixed_hours', hours: 6 },
    wibon: true,
    demurrageRatePerDay: 12000,
    despatchRatePerDay: 6000,
    despatchBasis: 'all_time_saved',
  },
  portCalls: [
    {
      id: 'p1',
      portName: 'Puerto Test',
      operation: 'load',
      cargoQuantityMT: 50000,
      norTendered: '2026-01-06T08:00:00', // martes
      events: [
        {
          id: 'e1',
          description: 'Loading in progress',
          start: '2026-01-06T08:00:00',
          end: '2026-01-08T08:00:00', // jueves 08:00 -> con commence 14:00 martes, elapsed = 42h
        },
      ],
    },
  ],
};

const result = runLaytimeEngine(testCase);
console.log(JSON.stringify(result, null, 2));
console.log('---RESUMEN---');
console.log('Usado:', result.totalLaytimeUsedHours, 'h');
console.log('Permitido:', result.totalLaytimeAllowedHours, 'h');
console.log('Resultado:', result.outcome, result.amountUSD, 'USD');

// Test 2: incluye un domingo dentro del rango para verificar exclusión SHEX
const testCase2: LaytimeCase = {
  ...testCase,
  portCalls: [
    {
      id: 'p2',
      portName: 'Puerto Test 2',
      operation: 'load',
      cargoQuantityMT: 50000,
      norTendered: '2026-01-08T08:00:00', // jueves
      events: [
        {
          id: 'e2',
          description: 'Loading in progress',
          start: '2026-01-08T08:00:00',
          end: '2026-01-12T08:00:00', // lunes 08:00, cruza domingo 11 enero
        },
      ],
    },
  ],
};
const result2 = runLaytimeEngine(testCase2);
console.log('\n--- TEST 2 (cruza domingo) ---');
result2.ledger.forEach((l) =>
  console.log(l.start, '->', l.end, l.countingMode, l.countedHours + 'h', l.reason)
);
console.log('Usado:', result2.totalLaytimeUsedHours, 'h (esperado: elapsed - 24h domingo)');
