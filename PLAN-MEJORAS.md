# PLAN DE MEJORAS — Odonto Reminder Aruba

> Arquitecto: AI Senior · Fecha: 2026-06-10
> Stack: Next.js 16 + React 19 + Tailwind v4 + Shadcn/ui + MongoDB (Mongoose 9)

---

## 📋 ÍNDICE

1. [Combobox Inteligente — Búsqueda/Creación de Pacientes](#1-combobox-inteligente)
2. [Panel de Detalle del Paciente (Sheet lateral)](#2-panel-de-detalle-del-paciente)
3. [Vista de Calendario Interactiva (Tabs)](#3-vista-de-calendario)
4. [Refinamiento Estético Premium](#4-refinamiento-estético)
5. [Nuevos Campos MongoDB (sin romper esquemas)](#5-nuevos-campos-en-base-de-datos)
6. [Hoja de Ruta — Nuevas Features](#6-hoja-de-ruta)
7. [Evaluación de Aspectos Mejorables](#7-evaluación)

---

## 1. COMBOBOX INTELIGENTE

### Problema actual
El input `patientName` es un campo de texto libre. Cada registro crea un `Patient` nuevo aunque el nombre ya exista, generando duplicados.

### Solución propuesta
Sustituir el `<Input>` por un **Combobox** (Command + Popover de Shadcn) con dos modos:

| Modo | Comportamiento |
|---|---|
| **Búsqueda** | Al escribir ≥2 caracteres, muestra pacientes existentes (name + phone + última visita) |
| **Selección** | Al seleccionar un paciente existente, auto-rellena nombre, teléfono e idioma |
| **Creación** | Si no hay match, el texto escrito se usa como nombre del nuevo paciente |

### Componentes recomendados

```
@radix-ui/react-popover  (ya en Shadcn)
cmdk                      (Command de Shadcn)
```

### Flujo UX

```
1. Usuario escribe "Mar" en el input de nombre
2. ↓ Aparece dropdown con:
   ┌─────────────────────────────────────┐
   │ 🔍 "María García"  — +297 588 1234  │
   │    Última visita: 12 may 2026       │
   ├─────────────────────────────────────┤
   │ 🔍 "Marta López"  — +297 588 5678   │
   │    Última visita: 3 jun 2026        │
   ├─────────────────────────────────────┤
   │ ➕ Crear "Mar..." como nuevo        │
   └─────────────────────────────────────┘
3. Si selecciona uno existente → se rellena todo + se crea Visit vinculada
4. Si elige "Crear nuevo" → continúa como ahora pero con validación anti-duplicados
```

### Lógica de componentes (PatientForm.jsx)

```jsx
// En lugar de:
<Input placeholder="Nombre completo" value={form.patientName} ... />

// Usar:
<CommandCombobox
  placeholder="Buscar paciente existente o escribir nombre nuevo..."
  onSelect={(patient) => {
    setForm({
      ...form,
      patientName: patient.name,
      countryCode: extractCode(patient.phone),
      localPhone: extractLocal(patient.phone),
      language: patient.language,
      existingPatientId: patient._id,  // ← NUEVO campo en form
    });
  }}
  onCreate={(text) => {
    setForm({ ...form, patientName: text, existingPatientId: null });
  }}
  fetchItems={async (query) => {
    const res = await fetch(`/api/patients/search?q=${query}`);
    return res.json();  // Solo name + phone + language + lastVisitDate
  }}
/>
```

### Backend — Nuevo endpoint `/api/patients/search`

```javascript
// app/api/patients/search/route.js
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  
  const patients = await Patient.find({
    $or: [
      { name: { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } },
    ],
  })
    .select("name phone language lastVisitDate")
    .limit(8)
    .lean();

  return Response.json({ items: patients });
}
```

### Validación anti-duplicados (server-side en POST /api/patients)

```javascript
// En la creación: si no se envió existingPatientId
const existing = await Patient.findOne({
  phone: payload.patientPhone,
  name: { $regex: `^${escapeRegex(payload.patientName)}$`, $options: "i" },
});
if (existing) {
  // En lugar de rechazar, vincular automáticamente
  payload.patientId = existing._id;
}
```

---

## 2. PANEL DE DETALLE DEL PACIENTE (SHEET)

### Problema actual
Hacer clic en el nombre del paciente navega a `/patients/[id]` (página completa). Esto rompe el contexto del dashboard y es lento.

### Solución propuesta
**Sheet lateral** (drawer) que se abre desde la derecha con:

```
┌──────────────────────┐
│  DASHBOARD           │
│                      │  ┌──────────────────────────┐
│  ┌──────┐ ┌──────┐   │  │  ✕  Detalle del Paciente │
│  │Stats │ │Stats │   │  │                          │
│  └──────┘ └──────┘   │  │  ┌────────────────────┐  │
│                      │  │  │  Avatar + Nombre    │  │
│  ┌──────────────┐    │  │  │  Teléfono · Idioma   │  │
│  │   TABLA      │    │  │  └────────────────────┘  │
│  │              │    │  │                          │
│  │ [Nombre] →───┼────┼──┼─►                        │
│  │              │    │  │  ┌─── TABS ───────────┐  │
│  └──────────────┘    │  │  │ 📅 Citas  📋 Notas  │  │
│                      │  │  │ 💰 Estado de Cuenta │  │
│                      │  │  └────────────────────┘  │
│                      │  │                          │
│                      │  │  Contenido activo según  │
│                      │  │  tab seleccionada        │
│                      │  │                          │
│                      │  └──────────────────────────┘
└──────────────────────┘
```

### Componentes Shadcn necesarios

```
- Sheet (ya disponible en Shadcn)
- Tabs (para switchear entre Citas / Notas / Estado de Cuenta)
- ScrollArea (para contenido largo)
- Separator
```

### Datos que debe cargar

```javascript
// GET /api/patients/[id]/detail  ← NUEVO endpoint
// Respuesta:
{
  patient: { name, phone, language, email, notes, tags, totalVisits, lastVisitDate },
  visits: [ /* últimas 20 visits con fecha, tratamiento, estado, costo */ ],
  accountSummary: {
    totalCharged: number,
    totalPaid: number,
    pending: number,
  },
  clinicalNotes: [ /* próximamente */ ],
}
```

### Estructura del componente

```jsx
// components/patient/PatientSheet.jsx
"use client";
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

// Tabs internos:
// 1. 📅 Historial de Citas → lista de visits con fecha, tratamiento, badge
// 2. 📋 Notas Clínicas → textarea editable (WYSIWYG simple o markdown)
// 3. 💰 Estado de Cuenta → desglose: cobrado vs pagado vs pendiente

export default function PatientSheet({ patientId, trigger }) {
  // Fetch data on open
  // Cache con TanStack Query
}
```

### Navegación híbrida
- Click en nombre desde tabla → abre Sheet
- Botón "Ver perfil completo" dentro del Sheet → navega a `/patients/[id]`
- Esto preserva el contexto pero permite profundizar cuando se necesita

### Esquema de Notas Clínicas (nueva colección opcional)

```javascript
// models/ClinicalNote.js (OPCIONAL — se puede guardar en Patient.notes por ahora)
{
  patientId: { type: ObjectId, ref: "Patient" },
  content: { type: String },
  createdBy: { type: String },  // username del doctor
  visitId: { type: ObjectId, ref: "Visit" },  // opcional, asociado a una visita
  tipo: { type: String, enum: ["evolucion", "diagnostico", "procedimiento", "receta", "general"] },
  timestamps: true,
}
```

---

## 3. VISTA DE CALENDARIO

### Problema actual
Solo vista de tabla. No hay forma de visualizar la ocupación por día/sillón.

### Solución propuesta
**Tabs** para switchear entre `📋 Tabla` y `📅 Calendario`. El calendario debe ser tipo **cronograma de sillones** (timeline horizontal).

### Layout

```
┌──────────────────────────────────────────────┐
│  [📋 Tabla]  [📅 Calendario]                  │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │  ←   │ │ HOY  │ │   →  │ │Semana│        │
│  └──────┘ └──────┘ └──────┘ └──────┘        │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  Sillón 1  │  9:00  │ 10:00 │ 11:00  │  │
│  │            │ [María]│ [Juan]│        │  │
│  ├────────────────────────────────────────┤  │
│  │  Sillón 2  │  9:00  │ 10:00 │ 11:00  │  │
│  │            │        │ [Ana] │ [Luis] │  │
│  ├────────────────────────────────────────┤  │
│  │  Sillón 3  │  9:00  │ 10:00 │ 11:00  │  │
│  │            │ [Pedro]│       │        │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### Componentes Shadcn necesarios

```
- Tabs (switcher vista)
- Command + Popover (date picker)
```

### Estrategia de implementación (2 fases)

**Fase 1 — Calendario semanal simple** (1-2 días)
- Grid CSS puro (sin librería externa)
- Horas en eje Y, días en eje X
- Cada visita = celda coloreada con nombre del paciente
- Drag para cambiar hora (opcional en Fase 1)

**Fase 2 — Cronograma de sillones** (3-4 días)
- Eje Y = sillones (obtenidos de un nuevo campo `dentalChair` en Visit)
- Eje X = horas del día (8:00 - 18:00)
- Colores por tipo de tratamiento
- Click en celda vacía → abre formulario rápido
- Click en celda ocupada → editar/mover

### Nuevo modelo Schedule (opcional)

```javascript
// models/ChairSchedule.js (SOLO si se necesita persistencia separada)
{
  date: { type: Date, required: true },
  chairNumber: { type: Number, required: true, min: 1, max: 6 },
  visitId: { type: ObjectId, ref: "Visit" },
  startTime: { type: String },  // "09:00"
  endTime: { type: String },    // "10:00"
}
```

O más simple: añadir campos a Visit:
```javascript
// En Visit.js (extensión segura)
dentalChair: { type: Number, min: 1, max: 10, default: 1 },
appointmentStartTime: { type: String },  // "09:00"
```

### Backend — Endpoint de calendario

```javascript
// GET /api/calendar?date=2026-06-15
// Devuelve visits agrupadas por sillón para ese día
```

---

## 4. REFINAMIENTO ESTÉTICO

Basado en principios de los system prompts de Claude Design + alta gama visual.

### 4.1 Espaciado y Jerarquía Visual

| Elemento | Actual | Mejora propuesta |
|---|---|---|
| **Padding main** | `py-8` en main | `py-6 sm:py-8 lg:py-10` |
| **Gap entre StatCards** | `gap-3 sm:gap-4` | `gap-3 sm:gap-5` + stagger animation |
| **Tabla row height** | `px-4 py-3` | `px-5 py-3.5` más aire |
| **Formulario espaciado** | `gap-4` en grid | `gap-5` + más padding interno |
| **Header height** | `h-16` | `h-14 sm:h-16` |

### 4.2 Micro-interacciones en la Tabla

```css
/* Efecto hover en filas */
.table-row {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.table-row:hover {
  background: hsl(var(--primary) / 0.03);
  transform: translateX(2px);
}

/* Stagger animation al cargar filas */
@keyframes rowEnter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.table-row:nth-child(1) { animation-delay: 0ms; }
.table-row:nth-child(2) { animation-delay: 50ms; }
/* etc */
```

### 4.3 Refinamiento del Header

```
┌──────────────────────────────────────────────────────┐
│  [🦷 Odonto Reminder]      [Dashboard] [Actividad]   │
│  Aruba · Dental Care                                  │
│                               [🌐 ES ▼] [🌓] [A ▼]   │
└──────────────────────────────────────────────────────┘
```

Mejoras:
- **Nav activa**: Subrayado animado (border-bottom transition) en el item activo
- **Indicador de sesión**: Punto verde junto al avatar con tooltip "Sesión activa"
- **Migas de pan (breadcrumbs)** sutiles cuando se navega a perfiles
- **Barra de búsqueda global** (Ctrl+K) en el header que busque pacientes (Command+K con cmdk)

### 4.4 Refinamiento de Cards y Componentes

```css
/* StatCards con glow animado en hover actual ya tienen hover-lift */
/* Mejora: gradiente sutil de fondo que se mueve */
.stat-card {
  position: relative;
  overflow: hidden;
}
.stat-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 0%, var(--aruba-turquoise)/0.05 100%);
  opacity: 0;
  transition: opacity 0.3s;
}
.stat-card:hover::before {
  opacity: 1;
}
```

### 4.5 Sistema de Diseño: Tokens Refinados

Agregar a `globals.css`:

```css
:root {
  /* Nuevos tokens de espaciado */
  --section-gap: 2rem;
  --card-padding: 1.5rem;
  --table-cell-padding: 0.875rem 1.25rem;
  
  /* Nuevos tokens de animación */
  --ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  /* Sombras refinadas */
  --shadow-card-hover: 0 12px 40px -8px rgba(0, 168, 181, 0.15);
}
```

### 4.6 Carga y Transiciones

- **Skeleton shimmer mejorado**: Gradiente animado más fluido (ya existe shimmer)
- **Page transitions**: Fade + slide sutiles entre rutas (Next.js `<Transition>`)
- **Toasts premium**: Los de sonner ya son buenos, pero se puede personalizar posición y estilo

### 4.7 Inspiración de system prompts de diseño

Tomando principios de `claude-design.md`:
- "Avoid AI slop tropes: rounded corners with a left-border accent color, overused fonts"
- "Use appropriate scales: text never smaller than 24px on 1920×1080"
- "Every element should earn its place, no filler content"
- "Surprise the user with CSS, layout, and motion"

---

## 5. NUEVOS CAMPOS EN BASE DE DATOS

### En Patient.js (extensión segura, campos opcionales)

```javascript
// Agregar al schema existente (sin cambiar campos requeridos)
{
  // Ya existe todo. Solo agregar:
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ["male", "female", "other"] },
  emergencyContact: { type: String },
  emergencyPhone: { type: String },
  insuranceProvider: { type: String },
  insuranceNumber: { type: String },
  allergies: [{ type: String }],
  medicalHistory: { type: String },
  preferredDoctor: { type: String },
  source: { type: String, enum: ["referral", "walkin", "online", "other"], default: "other" },
  // totalVisits, lastVisitDate, nextAppointmentDate ya existen
}
```

### En Visit.js (extensión segura)

```javascript
// Agregar al schema existente
{
  dentalChair: { type: Number, min: 1, max: 10, default: 1 },
  appointmentStartTime: { type: String },  // "09:00" — hora exacta de inicio
  appointmentEndTime: { type: String },    // "10:00"
  duration: { type: Number, default: 60 }, // minutos
  // cost, paid ya existen
  discount: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ["cash", "card", "insurance", "transfer"] },
  assignedDoctor: { type: String },
  remindersSentCount: { type: Number, default: 0 },
  lastReminderSentAt: { type: Date },
  // Campos de no-show (nuevo)
  noShow: { type: Boolean, default: false },
  noShowNotified: { type: Boolean, default: false },
  // Reschedule
  rescheduledFrom: { type: Date },
  rescheduledBy: { type: String },
}
```

### Todas las extensiones son opcionales (`default` o no required)
Esto garantiza que NO se rompa la funcionalidad actual. Los documentos existentes siguen funcionando.

---

## 6. HOJA DE RUTA — NUEVAS FEATURES

Priorizadas por impacto vs esfuerzo:

| Prioridad | Feature | Esfuerzo | Impacto |
|---|---|---|---|
| **P0** | 🔍 Combobox búsqueda pacientes | 1 día | 🔥 Duplicados cero |
| **P0** | 📋 Sheet detalle paciente | 2 días | 🔥 Retención de contexto |
| **P1** | 📅 Vista calendario (Fase 1) | 2 días | 🔥 Visualización |
| **P1** | 💰 Estado de cuenta en Sheet | 1 día | 🔥 Facturación |
| **P1** | 📊 Dashboard con gráficos (Chart.js/Recharts) | 2 días | 🔥 Analytics |
| **P2** | 📱 Modo oscuro pulido (ya existe, mejorar) | 0.5 día | Medio |
| **P2** | 🔔 Notificaciones Push al navegador | 2 días | Alto |
| **P2** | 📎 Adjuntar fotos/radiografías al paciente | 3 días | Alto |
| **P2** | 🏥 Múltiples sillones en calendario (Fase 2) | 3 días | 🔥 |
| **P3** | 📄 Generar recetas en PDF | 1 día | Medio |
| **P3** | 🔐 Roles de usuario (admin, asistente, doctor) | 3 días | Alto |
| **P3** | 💬 Chat en vivo con pacientes vía WhatsApp | 4 días | Alto |
| **P3** | 📈 Reportes avanzados (exportar Excel) | 2 días | Medio |
| **P4** | 🌐 Multi-clínica (tenant) | 5 días | Bajo ahora |
| **P4** | 🤖 AI asistente para diagnóstico | 5 días | Medio |

### Features adicionales de alto valor

1. **Smart No-Show Detection**: Si paciente no responde y no asiste → auto-marcar + re-enviar
2. **Auto-rescheduling**: Si paciente cancela, ofrecer reagendar automáticamente desde WhatsApp
3. **Recordatorio inteligente**: Basado en historial (si siempre confirma, enviar solo 1 vez; si nunca, escalar)
4. **Analytics embedidos**: Tasa de confirmación por mes, tendencias, tiempos pico
5. **Exportación avanzada**: Excel con fórmulas + gráficos automáticos
6. **Modo Quiosco**: Tablet en recepción para que pacientes se registren solos

---

## 7. EVALUACIÓN DE ASPECTOS MEJORABLES

### 7.1 UX / Usabilidad

| Aspecto | Estado | Diagnóstico |
|---|---|---|
| **Registro de pacientes** | ⚠️ Regular | Sin detección de duplicados. Combobox lo arregla. |
| **Navegación perfil** | ⚠️ Regular | Navegación a página completa rompe contexto. Sheet lo arregla. |
| **Feedback de acciones** | ✅ Bueno | Toasts con sonner, estados de carga. Mejorable con micro-animaciones. |
| **Atajos de teclado** | ✅ Bueno | Ctrl+F, Ctrl+E. Se puede expandir (Ctrl+N nuevo, Ctrl+K buscar). |
| **Responsive** | ⚠️ Regular | Tabla responsive pero mejorable en mobile (card view). |
| **Multi-idioma** | ✅ Bueno | ES/EN/PAP funcionando. |

### 7.2 Backend / Arquitectura

| Aspecto | Estado | Diagnóstico |
|---|---|---|
| **Polling** | ⚠️ Regular | Cada 30s funciona pero no escala. WebSockets no implementados. |
| **Autenticación** | ✅ Bueno | JWT con jose + httpOnly cookies. Sencillo pero sólido. |
| **Webhook WhatsApp** | ✅ Bueno | Sistema de parsing de intenciones muy robusto (408 líneas). |
| **CRON** | ⚠️ Regular | Limitado por Vercel Hobby (1 cron). Polling compensa. |
| **API REST** | ✅ Bueno | Bien estructurada. Mejorable con validación con Zod. |
| **MongoDB indexes** | ⚠️ Regular | Índices básicos. Faltan compuestos para queries frecuentes. |

### 7.3 Rendimiento

| Aspecto | Diagnóstico |
|---|---|
| **Carga inicial** | SSR con fetch directo. Bueno. Mejorable con streaming. |
| **Carga de imágenes** | No hay imágenes pesadas aún (solo iconos SVGs). |
| **Bundle size** | Next.js + React 19 + Shadcn. Bien optimizado por defecto. |
| **API latency** | MongoDB Atlas + Vercel. Latencia ~100ms. Cacheable con TanStack Query. |

### 7.4 UI / Diseño Visual

| Aspecto | Estado | Diagnóstico |
|---|---|---|
| **Paleta de color** | ✅ Excelente | Aruba turquesa/naranja. Única y memorable. |
| **Glassmorphism** | ✅ Bueno | Tarjetas glass-card con backdrop-blur. Sutil y premium. |
| **Header gradient** | ✅ Bueno | Gradient-header azul oscuro → turquesa. Impactante. |
| **Micro-interacciones** | ⚠️ Regular | Hover-lift presente. Faltan transiciones de entrada, stagger. |
| **Skeletons** | ⚠️ Regular | Presentes pero básicos. Mejorar con shimmer animado. |
| **Consistencia** | ✅ Bueno | Sistema de diseño definido en globals.css. Consistente. |

---

## APÉNDICE: PLAN DE IMPLEMENTACIÓN (SPRINTS)

### Sprint 1: Quick Wins (2-3 días)
1. Combobox en PatientForm + endpoint `/api/patients/search`
2. Sheet lateral con datos básicos del paciente
3. Refinar espaciado y micro-interacciones en tabla

### Sprint 2: Calendario + Estado de Cuenta (3-4 días)
1. Tabs Table/Calendar en DashboardClient
2. Calendario semanal (grid CSS puro)
3. Pestaña "Estado de Cuenta" dentro del Sheet

### Sprint 3: Features Avanzadas (5-7 días)
1. Gráficos en dashboard con Recharts
2. No-show detection automático
3. Notas clínicas persistentes
4. Exportación Excel

### Sprint 4: Polish (2-3 días)
1. Animaciones de entrada en tabla (stagger)
2. Page transitions
3. Modo quiosco / responsive pulido
4. Atajos de teclado avanzados

---

> **Nota**: Este plan está diseñado para ejecutarse sin romper la funcionalidad actual. Cada paso es incremental y reversible.
