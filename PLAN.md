# Plan: Odonto Reminder Aruba - Confirmaciones + Rediseño Premium

## FASE 1: Sistema de Confirmaciones (Backend Crítico)

### 1.1 Extender Modelo de Datos
- `confirmationStatus`: 'pending' | 'confirmed' | 'cancelled'
- `patientResponse`: String
- `respondedAt`: Date

### 1.2 Crear Webhook /api/webhooks/whatsapp
- Recibir mensajes entrantes de OpenWA
- Parser de intenciones (sí/no)
- Actualizar MongoDB + notificar odontólogo

### 1.3 Mejorar Mensajes WhatsApp
- Instrucciones claras: "Responda SI/NO"
- Notificar al odontólogo de respuestas

### 1.4 Actualizar Cron
- Solo enviar a status 'pending'
- No enviar a confirmados/cancelados

## FASE 2: Rediseño UI/UX
- Login glassmorphism
- Dashboard con badges de estado
- Filtros por confirmación
- Toast notifications

## FASE 3: Configuración
- OpenWA en Railway/Render
- Variables de entorno
- Testing end-to-end
