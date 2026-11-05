# Karyasiri — setup guide

This is your original project — **same frontend, same UI/UX, nothing visual changed** — with four feature sets already wired in underneath:

1. **Bulk candidate data** — 10,000 real candidates (5,000 disabled + 5,000 non-disabled) importable into MongoDB as real accounts, instead of a couple of hand-made test users.
2. **Translation** — Tamil, Telugu, Kannada, Malayalam, Konkani, via a free/keyless API, covering both the static UI and dynamic content (job descriptions, scheme text).
3. **"Hey buddy" wake-word voice assistant** — hands-free voice commands for blind/low-vision users, on top of the existing click-to-talk voice command system.
4. **Homepage visual refresh** — see below; this one *does* change the look, on purpose, per feedback that the site read as too plain/white.

## ⚠️ First: about your original .env files

Your uploaded project's `server/.env` contained a **real Anthropic API key**. I did not include your original `.env` files in this package — I generated fresh ones with safe local defaults and a newly-generated `JWT_SECRET`, with `GEMINI_API_KEY`, `BHASHINI_USER_ID` and `BHASHINI_API_KEY` left blank for you to fill in yourself.

**Because that Anthropic key was uploaded into this chat, treat it as exposed:** go to https://console.anthropic.com and revoke/regenerate it, even though this project no longer uses Anthropic at all (see below) — any credential that's left a private environment should be rotated regardless of whether you're still using it.

## Why the mentor chatbot now uses Google Gemini instead of Claude/Anthropic

Anthropic's API requires a paid account with a credit card on file — there's no free tier for direct API access. Google Gemini does have a genuine free tier for text generation (no card required), so the Career Mentor chatbot has been switched over to it. Get a key at https://aistudio.google.com (sign in with any Google account, click "Get API key") — nothing to pay, nothing to wait for approval on.

## 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

`server/package.json` now includes two new dependencies beyond the original project: `xlsx` (reads the candidate spreadsheets) and `undici` (lets the translation script use a proxy if your network needs one). Nothing new on the client side.

## 2. Fill in `server/.env`

Already created for you with safe defaults. Open it and fill in:
- `GEMINI_API_KEY` — free, from https://aistudio.google.com (see above), if you want the Career Mentor chatbot to work.
- `BHASHINI_USER_ID` and `BHASHINI_API_KEY` — from your approved Bhashini account (My Profile > generate API key at bhashini.gov.in).

`MONGO_URI` assumes a local MongoDB on the default port. Change it if you're using MongoDB Atlas or a different host.

## 3. Seed the database

```bash
cd server
npm run seed              # your original 13 sample jobs
npm run seed:candidates   # the 10,000 real candidates (takes a few minutes)
```

`seed:candidates` is safe to re-run — it skips candidates already imported. See the "Logging in as an imported candidate" section below.

## 4. (Optional, one-time) Generate Kannada/Malayalam/Konkani UI text

Your Hindi/Tamil/Telugu/Bengali/Marathi UI text is hand-written and already in the project. Kannada/Malayalam/Konkani are machine-translated instead — run this once:

```bash
cd server
npm run translate:ui
```

This can take a few minutes (it deliberately paces its requests to be polite to the free translation API). If it fails with a network error, it'll now tell you *why* (see the troubleshooting note below) instead of just "fetch failed".

## 5. Run it

```bash
# terminal 1
cd server && npm run dev      # or: npm start
# terminal 2
cd client && npm run dev
```

Visit the client URL Vite prints (usually http://localhost:5173).

---

## Logging in as an imported candidate

Every imported candidate gets a deterministic login:
- Email: `<candidate_id lowercased>@karyasiri.import`, e.g. `pwd00001@karyasiri.import` or `npd00003@karyasiri.import` (`Candidate_ID` values run `PWD00001`–`PWD05000` for disabled candidates, `NPD00001`–`NPD05000` for non-disabled — visible in the source spreadsheets under `server/data/candidates/`).
- Password: `Karyasiri@123` (override by setting `SEED_CANDIDATE_PASSWORD` in `server/.env` *before* running `seed:candidates`).

## Using the new features

- **Language switcher** (top bar) now includes ಕನ್ನಡ / മലയാളം / कोंकणी once you've run `translate:ui`. Job descriptions and government scheme cards translate live in any of the 5 South Indian languages the first time they're viewed, then stay cached.
- **Career Mentor chatbot** now runs on Google Gemini (free tier) instead of Anthropic, and also replies natively in Kannada/Malayalam/Konkani.
- **👂 wake-word button**, next to the existing 🎙 voice-command button: turn it on, then say **"hey buddy"** from anywhere on the site, followed by a command (e.g. *"hey buddy, read this job"*, *"hey buddy, apply for cashier"*). Off by default; the on/off state is remembered per browser.

## If translation fails with a network error

Node's `fetch` sometimes reports a generic **"fetch failed"** that hides the real cause. This version prints a specific diagnosis instead. Isolate it directly with:

```bash
node -e "fetch('https://dhruva-api.bhashini.gov.in/services/inference/pipeline').then(r=>console.log(r.status)).catch(e=>console.log(e))"
```

- If this fails too, it's almost always **antivirus HTTPS scanning** (common with Avast/AVG/Kaspersky/Bitdefender — your browser trusts its certificate, Node correctly doesn't) or a **proxy/VPN** Node isn't using automatically. Try disabling HTTPS scanning temporarily, or set `HTTPS_PROXY` before running the command if you're on a school/office network — this project auto-detects and uses that variable now.
- If you see a Bhashini-specific error naming a missing service/language pair, that means your approved pipeline doesn't have that language configured — the error will name exactly which pairing is unsupported.

