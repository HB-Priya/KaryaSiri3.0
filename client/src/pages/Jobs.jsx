import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import JobCard from '../components/JobCard';
import Reveal from '../components/Reveal';
import { useAuth } from '../context/AuthContext';
import { useAnnounce } from '../context/AnnounceContext';
import { useLanguage } from '../context/LanguageContext';

const CATEGORIES = ['all', 'IT', 'Retail', 'Textile', 'Accounting', 'Cleaning', 'Customer Service', 'Warehouse', 'Design'];

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const showMatches = searchParams.get('tab') === 'matches';
  const [category, setCategory] = useState('all');
  const [jobs, setJobs] = useState([]);
  const [topMatch, setTopMatch] = useState(null);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const announce = useAnnounce();
  const { t } = useLanguage();

  useEffect(() => {
    async function load() {
      setError('');
      try {
        if (showMatches && user?.role === 'candidate') {
          const res = await api.get('/jobs/matches');
          setJobs(res.data.jobs);
          setTopMatch(res.data.topMatch);
          announce(`Found your matches. Top match: ${res.data.topMatch?.title || 'none'}.`);
        } else {
          const res = await api.get('/jobs', { params: category !== 'all' ? { category } : {} });
          setJobs(res.data.jobs);
          setTopMatch(null);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load jobs.');
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, showMatches, user]);

  const visibleJobs = showMatches
    ? jobs
    : category === 'all' ? jobs : jobs.filter((j) => j.category === category);

  return (
    <main id="main">
      <section>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow-pill">{t('jobsPage.openRoles')}</span>
            <h1 style={{ marginTop: 16 }}>{showMatches ? t('jobsPage.yourMatches') : t('jobsPage.browseJobs')}</h1>
          </div>

          {showMatches && user?.role === 'candidate' && (
            <div className="notice" role="status">
              {topMatch ? (
                <>Your top match is <strong>{topMatch.title}</strong> at {topMatch.company} ({topMatch.matchScore}% match).
                  Jobs below are sorted by match score.</>
              ) : t('jobsPage.noMatches')}
            </div>
          )}
          {showMatches && !user && (
            <div className="notice" role="status">{t('jobsPage.loginForMatches')}</div>
          )}
          {error && <p className="error-text" role="alert">{error}</p>}

          {!showMatches && (
            <div className="filters" role="group" aria-label="Filter jobs by category">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className="chip"
                  aria-pressed={category === c}
                  onClick={() => { setCategory(c); setSearchParams(c === 'all' ? {} : { category: c }); }}
                >
                  {c === 'all' ? t('jobsPage.allCategories') : t('jobCategories.' + c)}
                </button>
              ))}
            </div>
          )}

          <div className="job-grid" aria-label="Job listings">
            {visibleJobs.map((job, i) => (
              <Reveal as="div" delay={Math.min(i, 8) * 60} key={job._id}>
                <JobCard job={job} />
              </Reveal>
            ))}
            {visibleJobs.length === 0 && !error && <p>{t('jobsPage.noJobsFound')}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
