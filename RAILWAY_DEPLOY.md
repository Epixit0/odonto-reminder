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

## Paso 3: Configurar Variables de Entorno

En el dashboard de Railway, ve a tu servicio → **Variables**:

```bash
# Puerto
PORT=2785

# Base de datos (Railway te da DATABASE_URL automáticamente)
DATABASE_TYPE=sqlite

# Storage
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=./data/media

# Cache
CACHE_TYPE=memory

# Dashboard
DASHBOARD_ENABLED=true
DASHBOARD_PORT=2886

# API Key (genera una segura)
API_KEY=sk_openwa_$(openssl rand -hex 32)

# Session
SESSION_HEADLESS=true
```

**Nota**: Railway te asignará automáticamente:
- `RAILWAY_PUBLIC_DOMAIN` (tu URL pública)
- `PORT` (puerto asignado)

## Paso 4: Configurar Volúmenes (Persistencia)

Railway reinicia los contenedores y pierde datos. Necesitas un volumen:

1. En Railway dashboard → **Volumes**
2. Click **"New Volume"**
3. Mount Path: `/app/data`
4. Size: 5GB (suficiente para empezar)

Esto guarda:
- Sesiones de WhatsApp
- Base de datos SQLite
- Archivos media
- Tokens de autenticación

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

### WhatsApp se desconecta
- Esto es normal si el contenedor se reinicia
- Con el volumen configurado, debería reconectar automáticamente
- Si no, escanea el QR de nuevo

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
