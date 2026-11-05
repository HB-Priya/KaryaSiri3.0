import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import MicButton from '../components/MicButton';
import { useAuth } from '../context/AuthContext';
import { useAnnounce } from '../context/AnnounceContext';
import { useSpeech } from '../hooks/useSpeech';
import { useLanguage } from '../context/LanguageContext';
import { useTranslatedText } from '../hooks/useTranslatedText';
import { useRegisterVoiceCommands } from '../context/VoiceCommandContext';
import { getCommandPatterns } from '../i18n/voiceCommands';
import { categoryColor } from '../utils/categoryColor';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const announce = useAnnounce();
  const { speak, speaking } = useSpeech();
  const { t, lang } = useLanguage();
  const nameInputRef = useRef(null);

  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: '', message: '' });
  const [submitError, setSubmitError] = useState('');
  const translatedDescription = useTranslatedText(job?.description || '');

  useEffect(() => {
    api.get(`/jobs/${id}`).then((res) => setJob(res.data.job)).catch(() => setError('Job not found.'));
  }, [id]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function readAloud() {
    speak(`${job.title} at ${job.company}. ${translatedDescription}`);
    announce('Reading job description aloud');
  }

  // Core submission logic, usable both from the form's onSubmit and from a
  // voice command — neither needs a DOM event.
  async function submitApplication() {
    setSubmitError('');
    if (!user) {
      navigate('/login');
      announce('Please log in as a job seeker first, then come back to apply.');
      return;
    }
    if (user.role !== 'candidate') {
      const msg = 'Only job-seeker accounts can apply. Log in as a candidate.';
      setSubmitError(msg);
      announce(msg);
      return;
    }
    if (!form.name.trim() || !form.email.trim()) {
      const msg = 'Please fill in your name and email before submitting.';
      setSubmitError(msg);
      announce(msg);
      speak(msg);
      nameInputRef.current?.focus();
      return;
    }
    try {
      await api.post('/applications', { jobId: id, ...form });
      setSubmitted(true);
      const msg = `Application submitted for ${job.title}. Thank you, ${form.name}. We will contact you at ${form.email}.`;
      announce(msg);
      speak(msg);
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not submit application.';
      setSubmitError(msg);
      announce(msg);
      speak(msg);
    }
  }

  function handleApply(e) {
    e.preventDefault();
    submitApplication();
  }

  // Voice commands specific to this page — take priority over the global
  // navigation commands while this page is open. Patterns are localized to
  // the current UI language (with English always available as a fallback).
  useRegisterVoiceCommands(
    'job-detail',
    [
      {
        patterns: getCommandPatterns(lang, 'apply'),
        handler: () => {
          if (submitted) {
            announce('You already submitted this application.');
            speak('You already submitted this application.');
            return;
          }
          nameInputRef.current?.focus();
          nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const msg = 'Application form focused. Say "submit application" when ready, or use the microphone buttons next to each field to dictate your answers.';
          announce(msg);
          speak(msg);
        },
      },
      {
        patterns: getCommandPatterns(lang, 'submit'),
        handler: () => submitApplication(),
      },
      {
        patterns: getCommandPatterns(lang, 'readJob'),
        handler: () => readAloud(),
      },
    ],
    [job, form, submitted, user, lang, translatedDescription]
  );

  if (error) return <main id="main"><div className="wrap" style={{ padding: '60px 0' }}>{error} <Link to="/jobs">Back to jobs</Link></div></main>;
  if (!job) return <main id="main"><div className="wrap" style={{ padding: '60px 0' }}>{t('common.loading')}</div></main>;

  return (
    <main id="main">
      <section>
        <div className="wrap two-col">
          <div>
            <span className={`job-cat job-cat-${categoryColor(job.category)}`}>{t('jobCategories.' + job.category)}</span>
            <h1>{job.title}</h1>
            <p className="job-meta">{job.company} • {job.location} • {job.type}</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={readAloud}>
              {speaking ? `🔊 ${t('jobDetail.reading')}` : `🔊 ${t('jobDetail.readAloud')}`}
            </button>
            <p style={{ marginTop: 16 }}>{translatedDescription}</p>
            <div className="tag-row">
              {(job.accommodations || []).map((a) => <span className="tag" key={a}>{t('accommodations.' + a)}</span>)}
            </div>
          </div>

          <div className={`panel card-accent-${categoryColor(job.category)}`}>
            <h2>{t('jobDetail.applyForRole')}</h2>
            {submitted ? (
              <div className="notice" role="status">
                Thanks, {form.name}! Your application for <strong>{job.title}</strong> has been submitted.
                We'll reach out at {form.email}. <Link to="/applications">{t('jobDetail.viewApplications')}</Link>
              </div>
            ) : (
              <form onSubmit={handleApply}>
                <div className="field">
                  <label htmlFor="aName">{t('jobDetail.fullName')} <span className="req-mark">*</span></label>
                  <input ref={nameInputRef} id="aName" type="text" required value={form.name} onChange={(e) => update('name', e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="aEmail">{t('jobDetail.email')} <span className="req-mark">*</span></label>
                  <input id="aEmail" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="aPhone">{t('jobDetail.phone')}</label>
                  <input id="aPhone" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="aMessage">{t('jobDetail.coverMessage')}</label>
                  <div className="input-row">
                    <textarea
                      id="aMessage"
                      placeholder={t('jobDetail.coverPlaceholder')}
                      value={form.message}
                      onChange={(e) => update('message', e.target.value)}
                    />
                    <MicButton value={form.message} setValue={(fn) => update('message', fn(form.message))} label="Dictate cover message" />
                  </div>
                </div>
                {submitError && <p className="error-text" role="alert">{submitError}</p>}
                {!user && <p className="hint">{t('jobDetail.loginToApply')}</p>}
                <button type="submit" className="btn btn-primary">{t('jobDetail.submitApplication')}</button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
