export type Locale = "ko" | "en";

export const DEFAULT_LOCALE: Locale = "ko";

export const LOCALE_LABELS: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
};

export type Messages = typeof import("./messages/ko.json");

export async function getMessages(locale: Locale): Promise<Messages> {
  switch (locale) {
    case "en":
      return (await import("./messages/en.json")).default;
    default:
      return (await import("./messages/ko.json")).default;
  }
}
