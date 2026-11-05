import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAnnounce } from '../context/AnnounceContext';
import { useLanguage } from '../context/LanguageContext';
import { useRegisterVoiceCommands } from '../context/VoiceCommandContext';
import { getCommandPatterns } from '../i18n/voiceCommands';
import { useSpeech } from '../hooks/useSpeech';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'candidate', company: '' });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const announce = useAnnounce();
  const { speak } = useSpeech();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const nameRef = useRef(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submitRegister() {
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      const msg = 'Please fill in your name, email and password first.';
      setError(msg);
      announce(msg);
      speak(msg);
      nameRef.current?.focus();
      return;
    }
    try {
      const user = await register(form);
      announce('Account created. Welcome, ' + user.name);
      speak('Account created. Welcome, ' + user.name);
      navigate(user.role === 'employer' ? '/employer' : '/profile');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      setError(msg);
      announce(msg);
      speak(msg);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    submitRegister();
  }

  useRegisterVoiceCommands(
    'register-page',
    [
      {
        patterns: [...getCommandPatterns(lang, 'signup'), 'submit'],
        handler: () => submitRegister(),
      },
    ],
    [form, lang]
  );

  return (
    <main id="main">
      <section className="auth-section register-section">
        <div className="wrap center-form">
          <div className="section-head" style={{ marginBottom: 24 }}>
            <span className="eyebrow-pill">{t('auth.getStarted')}</span>
            <h1 style={{ marginTop: 16 }}>{t('auth.createAccount')}</h1>
          </div>
          <form className="panel" onSubmit={handleSubmit} noValidate>
            <fieldset>
              <legend>{t('auth.iAmA')}</legend>
              <div className="role-grid">
                <label className="role-card">
                  <input type="radio" name="role" checked={form.role === 'candidate'} onChange={() => update('role', 'candidate')} />
                  {t('auth.jobSeeker')}
                </label>
                <label className="role-card">
                  <input type="radio" name="role" checked={form.role === 'employer'} onChange={() => update('role', 'employer')} />
                  {t('auth.employer')}
                </label>
              </div>
            </fieldset>

            <div className="field">
              <label htmlFor="name">{t('auth.fullName')} <span className="req-mark">*</span></label>
              <input ref={nameRef} id="name" type="text" required value={form.name} onChange={(e) => update('name', e.target.value)} />
            </div>

            {form.role === 'employer' && (
              <div className="field">
                <label htmlFor="company">{t('auth.companyName')}</label>
                <input id="company" type="text" value={form.company} onChange={(e) => update('company', e.target.value)} />
              </div>
            )}

            <div className="field">
              <label htmlFor="email">{t('auth.email')} <span className="req-mark">*</span></label>
              <input id="email" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>

            <div className="field">
              <label htmlFor="password">{t('auth.password')} <span className="req-mark">*</span></label>
              <input id="password" type="password" required minLength={6} value={form.password} onChange={(e) => update('password', e.target.value)} />
              <div className="hint">{t('auth.passwordHint')}</div>
            </div>

            {error && <p className="error-text" role="alert">{error}</p>}

            <button type="submit" className="btn btn-primary">{t('auth.createAccountBtn')}</button>
          </form>
          <p className="muted" style={{ marginTop: 16 }}>
            {t('auth.alreadyHaveAccount')} <Link to="/login">{t('auth.logIn')}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
