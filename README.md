# Odonto Reminder Aruba 🦷

Sistema premium de recordatorios automáticos por WhatsApp para clínicas dentales, con confirmación de citas y diseño glassmorphism.

## ✨ Características

- **Recordatorios Automáticos**: Envía mensajes de WhatsApp 5 y 2 días antes de la cita
- **Confirmación de Citas**: Los pacientes pueden confirmar o cancelar respondiendo al mensaje
- **Notificaciones al Odontólogo**: Recibe alertas cuando un paciente confirma o cancela
- **Diseño Premium**: Interfaz glassmorphism con paleta Aruba (turquesa/naranja)
- **Multi-idioma**: Soporte para Español, English y Papiamento
- **Panel de Estadísticas**: Visualiza tasas de confirmación y estados de citas

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEXT.JS APP (Vercel)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │    Login     │  │   Dashboard  │  │   API Routes         │  │
│  │   Premium    │  │   Glassmorphism  │  ├─ /api/patients   │  │
│  └──────────────┘  └──────────────┘  ├─ /api/webhooks/...  │  │
│                                      └─ /api/cron/...       │  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MONGODB ATLAS                                │
│  Collection: visits                                             │
│  ├─ patientName, patientPhone, treatmentType                   │
│  ├─ confirmationStatus: pending|confirmed|cancelled            │
│  └─ sent5dPatient, sent2dPatient, patientResponse              │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OPENWA (WhatsApp Gateway)                    │
│  ├─ POST /messages/send-text (salientes)                       │
│  └─ Webhook /api/webhooks/whatsapp (entrantes)                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Configuración Rápida

### 1. Variables de Entorno

Copia `.env.example` a `.env.local` y configura:

```bash
# Base de datos
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/odontologia_db
MONGODB_DB_NAME=odontologia_db

# Autenticación
AUTH_SECRET=tu-clave-secreta-minimo-32-caracteres
ADMIN_USER=odontologa
ADMIN_PASS=tu-password-seguro

# WhatsApp OpenWA
OPENWA_API_URL=https://tu-openwa.railway.app  # NO usar localhost
OPENWA_SESSION_ID=clinica-dental-session
OPENWA_API_KEY=tu-api-key-de-openwa

# Webhook (opcional, para seguridad)
WEBHOOK_SECRET=tu-webhook-secret

# Notificaciones al odontólogo
OWNER_WHATSAPP_PHONE=+2971234567

# Seguridad Cron
CRON_SECRET=tu-cron-secret
```

### 2. OpenWA en Railway (Recomendado)

