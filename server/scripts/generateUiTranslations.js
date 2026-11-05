/**
 * One-off dev script: auto-translates every static UI string (nav labels,
 * buttons, page copy, voice-assistant prompts, etc.) from English into
 * Kannada, Malayalam and Konkani using the Google Cloud Translation API,
 * then writes the result into client/src/i18n/translations.js.
 *
 * Why a script instead of hand-written strings: Tamil/Telugu/Hindi/Bengali/
 * Marathi in that file were hand-authored, but nobody on this project
 * reliably reads/writes Kannada, Malayalam or Konkani, so those three are
 * machine-translated instead of guessed. Same reasoning as the runtime
 * /api/translate route, just run once at build/dev time so the UI itself
 * doesn't pay a translation-API round trip on every render.
 *
 * Usage (from server/):
 *   node scripts/generateUiTranslations.js
 *   node scripts/generateUiTranslations.js --dry-run   # print without writing
 *
 * Requires BHASHINI_USER_ID and BHASHINI_API_KEY in server/.env (same free
 * Bhashini credentials /api/translate uses — see .env.example for how to
 * get them). Re-running this regenerates and overwrites just the kn/ml/gom
 * blocks and the LANGUAGES/TRANSLATIONS exports — the hand-written
 * en/hi/ta/te/bn/mr blocks are left untouched.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { translateBatch } = require('../utils/translate');

const TRANSLATIONS_PATH = path.join(
  __dirname,
  '..',
  '..',
  'client',
  'src',
  'i18n',
  'translations.js'
);

const NEW_LANGUAGES = [
  { code: 'kn', name: 'Kannada', label: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', label: 'മലയാളം' },
  { code: 'gom', name: 'Konkani', label: 'कोंकणी' },
];

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_CHAR_LIMIT = 4000; // stay comfortably under Google's per-request limit

// ---- 1. Load the existing `en` object out of translations.js without ----
// ---- duplicating it by hand: the file is plain ESM object literals, ----
// ---- so strip the `export` keywords and run it as a normal script. ----
function loadEnglishSource() {
  const raw = fs.readFileSync(TRANSLATIONS_PATH, 'utf8');
  const asCommonJs = raw.replace(/export\s+const/g, 'const');
  const sandbox = { module: { exports: {} }, exports: {} };
  vm.createContext(sandbox);
  vm.runInContext(
    asCommonJs + '\nmodule.exports = { en, LANGUAGES, TRANSLATIONS };',
    sandbox,
    { filename: 'translations.js' }
  );
  return { raw, en: sandbox.module.exports.en, existingLanguages: sandbox.module.exports.LANGUAGES };
}

// ---- 2. Flatten { a: { b: 'text' } } -> { 'a.b': 'text' }, and back. ----
function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

function unflatten(flat) {
  const out = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let cursor = out;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) cursor[part] = value;
      else cursor = cursor[part] = cursor[part] || {};
    });
  }
  return out;
}

// ---- 3. Translate a flat string map in size-limited batches. ----
async function translateFlatMap(flatEn, targetCode) {
  const keys = Object.keys(flatEn);
  const values = keys.map((k) => flatEn[k]);
  const translatedValues = new Array(values.length);

  let batchStart = 0;
  while (batchStart < values.length) {
    let batchEnd = batchStart;
    let charCount = 0;
    while (batchEnd < values.length && charCount < BATCH_CHAR_LIMIT) {
      charCount += (values[batchEnd] || '').length + 1;
      batchEnd += 1;
    }
    const batchValues = values.slice(batchStart, batchEnd);
    process.stdout.write(
      `  [${targetCode}] translating ${batchStart + 1}-${batchEnd} of ${values.length}...\r`
    );
    const translated = await translateBatch(batchValues, targetCode, 'en');
    translated.forEach((t, i) => {
      translatedValues[batchStart + i] = t;
    });
    batchStart = batchEnd;
  }
  console.log(`  [${targetCode}] done (${values.length} strings).                          `);

  const flatOut = {};
  keys.forEach((k, i) => {
    flatOut[k] = translatedValues[i];
  });
  return unflatten(flatOut);
}

// ---- 4. Rebuild the file: keep everything before "export const LANGUAGES",
// ---- append freshly generated kn/ml/gom blocks, then a regenerated
// ---- LANGUAGES + TRANSLATIONS export that includes every language found. ----
function buildNewFileContent(raw, existingLanguages, generated) {
  const marker = 'export const LANGUAGES = [';
  const markerIdx = raw.indexOf(marker);
  if (markerIdx === -1) {
    throw new Error('Could not find "export const LANGUAGES = [" in translations.js — file format changed?');
  }
  const existingGeneratedStart = raw.search(/^const (?:kn|ml|gom)(?:Legacy)? = \{/m);
  const head = raw.slice(0, existingGeneratedStart === -1 ? markerIdx : existingGeneratedStart).trimEnd();

  const newBlocks = NEW_LANGUAGES.map(
    ({ code }) => `const ${code} = ${JSON.stringify(generated[code], null, 2)};\n`
  ).join('\n');

  const allLanguages = [
    ...existingLanguages,
    ...NEW_LANGUAGES.filter((nl) => !existingLanguages.some((el) => el.code === nl.code)).map(
      ({ code, label }) => ({ code, label })
    ),
  ];
  const languagesBlock =
    'export const LANGUAGES = [\n' +
    allLanguages.map((l) => `  { code: '${l.code}', label: '${l.label}' },`).join('\n') +
    '\n];\n';

  const allCodes = allLanguages.map((l) => l.code);
  const translationsBlock = `export const TRANSLATIONS = { ${allCodes.join(', ')} };\n`;

  return `${head}\n\n${newBlocks}\n${languagesBlock}\n${translationsBlock}`;
}

async function run() {
  if (!process.env.BHASHINI_USER_ID || !process.env.BHASHINI_API_KEY) {
    console.error(
      'BHASHINI_USER_ID / BHASHINI_API_KEY are not set in server/.env — cannot call the Bhashini API.\n' +
        'Get them from your approved account at https://bhashini.gov.in — "My Profile" > generate API key.'
    );
    process.exit(1);
  }

  console.log('Reading English source strings from', TRANSLATIONS_PATH);
  const { raw, en, existingLanguages } = loadEnglishSource();
  const flatEn = flatten(en);
  const totalChars = Object.values(flatEn).reduce((s, v) => s + (v || '').length, 0);
  console.log(
    `Found ${Object.keys(flatEn).length} strings (${totalChars} characters) to translate into ` +
      `${NEW_LANGUAGES.map((l) => l.name).join(', ')}.`
  );
  console.log(
    `Estimated translation volume: ~${totalChars * NEW_LANGUAGES.length} characters total ` +
      `(Bhashini is free — this is just for your own sense of scale/runtime).`
  );

  const generated = {};
  for (const { code, name } of NEW_LANGUAGES) {
    console.log(`\nTranslating to ${name} (${code})...`);
    generated[code] = await translateFlatMap(flatEn, code);
  }

  const newContent = buildNewFileContent(raw, existingLanguages, generated);

  if (DRY_RUN) {
    console.log('\n--dry-run set: not writing to disk. Preview of one generated block (kn.nav):');
    console.log(JSON.stringify(generated.kn.nav, null, 2));
    return;
  }

  fs.writeFileSync(TRANSLATIONS_PATH, newContent, 'utf8');
  console.log(`\nWrote ${TRANSLATIONS_PATH}`);
  console.log('Kannada, Malayalam and Konkani are now available in the language switcher.');
}

run().catch((err) => {
  console.error('\nFailed:', err.message);
  if (err.cause && err.cause !== err) {
    console.error('Underlying cause:', err.cause.message || err.cause);
  }
  console.error(
    '\nIf this looks like a network/connection problem rather than a translation-language problem, first try ' +
      'this standalone check to isolate it:\n' +
      '  node -e "fetch(\'https://api.mymemory.translated.net/get?q=hi&langpair=en|ta\').then(r=>r.json()).then(console.log).catch(e=>console.log(e))"\n' +
      "If that also fails, it confirms it's your machine/network (firewall, antivirus HTTPS scanning, or a " +
      'proxy/VPN) reaching the API, not this script.'
  );
  process.exit(1);
});
