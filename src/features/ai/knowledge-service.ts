import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import { UPLOAD_DIR, saveUploadedFile } from "@/lib/uploads";
import {
  ingestKnowledgeMaterial,
  removeKnowledgeMaterial,
} from "@/lib/ai/ingest";
import {
  DEFAULT_PERSONA_IDENTITY,
  DEFAULT_PERSONA_RULES,
} from "@/lib/ai/persona-defaults";

const TEXT_EXTS = new Set([".txt", ".md", ".csv", ".json", ".log"]);

export type LearningSettings = {
  learnAllIntranet: boolean;
  learnCurated: boolean;
  allowCasualChat: boolean;
  personaIdentity: string;
  personaRules: string;
};

export async function getLearningSettings(): Promise<LearningSettings> {
  const row = await prisma.aiLearningSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      learnAllIntranet: true,
      learnCurated: true,
      allowCasualChat: true,
    },
  });
  return {
    learnAllIntranet: row.learnAllIntranet,
    learnCurated: row.learnCurated,
    allowCasualChat: row.allowCasualChat,
    personaIdentity: row.personaIdentity?.trim() || DEFAULT_PERSONA_IDENTITY,
    personaRules: row.personaRules?.trim() || DEFAULT_PERSONA_RULES,
  };
}

export async function saveLearningSettings(
  patch: Partial<{
    learnAllIntranet: boolean;
    learnCurated: boolean;
    allowCasualChat: boolean;
    personaIdentity: string | null;
    personaRules: string | null;
  }>,
): Promise<LearningSettings> {
  const current = await getLearningSettings();
  const next = {
    learnAllIntranet: patch.learnAllIntranet ?? current.learnAllIntranet,
    learnCurated: patch.learnCurated ?? current.learnCurated,
    allowCasualChat: patch.allowCasualChat ?? current.allowCasualChat,
    personaIdentity:
      patch.personaIdentity === undefined
        ? undefined
        : patch.personaIdentity?.trim() || null,
    personaRules:
      patch.personaRules === undefined
        ? undefined
        : patch.personaRules?.trim() || null,
  };
  await prisma.aiLearningSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      learnAllIntranet: next.learnAllIntranet,
      learnCurated: next.learnCurated,
      allowCasualChat: next.allowCasualChat,
      personaIdentity: next.personaIdentity ?? null,
      personaRules: next.personaRules ?? null,
    },
    update: {
      learnAllIntranet: next.learnAllIntranet,
      learnCurated: next.learnCurated,
      allowCasualChat: next.allowCasualChat,
      ...(patch.personaIdentity !== undefined
        ? { personaIdentity: next.personaIdentity }
        : {}),
      ...(patch.personaRules !== undefined
        ? { personaRules: next.personaRules }
        : {}),
    },
  });
  return getLearningSettings();
}

export async function listKnowledgeMaterials(take = 100) {
  return prisma.aiKnowledgeMaterial.findMany({
    orderBy: { updatedAt: "desc" },
    take,
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });
}

function isTextKnowledgeFile(fileName: string, mimeType?: string | null) {
  const ext = path.extname(fileName).toLowerCase();
  if (TEXT_EXTS.has(ext)) return true;
  if (mimeType?.startsWith("text/")) return true;
  if (mimeType === "application/json") return true;
  return false;
}

export async function createKnowledgeMaterial(params: {
  userId: string;
  title: string;
  content: string;
  file?: File | null;
}) {
  const title = params.title.trim();
  let content = params.content.trim();
  let fileName: string | null = null;
  let storageKey: string | null = null;
  let mimeType: string | null = null;

  if (params.file && params.file.size > 0) {
    const saved = await saveUploadedFile(params.file, { userId: params.userId });
    fileName = params.file.name;
    storageKey = saved.storageKey;
    mimeType = saved.mimeType;
    if (isTextKnowledgeFile(params.file.name, saved.mimeType)) {
      const raw = await readFile(path.join(UPLOAD_DIR, saved.storageKey), "utf8");
      if (!content) content = raw.slice(0, 200_000);
      else
        content = `${content}\n\n---\n파일 내용 (${params.file.name})\n${raw.slice(0, 200_000)}`;
    } else if (!content) {
      content = `[첨부 파일] ${params.file.name}\n(바이너리 파일은 본문 텍스트를 함께 입력해 주세요. 파일명·메타만 학습됩니다.)`;
    }
  }

  if (!title) throw new Error("제목을 입력하세요.");
  if (!content) throw new Error("학습할 본문 또는 텍스트 파일을 입력하세요.");

  const row = await prisma.aiKnowledgeMaterial.create({
    data: {
      title,
      content,
      fileName,
      storageKey,
      mimeType,
      createdById: params.userId,
      isActive: true,
    },
  });

  await ingestKnowledgeMaterial(row.id).catch((e) =>
    console.error("[knowledge] ingest after create:", e),
  );
  return row;
}

export async function updateKnowledgeMaterial(params: {
  id: string;
  title?: string;
  content?: string;
  isActive?: boolean;
}) {
  const existing = await prisma.aiKnowledgeMaterial.findUnique({
    where: { id: params.id },
  });
  if (!existing) throw new Error("자료를 찾을 수 없습니다.");

  const row = await prisma.aiKnowledgeMaterial.update({
    where: { id: params.id },
    data: {
      ...(params.title !== undefined ? { title: params.title.trim() } : {}),
      ...(params.content !== undefined ? { content: params.content.trim() } : {}),
      ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
    },
  });

  if (row.isActive) {
    await ingestKnowledgeMaterial(row.id).catch((e) =>
      console.error("[knowledge] ingest after update:", e),
    );
  } else {
    await removeKnowledgeMaterial(row.id).catch(() => undefined);
  }
  return row;
}

export async function deleteKnowledgeMaterial(id: string) {
  await removeKnowledgeMaterial(id).catch(() => undefined);
  await prisma.aiKnowledgeMaterial.delete({ where: { id } }).catch(() => undefined);
  return { ok: true as const };
}
