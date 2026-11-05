import { useLanguage } from '../context/LanguageContext';
import { useTranslatedTexts } from '../hooks/useTranslatedText';
import Reveal from '../components/Reveal';
import { categoryColor } from '../utils/categoryColor';

const SCHEMES = [
  {
    title: 'ADIP Scheme',
    category: 'Equipment',
    description: 'Assistance to Disabled Persons for purchase or fitting of aids and appliances — hearing aids, wheelchairs, calipers and more.',
    eligibility: 'Any Indian citizen with 40% or more disability and monthly income not exceeding ₹30,000.',
    link: 'https://depwd.gov.in/en/adip/',
  },
  {
    title: 'NDFDC Concessional Loans',
    category: 'Financial',
    description: 'Concessional-interest loans from the National Divyangjan Finance and Development Corporation (formerly NHFDC) to start or grow a self-employment activity.',
    eligibility: 'Persons with disability seeking to start a business, pursue higher studies, or grow a small enterprise.',
    link: 'https://ndfdc.nic.in/',
  },
  {
    title: 'UDID Card (Unique Disability ID)',
    category: 'Identification',
    description: 'A single national ID and database for persons with disabilities — used to access benefits, reservations and services across India.',
    eligibility: 'All persons with disabilities in India.',
    link: 'https://www.swavlambancard.gov.in/',
  },
  {
    title: 'PM-DAKSH Yojana',
    category: 'Skilling',
    description: 'Free skill development and training scheme for marginalised groups, including persons with disabilities, to improve employability.',
    eligibility: 'Youth with disabilities seeking free skill training and placement support.',
    link: 'https://pmdaksh.depwd.gov.in/',
  },
  {
    title: 'Deendayal Disabled Rehabilitation Scheme (DDRS)',
    category: 'Rehabilitation',
    description: 'Grants-in-aid to NGOs for education, vocational training and rehabilitation services for persons with disabilities.',
    eligibility: 'Delivered through registered NGOs — see the scheme page for supported organisations near you.',
    link: 'https://depwd.gov.in/en/ddrs/',
  },
  {
    title: 'Accessible India Campaign (Sugamya Bharat Abhiyan)',
    category: 'Accessibility',
    description: 'National campaign to make public buildings, transport and digital services accessible to persons with disabilities.',
    eligibility: 'Open initiative — report inaccessible public infrastructure or track accessibility progress in your city.',
    link: 'https://depwd.gov.in/en/accessible-india-campaign/',
  },
  {
    title: 'National Career Service (NCS)',
    category: 'Employment',
    description: 'Government job portal with free non-formal vocational training and job listings, including a dedicated track for persons with disabilities.',
    eligibility: 'Any job seeker registering for employment support — free of cost, no fee at any stage.',
    link: 'https://www.ncs.gov.in/',
  },
  {
    title: 'PM-DAKSH Job Aggregator',
    category: 'Employment',
    description: 'Official government job-matching portal under PM-DAKSH-DEPwD — vacancies are geo-tagged by employers and job aggregators including Amazon and Youth4Jobs, matched to your UDID profile.',
    eligibility: 'Persons with disabilities with a valid or in-progress UDID registration.',
    link: 'https://pmdaksh.depwd.gov.in/JobAggregator/Home',
  },
  {
    title: 'Youth4Jobs / SwarajAbility',
    category: 'Employment',
    description: "South Asia's largest disability-employment organisation — free skilling, training centres, and the SwarajAbility job portal connecting candidates directly with 1,400+ inclusive employers.",
    eligibility: 'Any person with a disability seeking jobs, training or livelihood support — filter jobs by disability type or qualification.',
    link: 'https://youth4jobs.org/',
  },
  {
    title: 'Divyang Career',
    category: 'Employment',
    description: 'A dedicated job board connecting disabled job seekers directly with employers across IT, sales, accounts, healthcare, data science and more, with built-in accessibility tools on the site itself.',
    eligibility: 'Open to any job seeker with a disability — create a free candidate profile and browse live vacancies.',
    link: 'https://divyangcareer.com/',
  },
  {
    title: 'Atypical Advantage',
    category: 'Employment',
    description: "India's largest livelihood platform for persons with disabilities — 50,000+ registered candidates connected to full-time, part-time and freelance roles with employers including Amazon, Mahindra, Unilever and Accenture, plus a free upskilling academy.",
    eligibility: 'Open to any person with a disability seeking full-time, part-time or freelance work — create a free talent profile to get started.',
    link: 'https://atypicaladvantage.in/find-a-job',
  },
  {
    title: 'AICTE Saksham Scholarship Scheme',
    category: 'Education',
    description: 'Financial assistance for specially-abled students pursuing technical diploma or degree courses at AICTE-approved institutions — ₹50,000 per year toward course fees, books, equipment and other study costs.',
    eligibility: '40% or more disability, family income up to ₹8 lakh/year, admitted to a diploma or degree programme at an AICTE-approved institution. Apply through the National Scholarship Portal.',
    link: 'https://www.aicte-india.org/schemes/students-development-schemes/Saksham',
  },
  {
    title: 'Indus Towers Scholarship Program',
    category: 'Education',
    description: 'CSR scholarship covering course fees for disabled students aged 14-40 — vocational/skill courses, competitive-exam coaching, higher secondary, diploma, graduation or postgraduation, up to ₹75,000 depending on course length.',
    eligibility: '40% or more benchmark disability, passed Class 10 with 45%+ marks, family income up to ₹8 lakh/year (BPL/EWS). Source: Buddy4Study, implemented by Shishu Sarothi.',
    link: 'https://www.buddy4study.com/scholarship/indus-towers-scholarship-program',
  },
];

