import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAnnounce } from '../context/AnnounceContext';
import { useLanguage } from '../context/LanguageContext';
import { useRegisterVoiceCommands } from '../context/VoiceCommandContext';
import { getCommandPatterns } from '../i18n/voiceCommands';
import { useSpeech } from '../hooks/useSpeech';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const announce = useAnnounce();
  const { speak } = useSpeech();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const emailRef = useRef(null);

  async function submitLogin() {
    setError('');
    if (!email.trim() || !password.trim()) {
      const msg = 'Please fill in your email and password first.';
      setError(msg);
      announce(msg);
      speak(msg);
      emailRef.current?.focus();
      return;
    }
    try {
      const user = await login(email, password);
      announce('Logged in. Welcome back, ' + user.name);
      speak('Logged in. Welcome back, ' + user.name);
      navigate(user.role === 'employer' ? '/employer' : '/jobs');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed.';
      setError(msg);
      announce(msg);
      speak(msg);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    submitLogin();
  }

  useRegisterVoiceCommands(
    'login-page',
    [
      {
        patterns: [...getCommandPatterns(lang, 'login'), 'submit'],
        handler: () => submitLogin(),
      },
    ],
    [email, password, lang]
  );

  return (
    <main id="main">
      <section className="auth-section">
        <div className="wrap center-form">
          <div className="section-head" style={{ marginBottom: 24 }}>
            <span className="eyebrow-pill">{t('auth.welcomeBack')}</span>
            <h1 style={{ marginTop: 16 }}>{t('auth.loginTitle')}</h1>
          </div>
          <form className="panel" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">{t('auth.email')} <span className="req-mark">*</span></label>
              <input ref={emailRef} id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="password">{t('auth.password')} <span className="req-mark">*</span></label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="error-text" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary">{t('auth.logIn')}</button>
          </form>
          <p className="muted" style={{ marginTop: 16 }}>
            {t('auth.noAccount')} <Link to="/register">{t('auth.signUp')}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
