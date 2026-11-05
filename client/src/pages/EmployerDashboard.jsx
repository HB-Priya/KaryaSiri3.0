import { useEffect, useState } from 'react';
import api from '../api';
import { useAnnounce } from '../context/AnnounceContext';
import { useLanguage } from '../context/LanguageContext';

const CATEGORIES = ['IT', 'Retail', 'Textile', 'Accounting', 'Cleaning', 'Customer Service', 'Warehouse', 'Design'];
const ACCOMMODATION_VALUES = ['wheelchair', 'screenreader', 'remote', 'flexible', 'signlanguage', 'ergonomic', 'training'];

const STATUS_BADGE_CLASS = {
  submitted: 'badge-outline',
  reviewed: 'badge-outline status-reviewed',
  shortlisted: 'badge status-shortlisted',
  rejected: 'badge-outline status-rejected',
};

export default function EmployerDashboard() {
  const [form, setForm] = useState({
    title: '', company: '', category: 'IT', location: '', type: 'Full-time',
    description: '', requiredSkills: '', accommodations: [],
  });
  const [myJobs, setMyJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [expandedAppId, setExpandedAppId] = useState(null);
  const [candidateDetails, setCandidateDetails] = useState({}); // appId -> {profile, user}
  const [loadingDetail, setLoadingDetail] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const announce = useAnnounce();
  const { t } = useLanguage();

  function loadMyJobs() {
    api.get('/jobs/employer/mine').then((res) => setMyJobs(res.data.jobs));
  }
  useEffect(loadMyJobs, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function toggleAcc(value) {
    setForm((f) => ({
      ...f,
      accommodations: f.accommodations.includes(value)
        ? f.accommodations.filter((a) => a !== value)
        : [...f.accommodations, value],
    }));
  }

  async function handlePost(e) {
    e.preventDefault();
    try {
      await api.post('/jobs', form);
      announce(`Job posted: ${form.title}`);
      setForm({ title: '', company: '', category: 'IT', location: '', type: 'Full-time', description: '', requiredSkills: '', accommodations: [] });
      loadMyJobs();
    } catch (err) {
      announce(err.response?.data?.message || 'Could not post job.');
    }
  }

  function viewApplicants(jobId) {
    setSelectedJobId(jobId);
    setExpandedAppId(null);
    api.get(`/applications/job/${jobId}`).then((res) => setApplicants(res.data.applications));
  }

  function toggleCandidateDetail(app) {
    if (expandedAppId === app._id) {
      setExpandedAppId(null);
      return;
    }
    setExpandedAppId(app._id);
    if (!candidateDetails[app._id]) {
      setLoadingDetail(app._id);
      api.get(`/applications/${app._id}/candidate`).then((res) => {
        setCandidateDetails((prev) => ({ ...prev, [app._id]: res.data }));
      }).catch(() => {
        announce('Could not load candidate profile.');
      }).finally(() => setLoadingDetail(null));
    }
  }

  async function setStatus(app, status) {
    setUpdatingId(app._id);
    try {
      const res = await api.put(`/applications/${app._id}/status`, { status });
      setApplicants((prev) => prev.map((a) => (a._id === app._id ? { ...a, status: res.data.application.status } : a)));
      announce(`${app.name} marked as ${status}.`);
    } catch (err) {
      announce(err.response?.data?.message || 'Could not update status.');
    } finally {
      setUpdatingId(null);
    }
  }

  const statusLabel = {
    submitted: t('employerPage.statusSubmitted'),
    reviewed: t('employerPage.statusReviewed'),
    shortlisted: t('employerPage.statusShortlisted'),
    rejected: t('employerPage.statusRejected'),
  };

  return (
    <main id="main">
      <section className="employer-section">
        <div className="wrap two-col">
          <div>
            <span className="eyebrow-pill">{t('employerPage.forEmployers')}</span>
            <h1 style={{ marginTop: 16 }}>{t('employerPage.postRole')}</h1>
            <p>{t('employerPage.postRoleDesc')}</p>
            <form className="panel card-accent-violet" onSubmit={handlePost}>
              <div className="field">
                <label htmlFor="eTitle">{t('employerPage.jobTitle')} <span className="req-mark">*</span></label>
                <input id="eTitle" type="text" required value={form.title} onChange={(e) => update('title', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="eCompany">{t('employerPage.companyName')}</label>
                <input id="eCompany" type="text" value={form.company} onChange={(e) => update('company', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="eCategory">{t('employerPage.category')}</label>
                <select id="eCategory" value={form.category} onChange={(e) => update('category', e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{t('jobCategories.' + c)}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="eLocation">{t('employerPage.location')}</label>
                <input id="eLocation" type="text" value={form.location} onChange={(e) => update('location', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="eDesc">{t('employerPage.description')}</label>
                <textarea id="eDesc" value={form.description} onChange={(e) => update('description', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="eSkills">{t('employerPage.requiredSkills')}</label>
                <input id="eSkills" type="text" placeholder="excel, customer service, data entry" value={form.requiredSkills} onChange={(e) => update('requiredSkills', e.target.value)} />
              </div>
              <fieldset>
                <legend>{t('employerPage.accommodationsOffered')}</legend>
                <div className="check-grid">
                  {ACCOMMODATION_VALUES.map((v) => (
                    <label className="check-item" key={v}>
                      <input type="checkbox" checked={form.accommodations.includes(v)} onChange={() => toggleAcc(v)} />
                      {t('accommodations.' + v)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button type="submit" className="btn btn-primary">{t('employerPage.postJob')}</button>
            </form>
          </div>

          <div>
            <h2>{t('employerPage.yourPostings')}</h2>
            {myJobs.length === 0 && <p>{t('employerPage.noPostings')}</p>}
            {myJobs.map((j) => (
              <div className="card card-accent-violet" key={j._id} style={{ marginBottom: 16 }}>
                <h3 style={{ marginBottom: 4 }}>{j.title}</h3>
                <p className="job-meta">{j.location} • {j.type}</p>
                <button className="btn btn-ghost btn-sm" onClick={() => viewApplicants(j._id)}>{t('employerPage.viewApplicants')}</button>
                {selectedJobId === j._id && (
                  <div style={{ marginTop: 14 }}>
                    {applicants.length === 0 && <p className="muted">{t('employerPage.noApplicants')}</p>}
                    {applicants.map((a) => {
                      const detail = candidateDetails[a._id];
                      const isExpanded = expandedAppId === a._id;
                      return (
                        <div className="applicant-card" key={a._id}>
                          <div className="applicant-top">
                            <div>
                              <strong>{a.name}</strong>
                              <span className={STATUS_BADGE_CLASS[a.status] || 'badge-outline'} style={{ marginLeft: 8 }}>
                                {statusLabel[a.status] || a.status}
                              </span>
                              <div className="job-meta">{a.email}{a.phone ? ` • ${a.phone}` : ''}</div>
                            </div>
                            <div className="applicant-match">
                              {a.matchScore != null ? `${a.matchScore}%` : '—'}
                            </div>
                          </div>

                          {a.message && <p style={{ fontSize: '.88rem', marginTop: 8 }}>{a.message}</p>}

                          <div className="applicant-actions">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => toggleCandidateDetail(a)}
                            >
                              {isExpanded ? t('employerPage.hideProfile') : t('employerPage.viewProfile')}
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={updatingId === a._id || a.status === 'shortlisted'}
                              onClick={() => setStatus(a, 'shortlisted')}
                            >
                              {t('employerPage.shortlist')}
                            </button>
                            <button
                              type="button"
                              className="btn btn-teal btn-sm"
                              disabled={updatingId === a._id || a.status === 'reviewed'}
                              onClick={() => setStatus(a, 'reviewed')}
                            >
                              {t('employerPage.markReviewed')}
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              disabled={updatingId === a._id || a.status === 'rejected'}
                              onClick={() => setStatus(a, 'rejected')}
                            >
                              {t('employerPage.reject')}
                            </button>
                            {a.status !== 'submitted' && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                disabled={updatingId === a._id}
                                onClick={() => setStatus(a, 'submitted')}
                              >
                                {t('employerPage.resetStatus')}
                              </button>
                            )}
                          </div>

                          {isExpanded && (
                            <div className="candidate-detail">
                              {loadingDetail === a._id && <p className="muted">{t('common.loading')}</p>}
                              {detail && !detail.profile && <p className="muted">{t('employerPage.notProvided')}</p>}
                              {detail && detail.profile && (
                                <>
                                  <div className="field">
                                    <strong>{t('profile.skills')}:</strong> {detail.profile.skills || t('employerPage.notProvided')}
                                  </div>
                                  <div className="field">
                                    <strong>{t('profile.interests')}:</strong> {detail.profile.interests || t('employerPage.notProvided')}
                                  </div>
                                  <div className="field">
                                    <strong>{t('profile.qualifications')}:</strong> {detail.profile.qualifications || t('employerPage.notProvided')}
                                  </div>
                                  <div className="field">
                                    <strong>{t('profile.disabilityNeeds')}:</strong> {(detail.profile.disabilities || []).join(', ') || t('employerPage.notProvided')}
                                  </div>
                                  <div className="field">
                                    <strong>{t('employerPage.completedCourses')}:</strong>{' '}
                                    {(detail.profile.completedCourses || []).length
                                      ? detail.profile.completedCourses.map((c) => c.title).join(', ')
                                      : t('employerPage.noCoursesYet')}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
