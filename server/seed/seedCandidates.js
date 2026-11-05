/**
 * Bulk-imports the real Karya Siri candidate datasets (5,000 disabled +
 * 5,000 non-disabled candidates) as real User + Profile documents, so the
 * whole app (login, /api/jobs/matches, employer dashboard, etc.) runs
 * against real data instead of a couple of hand-made test accounts.
 *
 * Usage:
 *   npm run seed:candidates            # load all rows from both files
 *   npm run seed:candidates -- --reset # wipe previously-imported candidates first
 *   npm run seed:candidates -- --limit=500   # only load first 500 rows per file (quick test)
 *
 * Every imported candidate gets:
 *   - email:    <candidate_id>@karyasiri.import   (lowercased, unique, deterministic)
 *   - password: the value of SEED_CANDIDATE_PASSWORD in .env, or "Karyasiri@123" by default
 *   - role:     'candidate'
 * so you (or a demo) can log in as any of them to see real matches.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');

const connectDB = require('../config/db');
const User = require('../models/User');
const Profile = require('../models/Profile');

const DATA_DIR = path.join(__dirname, '..', 'data', 'candidates');
const FILES = [
  'Karya_Siri_5000_Disabled_Candidates.xlsx',
  'Karya_Siri_5000_NonDisabled_Candidates.xlsx',
];

const DEFAULT_PASSWORD = process.env.SEED_CANDIDATE_PASSWORD || 'Karyasiri@123';
const BATCH_SIZE = 500;

// ---- CLI flags -------------------------------------------------------
const args = process.argv.slice(2);
const RESET = args.includes('--reset');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

// ---- Disability_Type (free text) -> Profile.DISABILITY_TYPES enum ----
const DISABILITY_MAP = {
  'none': 'none',
  'visual impairment': 'visual',
  'hearing impairment': 'hearing',
  'mobility impairment': 'mobility',
  'speech impairment': 'speech',
  'cognitive disability': 'cognitive',
  'learning disability': 'learning',
  'psychosocial disability': 'psychosocial',
  'multiple disabilities': 'other',
};

function mapDisability(disabilityStatus, disabilityType) {
  if ((disabilityStatus || '').toLowerCase() === 'no') return ['none'];
  const key = (disabilityType || '').trim().toLowerCase();
  return [DISABILITY_MAP[key] || 'other'];
}

function toBool(val) {
  return (val || '').toString().trim().toLowerCase() === 'yes';
}

function readSheet(filePath) {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

// Turn one spreadsheet row into { userDoc, profileDoc } (profileDoc missing `user` for now).
function rowToDocs(row) {
  const candidateId = String(row.Candidate_ID).trim();
  const email = `${candidateId.toLowerCase()}@karyasiri.import`;
  const name = `Candidate ${candidateId}`;

  const userDoc = {
    name,
    email,
    role: 'candidate',
  };

  const profileDoc = {
    externalCandidateId: candidateId,
    source: 'seed-import',
    age: Number(row.Age) || undefined,
    gender: row.Gender || '',
    state: row.State || '',
    city: row.City || '',
    qualifications: [row.Education, row.Vocational_Training].filter(Boolean).join(' | '),
    disabilities: mapDisability(row.Disability_Status, row.Disability_Type),
    yearsOfExperience: Number(row.Years_of_Experience) || 0,
    preferredJobRole: row.Current_or_Preferred_Job_Role || '',
    interests: row.Current_or_Preferred_Job_Role || '',
    sector: row.Sector || '',
    skills: row.Skills || '',
    preferredWorkMode: row.Preferred_Work_Mode || '',
    employmentType: row.Employment_Type_Preferred || '',
    accessibilityNeeds: row.Accessibility_Needs || '',
    expectedSalaryINR: row.Expected_Salary_INR || '',
    willingToRelocate: toBool(row.Willing_to_Relocate),
    digitalLiteracy: row.Digital_Literacy || '',
    vocationalTraining: row.Vocational_Training || '',
    location: [row.City, row.State].filter(Boolean).join(', '),
  };

  return { userDoc, profileDoc };
}

async function importFile(filePath, passwordHash) {
  console.log(`\nReading ${path.basename(filePath)} ...`);
  let rows = readSheet(filePath);
  if (LIMIT) rows = rows.slice(0, LIMIT);
  console.log(`  ${rows.length} rows to import`);

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const parsed = batch.map(rowToDocs);

    // Skip rows whose candidate already exists (idempotent re-runs without --reset).
    const ids = parsed.map((p) => p.profileDoc.externalCandidateId);
    const existing = await Profile.find({ externalCandidateId: { $in: ids } })
      .select('externalCandidateId')
      .lean();
    const existingSet = new Set(existing.map((e) => e.externalCandidateId));
    const toInsert = parsed.filter((p) => !existingSet.has(p.profileDoc.externalCandidateId));
    skipped += parsed.length - toInsert.length;

    if (toInsert.length === 0) continue;

    const userDocs = toInsert.map((p) => ({ ...p.userDoc, passwordHash }));
    const insertedUsers = await User.insertMany(userDocs, { ordered: false });

    const profileDocs = insertedUsers.map((u, idx) => ({
      ...toInsert[idx].profileDoc,
      user: u._id,
    }));
    await Profile.insertMany(profileDocs, { ordered: false });

    created += insertedUsers.length;
    process.stdout.write(`  ...${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}\r`);
  }

  console.log(`\n  Imported ${created} new candidates, skipped ${skipped} already-imported.`);
  return { created, skipped };
}

async function run() {
  await connectDB();

  if (RESET) {
    console.log('Removing previously-imported (source=seed-import) candidates...');
    const oldProfiles = await Profile.find({ source: 'seed-import' }).select('user').lean();
    const userIds = oldProfiles.map((p) => p.user);
    await Profile.deleteMany({ source: 'seed-import' });
    await User.deleteMany({ _id: { $in: userIds } });
    console.log(`  Removed ${userIds.length} candidates.`);
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let totalCreated = 0;
  let totalSkipped = 0;
  for (const file of FILES) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.error(`  Missing file: ${filePath} - skipping.`);
      continue;
    }
    const { created, skipped } = await importFile(filePath, passwordHash);
    totalCreated += created;
    totalSkipped += skipped;
  }

  console.log(`\nDone. Total imported: ${totalCreated}, total skipped (already present): ${totalSkipped}.`);
  console.log(`All imported candidates share the password: ${DEFAULT_PASSWORD}`);
  console.log(`Example login email: pwd00001@karyasiri.import / npd00001@karyasiri.import`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
