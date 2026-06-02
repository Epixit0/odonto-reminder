# 🚀 Deploy de OpenWA en Railway

## Paso 1: Preparar el Repositorio

1. Sube tu carpeta `OpenWA/` a GitHub (si no está ya)
2. Asegúrate de que el Dockerfile esté en la raíz del repo

```bash
cd OpenWA
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tu-usuario/openwa-railway.git
git push -u origin main
```

## Paso 2: Crear Proyecto en Railway

1. Ve a [railway.app](https://railway.app) y login con GitHub
2. Verifica que tienes los créditos de GitHub Student (debería mostrarse en tu perfil)
3. Click **"New Project"**
4. Selecciona **"Deploy from GitHub repo"**
5. Busca tu repositorio de OpenWA
6. Railway detectará automáticamente el Dockerfile

## Paso 3: Volumen persistente (OBLIGATORIO — sin esto pierdes el QR en cada deploy)

Cada deploy en Railway **destruye el disco del contenedor**. La sesión de WhatsApp vive en archivos locales; si no hay volumen, escaneas el QR otra vez.

### Configurar una sola vez

1. Railway → tu servicio **OpenWA** → pestaña **Volumes** (o **Storage**)
2. **Add Volume** / **New Volume**
3. **Mount path**: `/app/data` (exactamente así)
4. Tamaño: 5 GB o más
5. **Redeploy** el servicio después de crear el volumen

### Variables de entorno (rutas absolutas al volumen)

Copia desde `openwa-railway.env.example` o pega esto en **Variables**:

```bash
PORT=2785
NODE_ENV=production

SESSION_DATA_PATH=/app/data/sessions
DATABASE_TYPE=sqlite
DATABASE_NAME=/app/data/openwa.sqlite
DATABASE_SYNCHRONIZE=false
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=/app/data/media
PLUGINS_DIR=/app/data/plugins

ENGINE_TYPE=whatsapp-web.js
PUPPETEER_HEADLESS=true
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu

CACHE_TYPE=memory
DASHBOARD_ENABLED=true
DASHBOARD_PORT=2886
API_MASTER_KEY=sk_openwa_TU_CLAVE_SEGURA

# Permisos de escritura en el volumen
RAILWAY_RUN_UID=0
```

**No uses** `./data/...` en Railway; usa siempre `/app/data/...`.

**Nota**: Railway asigna `RAILWAY_PUBLIC_DOMAIN` y `PORT` automáticamente.

### Qué se guarda en el volumen

| Ruta | Contenido |
|------|-----------|
| `/app/data/sessions` | Auth de WhatsApp (lo del QR) |
| `/app/data/openwa.sqlite` | Sesiones, webhooks en DB |
| `/app/data/media` | Archivos media |

### Después del primer deploy con volumen

1. Escanea el QR **una vez**
2. Copia el **ID de sesión** (UUID) al `.env` de Vercel: `OPENWA_SESSION_ID=...`
3. Registra el webhook (no se pierde si el volumen funciona):

```bash
./scripts/openwa-webhook.sh TU_SESSION_UUID
```

**No crees una sesión nueva** en cada deploy; reutiliza el mismo `OPENWA_SESSION_ID`.

## Paso 4: Deploys sin perder la sesión

| Acción | ¿Pierde QR? |
|--------|-------------|
| Deploy nuevo código (mismo servicio + volumen) | No |
| Restart del servicio | No |
| Cambiar variables (sin tocar volumen) | No |
| Borrar el volumen | Sí |
| Crear servicio nuevo sin volumen | Sí |
| Cambiar mount path del volumen | Sí (datos quedan en path viejo) |

**Vercel** (tu app Next.js) no afecta la sesión de OpenWA. Solo importan los redeploys de **Railway**.

### Verificar persistencia

```bash
export OPENWA_API_URL=https://tu-openwa.up.railway.app
export OPENWA_API_KEY=tu-key
export OPENWA_SESSION_ID=tu-uuid
./scripts/railway-openwa-check.sh
```

El estado de la sesión debería ser `READY` después de un redeploy sin escanear QR.

## Paso 5: Configurar Networking

Railway asigna URLs automáticamente, pero necesitas exponer ambos puertos:

### Opción A: Usar el mismo dominio con paths (Recomendado)

Railway maneja automáticamente el puerto 2785 (API). Para el dashboard:

1. Ve a **Settings** → **Networking**
2. Click **"Generate Domain"** para tu servicio
3. Tu URL será algo como: `https://openwa-production.up.railway.app`

### Opción B: Dos servicios separados (Más complejo)

Si quieres dashboard en puerto separado, necesitas crear dos servicios.

## Paso 6: Deploy

1. Railway hará deploy automático al detectar cambios
2. Ve a **Deployments** y espera que esté "Healthy"
3. Click en el dominio para verificar

## Paso 7: Probar la API

```bash
# Health check
curl https://tu-openwa.up.railway.app/api/health

# Crear sesión (reemplaza API_KEY)
curl -X POST https://tu-openwa.up.railway.app/api/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: TU_API_KEY" \
  -d '{"name": "clinica-dental"}'
```

## Paso 8: Configurar Webhook (IMPORTANTE)

Una vez tengas la URL de Railway, configura el webhook:

1. Ve al dashboard de OpenWA: `https://tu-openwa.up.railway.app:2886`
2. Login con tu API key
3. Ve a tu sesión → Webhooks
4. Agrega webhook:
   - URL: `https://tu-app.vercel.app/api/webhooks/whatsapp`
   - Events: `message.received`
   - Secret: (opcional, pero recomendado)

O vía API:

```bash
curl -X POST https://tu-openwa.up.railway.app/api/sessions/{sessionId}/webhooks \
  -H "Content-Type: application/json" \
  -H "X-API-Key: TU_API_KEY" \
  -d '{
    "url": "https://tu-app.vercel.app/api/webhooks/whatsapp",
    "events": ["message.received"],
    "secret": "tu-webhook-secret"
  }'
```

## Variables para tu App Next.js

Una vez deployado, actualiza tu `.env.local`:

```bash
OPENWA_API_URL=https://tu-openwa.up.railway.app
OPENWA_SESSION_ID=clinica-dental
OPENWA_API_KEY=TU_API_KEY
```

## Troubleshooting Railway

### El servicio no inicia
- Revisa los logs en Railway dashboard
- Verifica que el volumen esté montado correctamente
- Asegúrate de que las variables de entorno estén seteadas

### Pierdo la sesión / QR en cada deploy
1. ¿Hay volumen montado en `/app/data`? (Railway → Volumes)
2. ¿`SESSION_DATA_PATH=/app/data/sessions` y `DATABASE_NAME=/app/data/openwa.sqlite`?
3. ¿`RAILWAY_RUN_UID=0`?
4. ¿No creaste un **servicio nuevo** sin copiar el volumen?
5. Tras arreglar variables: **un solo** escaneo de QR; guarda el UUID en Vercel

### WhatsApp se desconecta temporalmente
- Tras restart con volumen, suele reconectar solo en 1–2 min
- Si queda en `QR` o `DISCONNECTED`, abre el dashboard y escanea de nuevo

### CORS errors
- Asegúrate de configurar CORS en OpenWA si es necesario
- O usa el mismo dominio para frontend y API

## Costos Estimados

Con GitHub Student Pack:
- **$5 créditos/mes incluidos**
- OpenWA consume ~$3-5/mes dependiendo del uso
- **Primeros meses son gratis** con los créditos

Sin Student Pack:
- ~$5/mes para el servicio básico
- Volumen: ~$0.10/GB/mes

## Comandos Útiles

```bash
# Ver logs en tiempo real
railway logs -f

# Restart servicio
railway restart

# Variables de entorno
railway variables

# Conectar shell al contenedor
railway connect
```

## Siguiente Paso

Una vez tengas OpenWA en Railway con URL pública, actualiza tu app Next.js con las nuevas variables y prueba el flujo completo de confirmaciones.
