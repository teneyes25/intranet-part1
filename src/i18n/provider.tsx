"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Locale, Messages } from "@/i18n/config";
import ko from "@/i18n/messages/ko.json";

const I18nContext = createContext<{ locale: Locale; t: Messages }>({
  locale: "ko",
  t: ko,
});

export function I18nProvider({
  locale = "ko",
  messages,
  children,
}: {
  locale?: Locale;
  messages?: Messages;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ locale, t: messages ?? ko }),
    [locale, messages],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT() {
  return useContext(I18nContext).t;
}
