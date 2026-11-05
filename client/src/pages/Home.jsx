import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useLanguage } from '../context/LanguageContext';
import Reveal from '../components/Reveal';
import SloganTicker from '../components/SloganTicker';
import { useCountUp } from '../hooks/useCountUp';

const GALLERY = [
  { src: '/images/tailoring-workshop.jpg', alt: 'A trainer helps a young woman learn tailoring on a sewing machine, with other trainees watching' },
  { src: '/images/community-circle.jpg', alt: 'A group of boys sitting together and smiling during a community session' },
  { src: '/images/holi-celebration.jpg', alt: 'Two boys in wheelchairs laughing together, covered in colourful Holi powder' },
  { src: '/images/gardening-jobs.jpg', alt: 'Two men smiling while potting plants together outdoors' },
];

function StatNumber({ value, suffix = '' }) {
  const animated = useCountUp(value);
  return <b>{typeof animated === 'number' ? animated : value}{suffix}</b>;
}

export default function Home() {
  const [jobCount, setJobCount] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    api.get('/jobs').then((res) => setJobCount(res.data.jobs.length)).catch(() => {});
  }, []);

  return (
    <main id="main">
      <SloganTicker />

      <section className="hero">
        <span className="hero-blob blob-a" aria-hidden="true" />
        <span className="hero-blob blob-b" aria-hidden="true" />
        <span className="hero-blob blob-c" aria-hidden="true" />
        <div className="wrap hero-inner">
          <div>
            <span className="eyebrow">{t('hero.eyebrow')}</span>
            <h1>{t('hero.title1')}<br /><span className="accent-italic">{t('hero.title2')}</span>.</h1>
            <p className="lead">{t('hero.lead')}</p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary">{t('hero.ctaProfile')}</Link>
              <Link to="/jobs" className="btn btn-secondary">{t('hero.ctaJobs')}</Link>
            </div>
            <div className="hero-actions" style={{ marginTop: 0 }}>
              <Link to="/schemes" className="btn btn-ghost btn-sm">🏛 {t('nav.schemes')}</Link>
              <Link to="/courses" className="btn btn-ghost btn-sm">📚 {t('nav.courses')}</Link>
            </div>
            <div className="hero-stats">
              <div className="stat"><StatNumber value={jobCount === null ? '—' : jobCount} /><span>{t('hero.statJobs')}</span></div>
              <div className="stat"><StatNumber value={8} /><span>{t('hero.statCategories')}</span></div>
              <div className="stat"><StatNumber value={100} suffix="%" /><span>{t('hero.statScreenReader')}</span></div>
            </div>
          </div>
          <div className="hero-photo-col">
            <div className="hero-photo">
              <img src="/images/counseling-desk.jpg" alt="A career counsellor who uses a wheelchair meets with young job seekers at her desk" />
              <div className="hero-photo-caption">{t('homeFeatures.heroCaption')}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-band">
        <div className="wrap stats-band-grid">
          <Reveal className="stats-band-item" delay={0}>
            <StatNumber value={10000} suffix="+" />
            <span>{t('statsBand.stat1Label')}</span>
          </Reveal>
          <Reveal className="stats-band-item" delay={90}>
            <StatNumber value={9} />
            <span>{t('statsBand.stat2Label')}</span>
          </Reveal>
          <Reveal className="stats-band-item" delay={180}>
            <b>24/7</b>
            <span>{t('statsBand.stat3Label')}</span>
          </Reveal>
        </div>
      </section>

      <section className="tint-teal" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <div className="wrap">
          <div className="feature-row">
            <Reveal className="feature-row-item" delay={0}>
              <span className="icon-tile icon-tile-gold" aria-hidden="true">🔊</span>
              <div>
                <strong>{t('homeFeatures.screenReaderTitle')}</strong>
                <p>{t('homeFeatures.screenReaderDesc')}</p>
              </div>
            </Reveal>
            <Reveal className="feature-row-item" delay={80}>
              <span className="icon-tile icon-tile-teal" aria-hidden="true">🎙</span>
              <div>
                <strong>{t('homeFeatures.voiceTitle')}</strong>
                <p>{t('homeFeatures.voiceDesc')}</p>
              </div>
            </Reveal>
            <Reveal className="feature-row-item" delay={160}>
              <span className="icon-tile icon-tile-violet" aria-hidden="true">🌐</span>
              <div>
                <strong>{t('homeFeatures.languagesTitle')}</strong>
                <p>{t('homeFeatures.languagesDesc')}</p>
              </div>
            </Reveal>
            <Reveal className="feature-row-item" delay={240}>
              <span className="icon-tile icon-tile-sun" aria-hidden="true">🏛</span>
              <div>
                <strong>{t('homeFeatures.schemesTitle')}</strong>
                <p>{t('homeFeatures.schemesDesc')}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow-pill">{t('how.eyebrow')}</span>
            <h2 style={{ marginTop: 16 }}>{t('how.title')}</h2>
          </div>
          <div className="steps">
            <Reveal as="div" className="step-card" delay={0}>
              <span className="step-num">01</span>
              <h3>{t('how.step1Title')}</h3>
              <p>{t('how.step1Desc')}</p>
            </Reveal>
            <Reveal as="div" className="step-card" delay={90}>
              <span className="step-num">02</span>
              <h3>{t('how.step2Title')}</h3>
              <p>{t('how.step2Desc')}</p>
            </Reveal>
            <Reveal as="div" className="step-card" delay={180}>
              <span className="step-num">03</span>
              <h3>{t('how.step3Title')}</h3>
              <p>{t('how.step3Desc')}</p>
            </Reveal>
            <Reveal as="div" className="step-card" delay={270}>
              <span className="step-num">04</span>
              <h3>{t('how.step4Title')}</h3>
              <p>{t('how.step4Desc')}</p>
            </Reveal>
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--paper)' }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow-pill">{t('voices.eyebrow')}</span>
            <h2 style={{ marginTop: 16 }}>{t('voices.title')}</h2>
          </div>
          <div className="voice-grid">
            <Reveal as="div" className="voice-card" delay={0}>
              <div className="voice-quote-mark" aria-hidden="true">“</div>
              <p className="voice-text">{t('voices.voice1Quote')}</p>
              <div className="voice-person">
                <span className="voice-avatar" aria-hidden="true">{t('voices.voice1Name')[0]}</span>
                <div>
                  <strong>{t('voices.voice1Name')}</strong>
                  <span>{t('voices.voice1Role')}</span>
                </div>
              </div>
            </Reveal>
            <Reveal as="div" className="voice-card" delay={90}>
              <div className="voice-quote-mark" aria-hidden="true">“</div>
              <p className="voice-text">{t('voices.voice2Quote')}</p>
              <div className="voice-person">
                <span className="voice-avatar" aria-hidden="true">{t('voices.voice2Name')[0]}</span>
                <div>
                  <strong>{t('voices.voice2Name')}</strong>
                  <span>{t('voices.voice2Role')}</span>
                </div>
              </div>
            </Reveal>
            <Reveal as="div" className="voice-card" delay={180}>
              <div className="voice-quote-mark" aria-hidden="true">“</div>
              <p className="voice-text">{t('voices.voice3Quote')}</p>
              <div className="voice-person">
                <span className="voice-avatar" aria-hidden="true">{t('voices.voice3Name')[0]}</span>
                <div>
                  <strong>{t('voices.voice3Name')}</strong>
                  <span>{t('voices.voice3Role')}</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="tint-sun">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow-pill">{t('homeFeatures.galleryEyebrow')}</span>
            <h2 style={{ marginTop: 16 }}>{t('homeFeatures.galleryTitle')}</h2>
            <p>{t('homeFeatures.galleryLead')}</p>
          </div>
          <div className="photo-grid">
            {GALLERY.map((g, i) => (
              <Reveal as="div" className="photo-grid-item" delay={i * 90} key={g.src}>
                <img src={g.src} alt={g.alt} loading="lazy" />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <Reveal as="div" className="cta-band">
            <h2>{t('closingCta.title')}</h2>
            <p>{t('closingCta.lead')}</p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary">{t('hero.ctaProfile')}</Link>
              <Link to="/jobs" className="btn btn-secondary">{t('hero.ctaJobs')}</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}