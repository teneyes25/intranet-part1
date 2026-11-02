import { spawn } from "node:child_process";
import path from "node:path";

export async function importWorker(payload: object): Promise<Record<string, unknown>> {
  const root = process.env.ERP_IMPORT_DIR;
  if (!root || !path.isAbsolute(root)) throw new Error("ERP_IMPORT_DIR must be absolute");
  // ERP originals must never be served by the existing public upload route.
  const resolved = path.resolve(root);
  for (const publicRoot of [path.resolve("uploads"), path.resolve("public")]) {
    if (resolved === publicRoot || resolved.startsWith(publicRoot + path.sep)) throw new Error("ERP storage must be private");
  }
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.ERP_PYTHON ?? "python3", [path.resolve("scripts/erp/import_store.py")], {
      stdio: ["pipe", "pipe", "pipe"], env: process.env,
    });
    let output = "";
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("ERP validation timeout")); }, 30000);
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      if (output.length > 4 * 1024 * 1024) { child.kill("SIGKILL"); reject(new Error("ERP response too large")); }
    });
    child.stderr.resume(); // Never expose source paths or data in API errors/logs.
    child.stdin.on("error", () => {});
    child.on("error", () => { clearTimeout(timer); reject(new Error("ERP worker unavailable")); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error("ERP worker failed"));
      try { resolve(JSON.parse(output)); } catch { reject(new Error("ERP worker response invalid")); }
    });
    child.stdin.end(JSON.stringify(payload));
  });
}
