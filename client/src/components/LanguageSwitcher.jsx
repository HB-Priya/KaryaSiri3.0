import { useLanguage } from '../context/LanguageContext';
import { useAnnounce } from '../context/AnnounceContext';

export default function LanguageSwitcher() {
  const { lang, setLang, languages, t } = useLanguage();
  const announce = useAnnounce();

  function handleChange(e) {
    const code = e.target.value;
    setLang(code);
    const label = languages.find((l) => l.code === code)?.label || code;
    announce('Language changed to ' + label);
  }

  return (
    <div className="access-group">
      <label htmlFor="langSelect" className="access-label" style={{ marginRight: 2 }}>
        {t('common.language')}:
      </label>
      <select
        id="langSelect"
        className="lang-select"
        value={lang}
        onChange={handleChange}
        aria-label="Choose language"
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}