export default function Schemes() {
  const { t } = useLanguage();
  // One batched translation call per language for all 12 scheme
  // descriptions/eligibility blurbs, instead of one call per card.
  const descriptions = useTranslatedTexts(SCHEMES.map((s) => s.description));
  const eligibilities = useTranslatedTexts(SCHEMES.map((s) => s.eligibility));

  return (
    <main id="main">
      <section>
        <div className="wrap">
          <div className="page-hero-banner">
            <img src="/images/student-campus.jpg" alt="A young woman in a wheelchair holding books on a college campus" />
            <div className="page-hero-banner-overlay">
              <span className="eyebrow-pill">🏛 {t('schemes.eyebrow')}</span>
              <h2 style={{ margin: '10px 0 6px', textTransform: 'uppercase' }}>
                {t('schemes.title1')} <span className="accent-italic">{t('schemes.title2')}</span>
              </h2>
              <p>{t('schemes.lead')}</p>
            </div>
          </div>

          <div className="job-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {SCHEMES.map((s, i) => {
              const color = categoryColor(s.category);
              return (
                <Reveal as="article" className={`job-card card-accent-${color}`} delay={Math.min(i, 8) * 60} key={s.title}>
                  <div className="job-top">
                    <div>
                      <span className={`job-cat job-cat-${color}`}>{t('schemeCategories.' + s.category)}</span>
                      <h3 className="job-title">{s.title}</h3>
                    </div>
                  </div>
                  <p>{descriptions[i]}</p>
                  <div className="panel" style={{ padding: 16, background: 'var(--paper)', boxShadow: 'none', border: '1px solid var(--line)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--teal-dark)', marginBottom: 6, fontWeight: 700 }}>
                      ✓ {t('schemes.eligibility')}
                    </div>
                    <p style={{ fontSize: '.88rem', margin: 0 }}>{eligibilities[i]}</p>
                  </div>
                  <div className="job-actions">
                    <a className="btn btn-primary btn-sm" href={s.link} target="_blank" rel="noopener noreferrer">
                      {t('schemes.verifyApply')} ↗
                    </a>
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
