/**
 * AI / RAG 관련 설정값. 환경변수로 덮어쓸 수 있다.
 *
 * 임베딩은 기본적으로 로컬(@huggingface/transformers) 모델을 사용하므로
 * API 키 없이도 오프라인으로 동작한다. 생성형 답변은 OPENAI_API_KEY 가
 * 있을 때만 사용하고, 없으면 추출형(retrieval) 답변으로 폴백한다.
 */
export const EMBEDDING_MODEL =
  process.env.AI_EMBEDDING_MODEL ?? "Xenova/all-MiniLM-L6-v2";

/** all-MiniLM-L6-v2 출력 차원 */
export const EMBEDDING_DIM = 384;

export const CHUNK_SIZE = 800;
export const CHUNK_OVERLAP = 120;
export const RETRIEVE_TOP_K = 5;

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
export const OPENAI_CHAT_MODEL =
  process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
export const OPENAI_BASE_URL =
  process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