## What's new, file by file

```
server/
  models/Profile.js          extended with real-candidate fields (age, sector, salary, etc.)
  seed/seedCandidates.js     imports the 10,000-candidate spreadsheets into MongoDB
  data/candidates/*.xlsx     the two source spreadsheets
  utils/translate.js         Bhashini translation API wrapper
  routes/translate.js        POST /api/translate (dynamic content)
  routes/mentor.js           chatbot now runs on Google Gemini (free tier), replies in kn/ml/gom too
  scripts/generateUiTranslations.js   one-time static-UI translator
  package.json               + xlsx, + undici, − @anthropic-ai/sdk

client/src/
  hooks/useWakeWord.js           always-on "hey buddy" listener
  hooks/useTranslatedText.js     live-translates dynamic content, with caching
  components/AccessBar.jsx       adds the 👂 wake-word toggle
  i18n/translations.js           + kn/ml/gom as language options, wake-word strings
  i18n/voiceCommands.js          + speech-recognition language tags for kn/ml/gom
  pages/JobDetail.jsx            description now translated + read aloud in-language
  pages/Schemes.jsx              descriptions/eligibility now translated
```

Nothing about the page layouts, styling, components' visual design, or navigation structure was touched — same frontend and UI/UX as your original upload, throughout.

## Homepage and site-wide visual refresh

Feedback was that the site felt plain — too much white, too few colors and components. That was structurally true: nearly every section on every page used one of two nearly-identical off-white backgrounds, category labels were plain mono text, and status badges were inconsistently colored between pages. This pass covers the **whole site**, not just the homepage:

**A real color system**, not just decoration — two new accent colors (`--violet`, `--sun`) added to the existing navy/gold/teal/coral, assigned *meaningfully*:
- **Teal** = candidate/job-seeker side (profile builder page background, login form accent)
- **Violet** = employer side (employer dashboard background, job-posting card accent, register form's employer role card)
- **Gold** = primary actions and register form accent
- **Sun** (marigold) = courses/learning, celebratory moments
- **Coral** = alerts/rejection only, unchanged

**Category colors carry real information** — job/scheme/course categories now render as colored pills (`utils/categoryColor.js` deterministically maps any category name to one of the 5 accent colors, so "IT" is always the same color everywhere), instead of identical flat mono-text labels regardless of type. Each card also gets a matching colored top border.

**Page by page:**
- **Home** — stats band (navy), tinted feature/testimonial/gallery sections, closing CTA band (see previous note below for detail).
- **Jobs / Job Detail** — colored category pill and matching card accent border.
- **Schemes / Courses** — same category-color treatment applied to their own category taxonomies.
- **Login / Register** — soft two-tone tinted backdrop instead of plain white; the role picker on Register is now two selectable colored cards (teal/violet) instead of two plain radio rows, since that's the first real decision on the page.
- **Profile Builder** — soft teal-tinted page, colored accent on the support-needs section.
- **My Applications** — status pills now colored (submitted/reviewed/shortlisted/rejected), matching the colors already used on the employer dashboard for the same statuses — previously these were plain grey everywhere on this page.
- **Employer Dashboard** — soft violet-tinted page, violet accent on the job-posting form and each posted-job card.
- Nav, footer, and the underlying form/table/button mechanics are untouched.

High-contrast mode and reduced-motion support were extended to cover every new color and component, not just the ones from the first pass.

I still have no browser in this environment, so — same as before — please actually look at it running. I verified correctness (every file parses, every new CSS class is defined and used consistently, colors are assigned by meaning rather than randomly) but not appearance. Tell me specifically what still looks off and I'll fix that exact thing.
