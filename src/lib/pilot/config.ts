import "server-only";

export function isPilotModeEnv(): boolean {
  return process.env.PILOT_MODE === "true";
}
