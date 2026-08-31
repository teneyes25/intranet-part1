import "server-only";

import { pipeline } from "@huggingface/transformers";

import { EMBEDDING_MODEL } from "./config";

type Extractor = (
  input: string | string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist: () => number[][] }>;

let extractorPromise: Promise<Extractor> | null = null;

function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    // 최초 호출 시 모델을 내려받아 캐시한다(이후 오프라인 동작).
    extractorPromise = (
      pipeline("feature-extraction", EMBEDDING_MODEL) as unknown as Promise<Extractor>
    ).catch((error) => {
      // 실패 시 캐시를 비워 다음 요청에서 재시도
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
