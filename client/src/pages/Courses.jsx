import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useAnnounce } from '../context/AnnounceContext';
import { useSpeech } from '../hooks/useSpeech';
import Reveal from '../components/Reveal';
import { categoryColor } from '../utils/categoryColor';

const COURSES = [
  {
    id: 'bcc-nielit',
    title: 'Basic Computer Course (BCC)',
    provider: 'NIELIT / Govt of India',
    duration: '36 hours',
    category: 'Digital Literacy',
    link: 'https://www.nielit.gov.in/content/digital-literacy-courses',
    skillsGained: ['computer basics', 'digital literacy', 'typing'],
  },
  {
    id: 'tailor-pmkvy',
    title: 'Self-Employed Tailor',
    provider: 'Skill India Digital Hub (PMKVY)',
    duration: '14 weeks',
    category: 'Tailoring',
    link: 'https://courses.skillindiadigital.gov.in/courses/',
    skillsGained: ['tailoring', 'sewing', 'garment making'],
  },
  {
    id: 'cooking-hunar',
    title: 'Basic Cooking & Catering',
    provider: 'Skill India Digital Hub (PMKVY)',
    duration: '6 weeks',
    category: 'Cooking',
    link: 'https://courses.skillindiadigital.gov.in/courses/',
    skillsGained: ['cooking', 'food preparation', 'kitchen hygiene'],
  },
  {
    id: 'retail-pmkvy',
    title: 'Retail Sales Associate',
    provider: 'Skill India Digital Hub (PMKVY)',
    duration: '8 weeks',
    category: 'Retail',
    link: 'https://courses.skillindiadigital.gov.in/courses/',
    skillsGained: ['retail', 'sales', 'customer service'],
  },
  {
    id: 'financial-literacy',
    title: 'Financial Literacy Program',
    provider: 'NCFE / RBI',
    duration: 'Self-paced',
    category: 'Finance',
    link: 'https://ncfe.org.in/',
    skillsGained: ['financial literacy', 'budgeting', 'banking basics'],
  },
  {
    id: 'handicrafts-nios',
    title: 'Handicrafts & Handloom',
    provider: 'NIOS Vocational',
    duration: '6 months',
    category: 'Handicrafts',
    link: 'https://voc.nios.ac.in/',
    skillsGained: ['handicrafts', 'handloom weaving', 'craftsmanship'],
  },
  {
    id: 'spoken-english-swayam',
    title: 'Spoken English & Communication',
    provider: 'SWAYAM / CEC',
    duration: '12 weeks',
    category: 'Communication',
    link: 'https://swayam.gov.in/explorer',
    skillsGained: ['spoken english', 'communication'],
  },
  {
    id: 'data-entry-nielit',
    title: 'Data Entry & Office Assistant',
    provider: 'NIELIT',
    duration: '10 weeks',
    category: 'Office Skills',
    link: 'https://www.nielit.gov.in/content/digital-literacy-courses',
    skillsGained: ['data entry', 'excel', 'office assistant'],
  },
  {
    id: 'electrical-nsdc',
    title: 'Basic Electrical & Electronics Repair',
    provider: 'Skill India Digital Hub (NSDC)',
    duration: '12 weeks',
    category: 'Technical',
    link: 'https://courses.skillindiadigital.gov.in/courses/',
    skillsGained: ['electrical repair', 'electronics'],
  },
  {
    id: 'beauty-wellness',
    title: 'Beauty & Wellness',
    provider: 'Skill India Digital Hub (PMKVY)',
    duration: '8 weeks',
    category: 'Wellness',
    link: 'https://courses.skillindiadigital.gov.in/courses/',
    skillsGained: ['beauty services', 'wellness'],
  },
  {
    id: 'atypical-upskill',
    title: 'Atypical Upskill Academy',
    provider: 'Atypical Advantage',
    duration: 'Self-paced',
    category: 'Office Skills',
    link: 'https://atypicaladvantage.in/upksill',
    skillsGained: ['workplace readiness', 'digital skills', 'communication'],
  },
];

export default function Courses() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const announce = useAnnounce();
  const { speak } = useSpeech();
  const navigate = useNavigate();
  const [completedIds, setCompletedIds] = useState([]);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (user?.role === 'candidate') {
      api.get('/profile').then((res) => {
        const ids = (res.data.profile?.completedCourses || []).map((c) => c.courseId);
        setCompletedIds(ids);
      }).catch(() => {});
    }
  }, [user]);

  async function markComplete(course) {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'candidate') return;
    setBusyId(course.id);
    try {
      const res = await api.post('/profile/complete-course', {
        courseId: course.id,
        title: course.title,
        skillsGained: course.skillsGained,
      });
      const ids = (res.data.profile?.completedCourses || []).map((c) => c.courseId);
      setCompletedIds(ids);
      const msg = `${course.title} marked complete. ${course.skillsGained.join(', ')} added to your skills.`;
      announce(msg);
      speak(msg);
    } catch (err) {
      announce(err.response?.data?.message || 'Could not mark course complete.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main id="main">
      <section>
        <div className="wrap">
          <div className="page-hero-banner">
            <img src="/images/tailoring-workshop.jpg" alt="A trainer helping a young woman learn tailoring on a sewing machine, with classmates watching" />
            <div className="page-hero-banner-overlay">
              <span className="eyebrow-pill">📚 {t('courses.eyebrow')}</span>
              <h2 style={{ margin: '10px 0 6px', textTransform: 'uppercase' }}>
                {t('courses.title1')} <span className="accent-italic">{t('courses.title2')}</span>
              </h2>
              <p>{t('courses.lead')}</p>
            </div>
          </div>
          {(!user || user.role !== 'candidate') && (
            <p className="hint" style={{ marginBottom: 24 }}>{t('courses.loginPrompt')}</p>
          )}

          <div className="job-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {COURSES.map((course, i) => {
              const isComplete = completedIds.includes(course.id);
              const color = categoryColor(course.category);
              return (
                <Reveal as="article" className={`job-card card-accent-${color}`} delay={Math.min(i, 8) * 60} key={course.id}>
                  <div className="job-top">
                    <div>
                      <span className={`job-cat job-cat-${color}`}>{t('courseCategories.' + course.category)}</span>
                      <h3 className="job-title">{course.title}</h3>
                      <div className="job-meta">{course.provider} • {course.duration}</div>
                    </div>
                    {isComplete && <span className="badge">✓ {t('courses.completed')}</span>}
                  </div>
                  <div className="tag-row">
                    <span style={{ fontSize: '.72rem', color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em' }}>
                      {t('courses.skillsGained')}:
                    </span>
                  </div>
                  <div className="tag-row">
                    {course.skillsGained.map((s) => <span className="tag" key={s}>{s}</span>)}
                  </div>
                  <div className="job-actions">
                    <a className="btn btn-teal btn-sm" href={course.link} target="_blank" rel="noopener noreferrer">
                      {t('common.apply')} ↗
                    </a>
                    {user?.role === 'candidate' && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={isComplete || busyId === course.id}
                        onClick={() => markComplete(course)}
                      >
                        {isComplete ? `✓ ${t('courses.completed')}` : t('courses.markComplete')}
                      </button>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
