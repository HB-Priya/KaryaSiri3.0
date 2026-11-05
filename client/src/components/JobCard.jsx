import { Link } from 'react-router-dom';
import MatchMeter from './MatchMeter';
import { useSpeech } from '../hooks/useSpeech';
import { useAnnounce } from '../context/AnnounceContext';
import { useLanguage } from '../context/LanguageContext';
import { categoryColor } from '../utils/categoryColor';

export default function JobCard({ job }) {
  const { speak } = useSpeech();
  const announce = useAnnounce();
  const { t } = useLanguage();
  const color = categoryColor(job.category);

  function listen() {
    speak(`${job.title} at ${job.company}, in ${job.location}. ${job.description}`);
    announce('Reading job description');
  }

  return (
    <article className={`job-card card-accent-${color}`}>
      <div className="job-top">
        <div>
          <span className={`job-cat job-cat-${color}`}>{t('jobCategories.' + job.category) || job.category}</span>
          <h3 className="job-title">{job.title}</h3>
          <div className="job-meta">{job.company} • {job.location} • {job.type}</div>
        </div>
        {typeof job.matchScore === 'number' && <MatchMeter pct={job.matchScore} />}
      </div>
      <p>{job.description}</p>
      <div className="tag-row">
        {(job.accommodations || []).map((a) => (
          <span className="tag" key={a}>{t('accommodations.' + a)}</span>
        ))}
      </div>
      <div className="job-actions">
        <Link className="btn btn-teal btn-sm" to={`/jobs/${job._id}`}>{t('jobsPage.viewApply')}</Link>
        <button type="button" className="btn btn-ghost btn-sm" onClick={listen}>🔊 {t('common.listen')}</button>
      </div>
    </article>
  );
}
