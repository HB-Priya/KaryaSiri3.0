// Condensed reference data the mentor chatbot is grounded on, so it names
// real schemes/courses that actually exist on this site (and their real
// links) instead of inventing plausible-sounding ones. Keep this in sync
// with client/src/pages/Schemes.jsx and client/src/pages/Courses.jsx when
// those change.

const SCHEMES = [
  { title: 'ADIP Scheme', category: 'Equipment', link: 'https://depwd.gov.in/en/adip/', note: 'Aids and appliances (hearing aids, wheelchairs, calipers) for those with 40%+ disability, income under ₹30,000/month.' },
  { title: 'NDFDC Concessional Loans', category: 'Financial', link: 'https://ndfdc.nic.in/', note: 'Low-interest loans to start or grow a business, or pursue higher studies.' },
  { title: 'UDID Card', category: 'Identification', link: 'https://www.swavlambancard.gov.in/', note: 'The national disability ID needed to access most other schemes and reservations.' },
  { title: 'PM-DAKSH Yojana', category: 'Skilling', link: 'https://pmdaksh.depwd.gov.in/', note: 'Free skill training scheme for persons with disabilities, 250+ courses.' },
  { title: 'Deendayal Disabled Rehabilitation Scheme (DDRS)', category: 'Rehabilitation', link: 'https://depwd.gov.in/en/ddrs/', note: 'NGO-delivered education, training and rehabilitation services.' },
  { title: 'Accessible India Campaign (Sugamya Bharat Abhiyan)', category: 'Accessibility', link: 'https://depwd.gov.in/en/accessible-india-campaign/', note: 'Campaign for accessible public buildings, transport, and digital services.' },
  { title: 'National Career Service (NCS)', category: 'Employment', link: 'https://www.ncs.gov.in/', note: 'Free government job portal and vocational training, open to all job seekers.' },
  { title: 'PM-DAKSH Job Aggregator', category: 'Employment', link: 'https://pmdaksh.depwd.gov.in/JobAggregator/Home', note: 'Government job-matching portal; vacancies geo-tagged by employers, requires UDID.' },
  { title: 'Youth4Jobs / SwarajAbility', category: 'Employment', link: 'https://youth4jobs.org/', note: 'Large NGO job portal for PwDs; filter jobs by disability type or qualification.' },
  { title: 'Divyang Career', category: 'Employment', link: 'https://divyangcareer.com/', note: 'Private job board for disabled job seekers across IT, sales, accounts, healthcare.' },
  { title: 'Atypical Advantage', category: 'Employment', link: 'https://atypicaladvantage.in/find-a-job', note: "India's largest livelihood platform for PwDs, 50,000+ candidates, connects to employers like Amazon and Accenture." },
  { title: 'AICTE Saksham Scholarship Scheme', category: 'Education', link: 'https://www.aicte-india.org/schemes/students-development-schemes/Saksham', note: '₹50,000/year for specially-abled students in AICTE-approved technical diploma/degree courses.' },
  { title: 'Indus Towers Scholarship Program', category: 'Education', link: 'https://www.buddy4study.com/scholarship/indus-towers-scholarship-program', note: 'Up to ₹75,000 for disabled students (14-40yo) in vocational, diploma, graduation or PG courses.' },
];

const COURSES = [
  { title: 'Basic Computer Course (BCC)', category: 'Digital Literacy', skillsGained: ['computer basics', 'digital literacy', 'typing'], link: 'https://www.nielit.gov.in/content/digital-literacy-courses' },
  { title: 'Self-Employed Tailor', category: 'Tailoring', skillsGained: ['tailoring', 'sewing', 'garment making'], link: 'https://courses.skillindiadigital.gov.in/courses/' },
  { title: 'Basic Cooking & Catering', category: 'Cooking', skillsGained: ['cooking', 'food preparation', 'kitchen hygiene'], link: 'https://courses.skillindiadigital.gov.in/courses/' },
  { title: 'Retail Sales Associate', category: 'Retail', skillsGained: ['retail', 'sales', 'customer service'], link: 'https://courses.skillindiadigital.gov.in/courses/' },
  { title: 'Financial Literacy Program', category: 'Finance', skillsGained: ['financial literacy', 'budgeting', 'banking basics'], link: 'https://ncfe.org.in/' },
  { title: 'Handicrafts & Handloom', category: 'Handicrafts', skillsGained: ['handicrafts', 'handloom weaving', 'craftsmanship'], link: 'https://voc.nios.ac.in/' },
  { title: 'Spoken English & Communication', category: 'Communication', skillsGained: ['spoken english', 'communication'], link: 'https://swayam.gov.in/explorer' },
  { title: 'Data Entry & Office Assistant', category: 'Office Skills', skillsGained: ['data entry', 'excel', 'office assistant'], link: 'https://www.nielit.gov.in/content/digital-literacy-courses' },
  { title: 'Basic Electrical & Electronics Repair', category: 'Technical', skillsGained: ['electrical repair', 'electronics'], link: 'https://courses.skillindiadigital.gov.in/courses/' },
  { title: 'Beauty & Wellness', category: 'Wellness', skillsGained: ['beauty services', 'wellness'], link: 'https://courses.skillindiadigital.gov.in/courses/' },
  { title: 'Atypical Upskill Academy', category: 'Office Skills', skillsGained: ['workplace readiness', 'digital skills', 'communication'], link: 'https://atypicaladvantage.in/upksill' },
];

const JOB_CATEGORIES = ['IT', 'Retail', 'Textile', 'Accounting', 'Cleaning', 'Customer Service', 'Warehouse', 'Design'];

const ACCOMMODATION_MEANINGS = {
  wheelchair: 'Wheelchair accessible workplace',
  screenreader: 'Screen-reader compatible systems (good fit for blind/low-vision candidates)',
  remote: 'Remote / work-from-home option',
  flexible: 'Flexible working hours',
  signlanguage: 'A colleague or support available who knows sign language',
  ergonomic: 'Ergonomic workstation/seating',
  training: 'On-the-job training provided, no prior experience required',
};

function formatKnowledgeForPrompt() {
  const schemeLines = SCHEMES.map((s) => `- ${s.title} [${s.category}] — ${s.note} (${s.link})`).join('\n');
  const courseLines = COURSES.map((c) => `- ${c.title} [${c.category}] — teaches: ${c.skillsGained.join(', ')} (${c.link})`).join('\n');
  const accLines = Object.entries(ACCOMMODATION_MEANINGS).map(([k, v]) => `- ${k}: ${v}`).join('\n');

  return `KARYASIRI SCHEMES (real, on the /schemes page):\n${schemeLines}\n\n` +
    `KARYASIRI SKILL COURSES (real, on the /courses page — completing one auto-adds its skills to the candidate's profile):\n${courseLines}\n\n` +
    `JOB CATEGORIES on Karyasiri: ${JOB_CATEGORIES.join(', ')}\n\n` +
    `JOB ACCOMMODATION TAGS and what they mean:\n${accLines}`;
}

module.exports = { SCHEMES, COURSES, JOB_CATEGORIES, ACCOMMODATION_MEANINGS, formatKnowledgeForPrompt };
