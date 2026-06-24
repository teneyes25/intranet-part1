import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: { service: "intranet-part1" },
  ...(isDev ? { transport: undefined } : {}),
});

export function createChildLogger(name: string) {
  return logger.child({ module: name });
}
