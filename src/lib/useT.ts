"use client";

import { useEffect, useState } from "react";
import { getSettings, subscribeSettings, Locale } from "./settings";
import { t as translate } from "./i18n";

export function useLocale(): Locale {
  const [locale, setLocale] = useState<Locale>("id");
  useEffect(() => {
    setLocale(getSettings().locale);
    return subscribeSettings((s) => setLocale(s.locale));
  }, []);
  return locale;
}

export function useT(): (key: string) => string {
  const locale = useLocale();
  return (key: string) => translate(key, locale);
}
