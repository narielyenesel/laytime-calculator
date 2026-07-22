# Laytime Ledger

Herramienta de cálculo de laytime para operaciones dry bulk. Sube Recap / CP / SOF / NOR
(PDF o imágenes), la IA extrae los datos, y **un motor de cálculo 100% determinístico**
(sin IA) aplica las reglas de laytime y produce un statement auditable, hora por hora.

## Cómo mantener esto actualizado (léelo antes de tocar nada en GitHub)

Editar código pegando texto en el editor web de GitHub es frágil — corta líneas, corrompe
llaves, y es fácil subir carpetas anidadas por error. La forma correcta es **GitHub Desktop**:
una app que sincroniza una carpeta de tu computador con GitHub directamente, sin copiar/pegar.

**Configuración única (una sola vez):**
1. Instala [GitHub Desktop](https://desktop.github.com/) (gratis)
2. Abre la app → inicia sesión con tu cuenta de GitHub
3. "File" → "Clone Repository" → elige tu repositorio `laytime-calculator` → elige una carpeta
   en tu computador donde quieres que viva (ej. `Documentos/laytime-calculator`)
4. Ya tienes una carpeta real en tu computador, sincronizada con GitHub

**Cada vez que haya un archivo nuevo para actualizar:**
1. Guarda el archivo nuevo directamente dentro de esa carpeta (reemplazando el que ya existe,
   mismo nombre y misma ubicación relativa — ej. `app/page.tsx` va dentro de la carpeta `app`)
2. Abre GitHub Desktop — vas a ver el archivo listado como cambiado
3. Escribe una descripción corta (ej. "actualizar extracción") en el campo de abajo a la izquierda
4. Clic en **"Commit to main"**
5. Clic en **"Push origin"** (arriba)
6. Vercel detecta el push y redespliega solo — espera a que diga "Ready"

Sin copiar/pegar, sin subcarpetas raras, sin adivinar dónde hacer clic en GitHub.com.

**Nota sobre esta versión:** este proyecto ya está estructurado con todos los archivos en la
raíz (no dentro de una subcarpeta). Si migras desde el repositorio anterior, verifica en
Vercel → Settings → General → **"Root Directory"** que quede **vacío** (no
`laytime-calculator/laytime-calculator`), ya que esta vez no hay subcarpeta extra.

## Cómo está dividido (y por qué)

- **`app/api/extract/route.ts`** — único punto donde se llama a la IA (Claude). Recibe
  los documentos, pide extracción estructurada, devuelve JSON. Nunca calcula nada.
- **`lib/laytimeEngine.ts`** — el cálculo real. Reglas fijas, sin IA, 100% reproducible.
  Cualquier resultado se puede auditar volviendo a este archivo.
- **`components/UploadZone.tsx`** — comprime imágenes y rasteriza/comprime PDFs
  automáticamente en el navegador antes de enviarlos (nadie tiene que comprimir nada a mano).
- **`app/page.tsx`** — el flujo: subir → revisar/corregir lo que extrajo la IA → calcular.
  Además agrupa documentos grandes en varios envíos automáticos si hace falta.

## Desplegar en Vercel (una sola vez)

1. Crea una cuenta en [vercel.com](https://vercel.com) (gratis para este uso).
2. Conecta el repositorio de GitHub que clonaste con GitHub Desktop.
3. En Vercel: "Add New Project" → importa ese repositorio → **deja "Root Directory" vacío**.
4. En "Environment Variables" agrega:
   - `ANTHROPIC_API_KEY` = tu API key de [console.anthropic.com](https://console.anthropic.com)
     (Settings → API Keys → Create Key). **Nunca la pongas en el código ni en el frontend.**
5. Deploy. Vercel te da una URL tipo `laytime-calculator.vercel.app` — esa es tu app.

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
- La extracción por IA es un punto de partida, no un hecho: siempre revisa las fechas,
  horas y cláusulas en el paso de revisión antes de calcular.
- Documentos muy largos (muchas páginas) se procesan en varios envíos automáticos a la
  IA; cada envío tarda entre 10 y 30 segundos, así que documentos grandes pueden demorar
  uno o dos minutos en total.

## Próximos pasos posibles

- Guardar casos (historial de buques/viajes) — hoy cada cálculo vive solo en la sesión.
- Plantilla de statement en PDF/Word descargable con el formato que uses para enviar
  a charterers.
- Reglas de exclusión de clima más finas si las necesitas con frecuencia.

Cualquiera de estos, dímelo y lo construimos sobre esta misma base.

