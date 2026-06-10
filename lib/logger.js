const pino = require("pino");

const isDev = process.env.NODE_ENV === "development";

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  transport: isDev
    ? {
        target: "pino/file",
        options: { destination: 1, colorize: true },
      }
    : undefined,
});

/**
 * Crea un logger contextual para una ruta o módulo específico.
 * @param {string} route — Nombre del módulo (e.g. "api/patients", "lib/whatsapp")
 */
function createLogger(route) {
  return logger.child({ route });
}

module.exports = { logger, createLogger };
