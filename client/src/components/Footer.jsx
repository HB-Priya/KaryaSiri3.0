import { useLanguage } from '../context/LanguageContext';
import LogoMark from './LogoMark';

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer>
      <div className="wrap">
        <div>
          <div className="logo" style={{ marginBottom: 8, color: '#fff' }}>
            <LogoMark />
            Karya<span className="accent-italic" style={{ fontStyle: 'normal' }}>siri</span>
          </div>
          <p style={{ color: '#AEB6CC', maxWidth: '40ch' }}>{t('footer.tagline')}</p>
        </div>
        <div>
          <small>{t('footer.note')}</small>
        </div>
      </div>
    </footer>
  );
}
