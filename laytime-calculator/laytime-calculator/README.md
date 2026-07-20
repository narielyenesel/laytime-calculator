# Laytime Ledger

Herramienta de cálculo de laytime para operaciones dry bulk. Sube Recap / CP / SOF / NOR
(PDF o imágenes), la IA extrae los datos, y **un motor de cálculo 100% determinístico**
(sin IA) aplica las reglas de laytime y produce un statement auditable, hora por hora.

## Cómo está dividido (y por qué)

- **`app/api/extract/route.ts`** — único punto donde se llama a la IA (Claude). Recibe
  los documentos, pide extracción estructurada, devuelve JSON. Nunca calcula nada.
- **`lib/laytimeEngine.ts`** — el cálculo real. Reglas fijas, sin IA, 100% reproducible.
  Cualquier resultado se puede auditar volviendo a este archivo.
- **`app/page.tsx`** — el flujo: subir → revisar/corregir lo que extrajo la IA → calcular.
  El paso de revisión es clave: la IA puede leer mal una fecha, tú siempre confirmas
  antes de calcular.

## Desplegar en Vercel (una sola vez)

1. Crea una cuenta en [vercel.com](https://vercel.com) (gratis para este uso).
2. Sube esta carpeta a un repositorio de GitHub (puedes arrastrar los archivos desde
   github.com/new si no usas git desde terminal).
3. En Vercel: "Add New Project" → importa ese repositorio.
4. En "Environment Variables" agrega:
   - `ANTHROPIC_API_KEY` = tu API key de [console.anthropic.com](https://console.anthropic.com)
     (Settings → API Keys → Create Key). **Nunca la pongas en el código ni en el frontend.**
5. Deploy. Vercel te da una URL tipo `laytime-calculator.vercel.app` — esa es tu app.

Cada vez que quieras cambiar algo del código, súbelo al mismo repo y Vercel lo redespliega solo.

## Qué cubre el motor de cálculo (v1)

- SHINC, SHEX, FHEX, SHEX EIU, o exclusión de días personalizada.
- Feriados locales (lista manual por ahora).
- WIBON.
- Inicio de laytime: horas fijas tras el NOR, o regla "próximo periodo de trabajo"
  (ej. 1300/0800).
- Reversible (un total entre puertos) o non-reversible (laytime por puerto, con
  prorrateo opcional por cantidad de carga).
- Exclusiones manuales por evento (lluvia, avería, shifting, etc.) — se marcan en la
  tabla de eventos como "Forzar: excluido" o "Forzar: media cuenta".
- Demurrage y despatch con tasas independientes.

## Limitaciones conocidas (para que no haya sorpresas)

- **WWD (weather working days)** se trata como días calendario completos por ahora.
  Si necesitas que reste específicamente horas de mal tiempo dentro de un día que
  cuenta, hazlo marcando ese tramo como evento separado con "Forzar: excluido" o
  "media cuenta" en la revisión — el motor lo respeta, pero no lo infiere solo del SOF.
- La distinción fina entre **SHEX "unless used"** y **SHEX EIU** se maneja vía el
  override manual por evento (si hubo operaciones un domingo bajo SHEX simple, marca
  ese evento como "Forzar: cuenta"). El motor no infiere automáticamente si hubo
  actividad real ese día.
- El despatch se calcula sobre "todo el tiempo ahorrado" (`all_time_saved`) por defecto.
  El campo `despatchBasis: 'working_time_saved'` existe en el tipo para cuando lo
  necesites, pero aún no tiene una regla propia distinta en el motor — avísame y lo
  afinamos con un caso real.
- La extracción por IA es un punto de partida, no un hecho: siempre revisa las fechas,
  horas y cláusulas en el paso de revisión antes de calcular. Por diseño, no puedes
  saltarte ese paso.

## Ejemplo de verificación del motor

`examples/test-engine-example.ts` corre dos casos de prueba (uno simple, uno que cruza
un domingo bajo SHEX) para que veas exactamente cómo se comporta el motor. Se ejecuta
con `npx tsx examples/test-engine-example.ts` (no forma parte de la app en producción).

## Próximos pasos posibles

- Guardar casos (historial de buques/viajes) — hoy cada cálculo vive solo en la sesión.
- Plantilla de statement en PDF/Word descargable con el formato que uses para enviar
  a charterers.
- Reglas de exclusión de clima más finas si las necesitas con frecuencia.

Cualquiera de estos, dímelo y lo construimos sobre esta misma base.
