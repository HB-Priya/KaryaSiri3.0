# Karyasiri — MERN job matching platform

Karyasiri matches physically disabled candidates with suitable jobs (IT, retail/grocery,
textile, accounting, cleaning, customer service, warehouse, design, etc.) based on their
skills, interests, qualifications, resume, and stated accessibility needs — with screen-reader
and voice tools built into the interface for blind and low-vision users.

Stack: **M**ongoDB, **E**xpress, **R**eact (Vite), **N**ode.

```
karyasiri/
  server/   Express + Mongoose REST API
  client/   React (Vite) front end
```

## 1. Prerequisites

- Node.js 18+
- A MongoDB database — either local (`mongodb://127.0.0.1:27017`) or a free
  [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

## 2. Backend setup

```bash
cd server
cp .env.example .env
# edit .env: set MONGO_URI and a real JWT_SECRET
npm install
npm run seed     # loads 13 sample jobs into the database
npm run dev       # starts the API on http://localhost:5000 (nodemon)
# or: npm start
```

Health check: `GET http://localhost:5000/api/health`

### API overview

| Method | Route                         | Auth              | Purpose                                  |
|--------|--------------------------------|-------------------|-------------------------------------------|
| POST   | /api/auth/register             | —                 | Create a candidate or employer account    |
| POST   | /api/auth/login                | —                 | Log in, returns JWT                       |
| GET    | /api/auth/me                   | Bearer token       | Current user                              |
| GET    | /api/profile                   | candidate          | Get my profile                            |
| PUT    | /api/profile                   | candidate          | Create/update my profile                  |
| POST   | /api/profile/complete-course    | candidate          | Mark a skill course complete; adds its skills to your profile |
| GET    | /api/jobs                      | —                 | List jobs (optional `?category=`)         |
| GET    | /api/jobs/matches               | candidate          | Jobs scored/sorted against my profile     |
| GET    | /api/jobs/:id                   | —                 | Job detail                                |
| POST   | /api/jobs                       | employer          | Post a job                                |
| GET    | /api/jobs/employer/mine         | employer          | My posted jobs                            |
| POST   | /api/applications                | candidate          | Apply to a job                            |
| GET    | /api/applications/me             | candidate          | My applications                           |
| GET    | /api/applications/job/:jobId     | employer (owner)   | Applicants for one of my jobs             |
| POST   | /api/mentor/chat                 | optional (soft)     | Career Mentor chatbot — personalized if logged in as candidate |

## 3. Frontend setup

```bash
cd client
cp .env.example .env    # VITE_API_URL defaults to http://localhost:5000/api
npm install
npm run dev              # starts on http://localhost:5173
```

Open http://localhost:5173.

## 4. How matching works

`server/utils/matching.js` tokenizes the candidate's skills + interests + qualifications +
resume text and compares it against each job's required skills/description (keyword overlap),
then adds a bonus when the job's stated accommodations line up with the candidate's selected
disability type (e.g. "blind / low vision" boosts jobs tagged `screenreader` or `remote`).
This produces a 0–100 match score used to sort `/api/jobs/matches` and shown as a radial
match meter in the UI. It's intentionally simple and transparent — swap in a smarter model
(embeddings, resume parsing, etc.) later without changing the API shape.

## 5. Career Mentor chatbot (new)

A floating chat widget ("🧑‍🏫 Career Mentor", bottom-right on every page) answers candidate
questions about which government scheme fits them, which skill course to take, how to fill
in their profile or a job application, and which jobs suit them.

- **Backend**: `POST /api/mentor/chat` (`server/routes/mentor.js`) calls the Anthropic API
  server-side — the API key never reaches the browser. It's grounded in
  `server/data/knowledge.js`, a condensed copy of the real schemes/courses shown on the site
  (kept in sync manually with `client/src/pages/Schemes.jsx` / `Courses.jsx`), plus a live
  sample of currently-open jobs pulled from MongoDB, so it names real things instead of
  hallucinating. If the candidate is logged in, their profile (skills, disabilities,
  completed courses) is added to the system prompt for personalized answers; if not, it still
  works and gives general guidance.
- **Setup**: get an API key at console.anthropic.com (paid API — check current pricing there)
  and set `ANTHROPIC_API_KEY` in `server/.env`. Without a key set, the widget doesn't crash —
  the backend returns a clear "not configured yet" message instead. Check
  [docs.claude.com](https://docs.claude.com) for the current recommended model string if you
  want to change `ANTHROPIC_MODEL` from the default.
- **Error handling**: every failure mode (missing key, bad key, rate limit, Anthropic API
  outage, malformed request, network failure) is caught and shown as a friendly inline message
  with a "Try again" button — the chat never throws an unhandled error at the user.
- **Accessibility**: the mic button dictates a question (same speech-to-text used elsewhere on
  the site), each reply has a "🔊 read aloud" button, and the widget responds in whichever of
  the 6 supported languages is currently selected.

## 6. Schemes, courses and multilingual support

- **`/schemes`** — a public page of Indian government schemes for persons with disabilities
  (ADIP, NHFDC loans, UDID card, PM-DAKSH, DDRS, Sugamya Bharat Abhiyan, NCS-PwD portal, etc.).
  Each "Visit official site" button opens the **real government website** in a new tab —
  nothing is faked or proxied.
- **`/courses`** — a public page of free/low-cost skill courses from Indian government
  platforms (NIELIT, PMKVY/Skill India, SWAYAM, NCFE, NIOS, NSDC) covering cooking, tailoring,
  computers, retail, spoken English, electronics, and more. Clicking a course opens the real
  course/provider site in a new tab. Logged-in candidates see a **"Mark as completed"** button;
  marking a course complete calls `POST /api/profile/complete-course`, which records the
  completion on the candidate's profile *and automatically appends that course's skill tags to
  their `skills` field* — so completed courses immediately improve their job match scores.
- **5 Indian languages** — the interface (navigation, hero, how-it-works, footer, schemes,
  courses) can be switched between **English, Hindi, Tamil, Telugu, Bengali and Marathi** via
  the language selector in the access bar. Translations live in
  `client/src/i18n/translations.js`; add more keys/languages there. This is a static UI
  dictionary (no external translation API call, so it works offline and has no per-request
  cost) — extend it with more keys as you translate more of the UI.

## 7. Design system

Restyled to match the reference Karyasiri UI: **Outfit** (display/headings) + **Inter** (body)
fonts, a saffron/forest-green palette (`--gold:#FE6B00`, `--teal:#008166`) evoking the Indian
flag, bold uppercase headlines with an italic accent word, pill-shaped eyebrow badges, and
large rounded cards with soft shadows. All tokens are CSS variables in
`client/src/styles/index.css` — change them there to re-theme the whole app.

## 8. Accessibility features

- Skip-to-content link, semantic HTML, labeled form fields, visible focus states throughout
- Fixed **access bar**: text size (A− / A / A+), high-contrast theme toggle, "read page aloud"
  (Web Speech `SpeechSynthesis`), and a voice-navigation command ("go to jobs", "go to profile")
- **Mic buttons** next to every long text field (skills, interests, qualifications, resume,
  cover message) using `SpeechRecognition` for dictation instead of typing
- "🔊 Listen" on every job card and a "Read job description aloud" button on the job detail /
  apply page
- `aria-live` announcements on key actions (login, profile saved, matches found, application
  submitted)

Voice features (dictation + read aloud) require a Chromium-based browser (Chrome, Edge) with
microphone permission; the rest of the site works in any modern browser.

## 9. Notes / next steps for production

- Passwords are hashed with bcrypt and auth uses JWT — for production, add refresh tokens,
  rate limiting, and HTTPS-only cookies instead of `localStorage` if you want to harden it further.
- Add real resume upload + parsing (PDF/DOCX) instead of pasted text.
- Add server-side validation library (e.g. `zod`/`joi`) and centralized error handling.
- Add pagination to `/api/jobs` once the job count grows.
