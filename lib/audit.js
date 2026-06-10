import AuditLog from "@/models/AuditLog";
import { createLogger } from "@/lib/logger";

const log = createLogger("lib/audit");

/**
 * Registra una acción en el audit log.
 * 
 * @param {object} params
 * @param {string} params.action — "create" | "update" | "confirm" | "cancel" | etc.
 * @param {string} params.resource — "patient" | "visit" | "auth"
 * @param {string} [params.resourceId] — ID del recurso afectado
 * @param {object} [params.details] — Información adicional
 * @param {string} [params.ip] — Dirección IP
 * @param {string} [params.userAgent] — User agent
 * @param {string} [params.username] — Nombre de usuario
 */
export async function logAudit({ action, resource, resourceId, details, ip, userAgent, username }) {
  try {
    await AuditLog.create({
      username: username || "system",
      action,
      resource,
      resourceId: resourceId || undefined,
      details: details || {},
      ip: ip || "unknown",
      userAgent: userAgent || "unknown",
    });
  } catch (error) {
    // El audit log nunca debe romper la operación principal
    log.error(error, "Error escribiendo audit log");
  }
}

/**
 * Helper para extraer IP de un request de Next.js
 */
export function extractRequestInfo(request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  };
}
