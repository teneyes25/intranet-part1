import "server-only";

import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";

import { EMBEDDING_MODEL } from "./config";

type Extractor = (
  input: string | string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist: () => number[][] }>;

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

let extractorPromise: Promise<Extractor> | null = null;

async function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    const cacheRoot = pickWritableCacheRoot();
    mkdirSync(cacheRoot, { recursive: true });
    process.env.TRANSFORMERS_CACHE = cacheRoot;
    process.env.HF_HOME = cacheRoot;
    process.env.HF_HUB_CACHE = path.join(cacheRoot, "hub");

    extractorPromise = import("@huggingface/transformers")
      .then(async (mod) => {
        // process.env 만으로는 부족 — 패키지 기본값이 node_modules/.cache 라서 반드시 덮어쓴다
        mod.env.cacheDir = cacheRoot;
        mod.env.useFSCache = true;
        mod.env.allowLocalModels = true;
        console.log(`[ai/embeddings] env.cacheDir → ${mod.env.cacheDir}`);
        return mod.pipeline(
          "feature-extraction",
          EMBEDDING_MODEL,
        ) as unknown as Promise<Extractor>;
      })
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