1. Ve a [Railway](https://railway.app) y crea un nuevo proyecto
2. Conecta el repositorio de OpenWA o usa el template
3. Agrega las variables de entorno necesarias
4. Railway te dará una URL pública como `https://tu-openwa.up.railway.app`
5. Usa esa URL en `OPENWA_API_URL`

**Importante**: El cron de Vercel no puede hablar con `localhost`. OpenWA debe estar en un servidor público.

### 3. Configurar Webhook en OpenWA

En el dashboard de OpenWA, configura el webhook:

```
URL: https://tu-app.vercel.app/api/webhooks/whatsapp
Método: POST
Headers (opcional): Authorization: Bearer tu-webhook-secret
```

Esto permite que OpenWA envíe los mensajes entrantes de los pacientes a tu app.

### 4. Crear Sesión en OpenWA

1. Ve al dashboard de OpenWA (generalmente en puerto 2886)
2. Crea una nueva sesión con el nombre que pusiste en `OPENWA_SESSION_ID`
3. Escanea el QR code con el WhatsApp del consultorio
4. Listo, el bot está conectado

## 🧪 Testing

### Prueba el flujo completo:

1. **Registro de Paciente**
   ```
   Dashboard → Nuevo Paciente → Registrar
   ```

2. **Verificar en MongoDB**
   ```javascript
   db.visits.find().pretty()
   // Debe mostrar confirmationStatus: "pending"
   ```

3. **Probar Cron Manualmente**
   ```bash
   curl "https://tu-app.vercel.app/api/cron/send-reminders?secret=TU_CRON_SECRET"
   ```
   O usa el modo "minutos" para pruebas rápidas.

4. **Simular Respuesta de Paciente**
   Envía un mensaje de prueba desde otro WhatsApp:
   ```bash
   curl -X POST "https://tu-app.vercel.app/api/webhooks/whatsapp" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "1234567890@c.us",
       "text": "SI"
     }'
   ```

5. **Verificar Estado**
   - El paciente debe recibir mensaje de confirmación
   - El odontólogo debe recibir notificación
   - En el dashboard debe aparecer "Confirmado"

### Modo de Prueba (Minutos)

Para pruebas rápidas sin esperar días:

1. Al registrar paciente, selecciona **"Minutos (prueba)"**
2. El sistema enviará recordatorios a los 5 y 2 minutos
3. Perfecto para demostraciones

## 📱 Flujo de Usuario

### Para el Odontólogo:

1. Ingresa al panel con sus credenciales
2. Registra un nuevo paciente con datos y fecha de control
3. El sistema automáticamente:
   - Calcula la fecha de seguimiento
   - Envía recordatorios 5 y 2 días antes
   - Recibe confirmaciones/cancelaciones
   - Notifica al odontólogo de cada respuesta

### Para el Paciente:

1. Recibe mensaje de WhatsApp 5 días antes:
   ```
   🏥 Clínica Dental - Recordatorio

   Hola [Nombre],

   Le recordamos su cita de control odontológico:
   📅 Fecha: [Fecha]
   🦷 Tratamiento: [Tipo]

   Por favor confirme su asistencia respondiendo:
   ✅ SI - Para confirmar
   ❌ NO - Para cancelar
   ```

2. Responde "SI" o "NO"
3. Recibe confirmación de su respuesta
4. El odontólogo recibe notificación

## 🎨 Sistema de Diseño

### Paleta Aruba

```css
--aruba-turquoise: #00A8B5;
--aruba-turquoise-light: #4ECDC4;
--aruba-orange: #F4A261;
--aruba-orange-light: #F7C59F;
--aruba-coral: #E76F51;
```

### Componentes Premium

- **Glass Cards**: `backdrop-blur-xl bg-white/80`
- **Gradientes**: De turquesa a naranja
- **Micro-animaciones**: Hover effects, fade-in, slide-up
- **Estados Visuales**: 
  - ✅ Confirmado: Verde
  - ⏳ Pendiente: Ámbar
  - ❌ Cancelado: Rojo

## 📊 Modelo de Datos

### Visit Schema

```javascript
{
  patientName: String,        // Nombre del paciente
  patientPhone: String,       // WhatsApp (+2971234567)
  language: String,           // es | en | pap
  treatmentType: String,      // Tipo de tratamiento
  treatmentDate: Date,        // Fecha del tratamiento
  followUpDate: Date,         // Fecha del próximo control
  notifyUnit: String,         // minutes | days | weeks | months
  notifyValue: Number,        // Cantidad de unidades
  
  // Flags de recordatorios
  sent5dPatient: Boolean,     // Enviado 5 días/min antes
  sent2dPatient: Boolean,     // Enviado 2 días/min antes
  sent5dOwner: Boolean,       // Notificado al odontólogo
  sent2dOwner: Boolean,
  
  // NUEVO: Sistema de confirmación
  confirmationStatus: String, // pending | confirmed | cancelled
  patientResponse: String,    // Texto que respondió el paciente
  respondedAt: Date,          // Fecha de respuesta
}
```

## 🔒 Seguridad

- **JWT en cookies httpOnly**: Sesiones seguras de 7 días
- **CRON_SECRET**: Solo Vercel o llamadas con secret pueden ejecutar cron
- **WEBHOOK_SECRET** (opcional): Verifica mensajes de OpenWA
- **API Key de OpenWA**: Protege el gateway de WhatsApp

## 🛠️ Troubleshooting

### OpenWA no conecta
- Verifica que la URL sea pública (no localhost)
- Revisa que el sessionId coincida
- Confirma que el API key sea correcto

### Mensajes no llegan
- Revisa los logs de Vercel
- Verifica que OWNER_WHATSAPP_PHONE tenga formato correcto
- Prueba el endpoint manualmente con curl

### Webhook no recibe mensajes
- Verifica la URL del webhook en OpenWA
- Revisa que el endpoint sea accesible públicamente
- Mira los logs de la función webhook

### Pacientes no aparecen
- Refresca el dashboard (F5)
- Verifica la conexión a MongoDB
- Revisa los permisos de la base de datos

## 📈 Próximas Mejoras

- [ ] Reagendamiento automático de citas canceladas
- [ ] Historial completo de mensajes por paciente
- [ ] Reportes semanales/mensuales
- [ ] Integración con calendarios (Google Calendar)
- [ ] App móvil PWA

## 📄 Licencia

MIT - Libre para uso comercial

---

**Odonto Reminder Aruba** - Hecho con ❤️ para clínicas dentales del Caribe
