import "server-only";

import { prisma } from "@/lib/prisma";
import {
  ingestAllIntranetKnowledge,
  ingestAllKnowledgeMaterials,
  ingestBoardPosts,
} from "@/lib/ai/ingest";
import { countChunks } from "@/lib/ai/vector-store";
import { getLearningSettings } from "@/features/ai/knowledge-service";

export function listIngestJobs(limit = 20) {
  return prisma.aiIngestJob.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

export async function runIngestJob(params: {
  triggeredById: string;
  scope: "all" | "boards" | "curated";
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
    let postsProcessed = 0;
    let documentsProcessed = 0;
    let approvalsProcessed = 0;
    let curatedProcessed = 0;

    if (params.scope === "all") {
      const settings = await getLearningSettings();
      const r = await ingestAllIntranetKnowledge({
        includePosts: settings.learnAllIntranet,
        includeDocuments: settings.learnAllIntranet,
        includeApprovals: settings.learnAllIntranet,
        includeCurated: settings.learnCurated,
      });
      postsProcessed = r.posts;
      documentsProcessed = r.documents;
      approvalsProcessed = r.approvals;
      curatedProcessed = r.curated;
    } else if (params.scope === "curated") {
      curatedProcessed = await ingestAllKnowledgeMaterials();
    } else {
      postsProcessed = await ingestBoardPosts(params.boardKeys ?? []);
    }

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

    return {
      jobId: job.id,
      postsProcessed,
      documentsProcessed,
      approvalsProcessed,
      curatedProcessed,
      chunksTotal,
      /** @deprecated sync UI 호환 */
      ingested:
        postsProcessed +
        documentsProcessed +
        approvalsProcessed +
        curatedProcessed,
      chunks: chunksTotal,
    };
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
