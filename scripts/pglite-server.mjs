// 로컬 미리보기용 인프로세스 Postgres (PGlite) 소켓 서버.
// Docker/PostgreSQL 설치 없이 5432 포트로 실제 Postgres 처럼 동작한다.
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const HOST = process.env.PGLITE_HOST ?? "127.0.0.1";
const PORT = Number(process.env.PGLITE_PORT ?? "5432");
const DATA_DIR = process.env.PGLITE_DIR ?? "./.pglite";

const db = await PGlite.create(DATA_DIR);
await db.waitReady;

const server = new PGLiteSocketServer({ db, port: PORT, host: HOST });
await server.start();

console.log(`PGlite socket server listening on ${HOST}:${PORT} (data: ${DATA_DIR})`);

const shutdown = async () => {
  console.log("Shutting down PGlite socket server...");
  await server.stop();
  await db.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
