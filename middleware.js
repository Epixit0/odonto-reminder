import { NextResponse } from "next/server";

// ─── Security headers ───────────────────────────────────────
const securityHeaders = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-DNS-Prefetch-Control": "on",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

// ─── Rate limiter en memoria (sliding window) ───────────────
const rateLimitStore = new Map();

function getRateLimitKey(request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  const path = request.nextUrl.pathname;
  return `${ip}:${path}`;
}

function checkRateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count++;
  return { allowed: entry.count <= maxRequests, remaining: Math.max(0, maxRequests - entry.count) };
}

// Limpiar store cada 5 minutos para evitar memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, 300000);

// ─── Config de rate limit por ruta ──────────────────────────
const RATE_LIMITS = {
  "/api/auth/login": { max: 5, windowMs: 15 * 60 * 1000 },        // 5 intentos / 15 min
  "/api/webhooks/whatsapp": { max: 100, windowMs: 60 * 1000 },     // 100 / min
  "/api/patients": { max: 60, windowMs: 60 * 1000 },               // 60 / min
  "/api/cron": { max: 10, windowMs: 60 * 1000 },                   // 10 / min
  default: { max: 120, windowMs: 60 * 1000 },                      // 120 / min genérico
};

function getRateLimitConfig(path) {
  for (const [prefix, config] of Object.entries(RATE_LIMITS)) {
    if (path.startsWith(prefix)) return config;
  }
  return RATE_LIMITS.default;
}

// ─── Middleware ──────────────────────────────────────────────
export function middleware(request) {
  const response = NextResponse.next();
  const path = request.nextUrl.pathname;

  // 1. Añadir security headers
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  // 2. CSP (Content Security Policy) — permisiva pero segura
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https:;"
  );

  // 3. Rate limiting (solo en API routes)
  if (path.startsWith("/api/")) {
    const key = getRateLimitKey(request);
    const config = getRateLimitConfig(path);
    const result = checkRateLimit(key, config.max, config.windowMs);

    response.headers.set("X-RateLimit-Limit", String(config.max));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));

    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({ error: "Demasiadas solicitudes. Intenta de nuevo más tarde." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(config.windowMs / 1000)),
          },
        }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
  ],
};
