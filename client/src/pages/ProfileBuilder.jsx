import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import MicButton from '../components/MicButton';
import { useAnnounce } from '../context/AnnounceContext';
import { useLanguage } from '../context/LanguageContext';
import { useRegisterVoiceCommands } from '../context/VoiceCommandContext';
import { getCommandPatterns } from '../i18n/voiceCommands';
import { useSpeech } from '../hooks/useSpeech';

const DISABILITY_KEYS = ['visual', 'hearing', 'mobility', 'speech', 'cognitive', 'chronic', 'other', 'none'];

export default function ProfileBuilder() {
  const [form, setForm] = useState({
    skills: '', interests: '', qualifications: '', resumeText: '',
    disabilities: [], location: '', employmentType: '',
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const announce = useAnnounce();
  const { speak } = useSpeech();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/profile').then((res) => {
      if (res.data.profile) {
        const p = res.data.profile;
        setForm({
          skills: p.skills || '', interests: p.interests || '', qualifications: p.qualifications || '',
          resumeText: p.resumeText || '', disabilities: p.disabilities || [],
          location: p.location || '', employmentType: p.employmentType || '',
        });
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function toggleDisability(value) {
    setForm((f) => ({
      ...f,
      disabilities: f.disabilities.includes(value)
        ? f.disabilities.filter((d) => d !== value)
        : [...f.disabilities, value],
    }));
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await api.put('/profile', form);
      const msg = 'Profile saved. Taking you to your matches.';
      announce(msg);
      speak(msg);
      navigate('/jobs?tab=matches');
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not save profile.';
      announce(msg);
      speak(msg);
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    saveProfile();
  }

  // Voice commands specific to this page.
  useRegisterVoiceCommands(
    'profile-builder',
    [
      {
        patterns: getCommandPatterns(lang, 'save'),
        handler: () => saveProfile(),
      },
    ],
    [form, saving, lang]
  );

  if (!loaded) return <main id="main"><div className="wrap" style={{ padding: '60px 0' }}>{t('common.loading')}</div></main>;

  return (
    <main id="main">
      <section className="profile-section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow-pill">{t('profile.stepOne')}</span>
            <h1 style={{ marginTop: 16 }}>{t('profile.buildProfile')}</h1>
            <p>{t('profile.micHint')}</p>
          </div>

          <form className="builder" onSubmit={handleSubmit}>
            <div>
              <div className="field">
                <label htmlFor="skills">{t('profile.skills')}</label>
                <div className="hint">{t('profile.skillsHint')}</div>
                <div className="input-row">
                  <textarea id="skills" value={form.skills} onChange={(e) => update('skills', e.target.value)} />
                  <MicButton value={form.skills} setValue={(fn) => update('skills', fn(form.skills))} label="Dictate skills" />
                </div>
              </div>

              <div className="field">
                <label htmlFor="interests">{t('profile.interests')}</label>
                <div className="input-row">
                  <textarea id="interests" placeholder={t('profile.interestsPlaceholder')} value={form.interests} onChange={(e) => update('interests', e.target.value)} />
                  <MicButton value={form.interests} setValue={(fn) => update('interests', fn(form.interests))} label="Dictate interests" />
                </div>
              </div>

              <div className="field">
                <label htmlFor="qual">{t('profile.qualifications')}</label>
                <div className="input-row">
                  <textarea id="qual" placeholder={t('profile.qualificationsPlaceholder')} value={form.qualifications} onChange={(e) => update('qualifications', e.target.value)} />
                  <MicButton value={form.qualifications} setValue={(fn) => update('qualifications', fn(form.qualifications))} label="Dictate qualifications" />
                </div>
              </div>

              <div className="field">
                <label htmlFor="resume">{t('profile.resume')}</label>
                <div className="input-row">
                  <textarea id="resume" placeholder={t('profile.resumePlaceholder')} value={form.resumeText} onChange={(e) => update('resumeText', e.target.value)} />
                  <MicButton value={form.resumeText} setValue={(fn) => update('resumeText', fn(form.resumeText))} label="Dictate resume" />
                </div>
              </div>
            </div>

            <div>
              <fieldset>
                <legend>{t('profile.disabilityNeeds')}</legend>
                <div className="hint" style={{ marginBottom: 8 }}>{t('profile.disabilityHint')}</div>
                <div className="check-grid">
                  {DISABILITY_KEYS.map((key) => (
                    <label className="check-item" key={key}>
                      <input
                        type="checkbox"
                        checked={form.disabilities.includes(key)}
                        onChange={() => toggleDisability(key)}
                      />
                      {t('disabilities.' + key)}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="field">
                <label htmlFor="location">{t('profile.location')}</label>
                <input id="location" type="text" placeholder={t('profile.locationPlaceholder')} value={form.location} onChange={(e) => update('location', e.target.value)} />
              </div>

              <div className="field">
                <label htmlFor="employ">{t('profile.employmentType')}</label>
                <select id="employ" value={form.employmentType} onChange={(e) => update('employmentType', e.target.value)}>
                  <option value="">{t('profile.noPreference')}</option>
                  <option>{t('profile.fullTime')}</option>
                  <option>{t('profile.partTime')}</option>
                  <option>{t('profile.remote')}</option>
                  <option>{t('profile.trainee')}</option>
                </select>
              </div>

              <div className="field full-span" style={{ marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t('profile.saving') : t('profile.findMatches')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
