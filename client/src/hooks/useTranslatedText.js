import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import api from '../api';

// Static UI labels (buttons, nav, etc.) are hand-written or generated once
// via `npm run translate:ui` — see i18n/translations.js. This hook is for
// content that can't be pre-written because it comes from the database at
// runtime: job descriptions, mentor chat replies, course/scheme copy,
// employer-entered text, and so on.
//
// Scoped to the 5 South Indian languages this feature targets. Hindi/
// Bengali/Marathi UI strings are hand-written already, but dynamic DB
// content is English-only source data, so add codes here too if you want
// the same live-translation treatment for those languages.
const TRANSLATABLE_LANGS = new Set(['ta', 'te', 'kn', 'ml', 'gom']);

// Shared across every component instance for the lifetime of the tab, so
// switching pages/back doesn't re-spend API quota translating the same text.
const memoryCache = new Map(); // key: `${lang}::${text}` -> translated text

function cacheKey(lang, text) {
  return `${lang}::${text}`;
}

/**
 * Translates a single piece of dynamic text into the current UI language.
 * Returns the original (English) text immediately, then swaps in the
 * translation once it arrives — so the UI never shows a blank or a
 * loading spinner where content should be, and always degrades gracefully
 * to English if translation isn't configured or the request fails.
 */
export function useTranslatedText(text) {
  const { lang } = useLanguage();
  const [translated, setTranslated] = useState(text || '');
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!text || !TRANSLATABLE_LANGS.has(lang)) {
      setTranslated(text || '');
      return undefined;
    }
    const key = cacheKey(lang, text);
    if (memoryCache.has(key)) {
      setTranslated(memoryCache.get(key));
      return undefined;
    }

    setTranslated(text); // show English right away rather than nothing
    const myRequestId = ++requestIdRef.current;
    let cancelled = false;

    api
      .post('/translate', { text, target: lang })
      .then((res) => {
        if (cancelled || myRequestId !== requestIdRef.current) return;
        const result = res.data?.translated || text;
        memoryCache.set(key, result);
        setTranslated(result);
      })
      .catch(() => {
        if (!cancelled) setTranslated(text); // silently keep English on failure
      });

    return () => {
      cancelled = true;
    };
  }, [text, lang]);

  return translated;
}

/**
 * Same idea as useTranslatedText but for a whole array of strings (e.g. a
 * page of job-card descriptions) in a single batched request, instead of
 * one round trip per card.
 */
export function useTranslatedTexts(texts) {
  const { lang } = useLanguage();
  const safeTexts = Array.isArray(texts) ? texts : [];
  const [translated, setTranslated] = useState(safeTexts);
  const requestIdRef = useRef(0);
  const depKey = JSON.stringify(safeTexts);

  useEffect(() => {
    if (safeTexts.length === 0 || !TRANSLATABLE_LANGS.has(lang)) {
      setTranslated(safeTexts);
      return undefined;
    }

    const missing = [];
    const immediate = safeTexts.map((t) => {
      const key = cacheKey(lang, t);
      if (memoryCache.has(key)) return memoryCache.get(key);
      missing.push(t);
      return t; // English placeholder until this one comes back
    });
    setTranslated(immediate);
    if (missing.length === 0) return undefined;

    const myRequestId = ++requestIdRef.current;
    let cancelled = false;

    api
      .post('/translate', { texts: missing, target: lang })
      .then((res) => {
        if (cancelled || myRequestId !== requestIdRef.current) return;
        const results = res.data?.translations || [];
        missing.forEach((t, i) => memoryCache.set(cacheKey(lang, t), results[i] || t));
        setTranslated(safeTexts.map((t) => memoryCache.get(cacheKey(lang, t)) || t));
      })
      .catch(() => {
        if (!cancelled) setTranslated(safeTexts);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey, lang]);

  return translated;
}
