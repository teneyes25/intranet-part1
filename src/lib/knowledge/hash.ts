import { createHash } from "node:crypto";

export function sha256(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}
