import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { TRANSLATIONS, LANGUAGES } from '../i18n/translations';

const LanguageContext = createContext(null);

function getNested(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

// Only languages listed in LANGUAGES are valid. A user who previously chose a
// language that has since been removed (e.g. Bengali, Marathi, Konkani) would
// otherwise be stuck with a dropdown showing the wrong option and an
// unsupported code being sent to the speech engine and the mentor API.
const isSupported = (code) => LANGUAGES.some((l) => l.code === code);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem('karyasiri_lang');
    return isSupported(saved) ? saved : 'en';
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem('karyasiri_lang', lang);
  }, [lang]);

  const setLang = useCallback((code) => {
    setLangState(isSupported(code) ? code : 'en');
  }, []);

  const t = useCallback(
    (key, vars) => {
      const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
      let value = getNested(dict, key);
      if (value === undefined) value = getNested(TRANSLATIONS.en, key) || key;
      if (vars && typeof value === 'string') {
        Object.entries(vars).forEach(([k, v]) => {
          value = value.replace(new RegExp('\\{' + k + '\\}', 'g'), v);
        });
      }
      return value;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t, languages: LANGUAGES }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}