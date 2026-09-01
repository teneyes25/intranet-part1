import "server-only";

import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";

import { EMBEDDING_MODEL } from "./config";

type Extractor = (
  input: string | string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist: () => number[][] }>;

/**
 * Docker(nextjs 유저)에서는 node_modules 아래 .cache 생성이 EACCES 난다.
 * 쓰기 가능한 경로(uploads 또는 /tmp)로 캐시를 강제한다.
 */
function pickWritableCacheRoot(): string {
  const candidates = [
    process.env.TRANSFORMERS_CACHE?.trim(),
    process.env.HF_HOME?.trim(),
    path.join(process.cwd(), "uploads", "hf-cache"),
    "/tmp/hf-cache",
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      mkdirSync(path.join(candidate, "hub"), { recursive: true });
      mkdirSync(path.join(candidate, "xdg"), { recursive: true });
      const probe = path.join(candidate, `.write-test-${process.pid}`);
      writeFileSync(probe, "ok");
      unlinkSync(probe);
      return candidate;
    } catch {
      // try next
    }
  }
  return "/tmp/hf-cache";
}

function ensureWritableHfCache() {
  const cacheRoot = pickWritableCacheRoot();
  process.env.TRANSFORMERS_CACHE = cacheRoot;
  process.env.HF_HOME = cacheRoot;
  process.env.HF_HUB_CACHE = path.join(cacheRoot, "hub");
  process.env.XDG_CACHE_HOME = path.join(cacheRoot, "xdg");
  try {
    mkdirSync(path.join(cacheRoot, "hub"), { recursive: true });
    mkdirSync(path.join(cacheRoot, "xdg"), { recursive: true });
  } catch (e) {
    console.error("[ai/embeddings] cache mkdir failed:", cacheRoot, e);
  }
  return cacheRoot;
}

ensureWritableHfCache();

let extractorPromise: Promise<Extractor> | null = null;

function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    const cacheRoot = ensureWritableHfCache();
    console.log(`[ai/embeddings] HF cache → ${cacheRoot}`);
    extractorPromise = import("@huggingface/transformers")
      .then(({ pipeline }) =>
        pipeline("feature-extraction", EMBEDDING_MODEL) as unknown as Promise<Extractor>,
      )
      .catch((error) => {
        extractorPromise = null;
        throw error;
      });
  }
  return extractorPromise;
}

/** 여러 문자열을 한 번에 임베딩한다. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: "mean", normalize: true });
  return output.tolist();
}

/** 단일 문자열 임베딩. */
export async function embedText(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  if (!vector) throw new Error("임베딩 생성에 실패했습니다.");
  return vector;
}
