import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useLanguage } from '../context/LanguageContext';

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const statusLabel = {
    submitted: t('employerPage.statusSubmitted'),
    reviewed: t('employerPage.statusReviewed'),
    shortlisted: t('employerPage.statusShortlisted'),
    rejected: t('employerPage.statusRejected'),
  };

  useEffect(() => {
    api.get('/applications/me').then((res) => setApplications(res.data.applications)).finally(() => setLoading(false));
  }, []);

  return (
    <main id="main">
      <section>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow-pill">{t('applicationsPage.trackProgress')}</span>
            <h1 style={{ marginTop: 16 }}>{t('applicationsPage.myApplications')}</h1>
          </div>
          {loading && <p>{t('common.loading')}</p>}
          {!loading && applications.length === 0 && (
            <p>{t('applicationsPage.noApplicationsYet')} <Link to="/jobs">{t('jobsPage.browseJobs')}</Link></p>
          )}
          {applications.length > 0 && (
            <div className="panel">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>{t('applicationsPage.job')}</th><th>{t('applicationsPage.company')}</th>
                    <th>{t('applicationsPage.match')}</th><th>{t('applicationsPage.status')}</th>
                    <th>{t('applicationsPage.applied')}</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((a) => (
                    <tr key={a._id}>
                      <td>{a.job ? <Link to={`/jobs/${a.job._id}`}>{a.job.title}</Link> : 'Job removed'}</td>
                      <td>{a.job?.company || '—'}</td>
                      <td>{a.matchScore != null ? `${a.matchScore}%` : '—'}</td>
                      <td><span className={`badge-outline status-pill-${a.status}`}>{statusLabel[a.status] || a.status}</span></td>
                      <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
