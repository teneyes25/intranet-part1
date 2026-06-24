import "server-only";

import { prisma } from "@/lib/prisma";
import { ingestAllPosts, ingestBoardPosts } from "@/lib/ai/ingest";
import { countChunks } from "@/lib/ai/vector-store";

export function listIngestJobs(limit = 20) {
  return prisma.aiIngestJob.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

export async function runIngestJob(params: {
  triggeredById: string;
  scope: "all" | "boards";
  boardKeys?: string[];
}) {
  const job = await prisma.aiIngestJob.create({
    data: {
      triggeredById: params.triggeredById,
      scope: params.scope,
      boardKeys: params.boardKeys ?? [],
      status: "running",
    },
  });

  try {
    const postsProcessed =
      params.scope === "all"
        ? await ingestAllPosts()
        : await ingestBoardPosts(params.boardKeys ?? []);
    const chunksTotal = await countChunks();

    await prisma.aiIngestJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        postsProcessed,
        chunksTotal,
        completedAt: new Date(),
      },
    });

    return { jobId: job.id, postsProcessed, chunksTotal };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ingest failed";
    await prisma.aiIngestJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        errorMessage: msg,
        completedAt: new Date(),
      },
    });
    throw e;
  }
}
