const mongoose = require('mongoose');

const DISABILITY_TYPES = [
  'visual',
  'hearing',
  'mobility',
  'speech',
  'cognitive',
  'learning',
  'psychosocial',
  'chronic',
  'other',
  'none',
];

const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    skills: { type: String, default: '' },
    interests: { type: String, default: '' },
    qualifications: { type: String, default: '' },
    resumeText: { type: String, default: '' },
    disabilities: [{ type: String, enum: DISABILITY_TYPES }],
    location: { type: String, default: '' },
    employmentType: { type: String, default: '' },

    // --- Extended real-world dataset fields (from bulk candidate import) ---
    externalCandidateId: { type: String, index: true, sparse: true, unique: true },
    source: { type: String, default: 'manual' }, // 'manual' | 'seed-import'
    age: { type: Number },
    gender: { type: String, default: '' },
    state: { type: String, default: '' },
    city: { type: String, default: '' },
    sector: { type: String, default: '' },
    preferredJobRole: { type: String, default: '' },
    yearsOfExperience: { type: Number, default: 0 },
    preferredWorkMode: { type: String, default: '' }, // Remote / On-site / Hybrid
    accessibilityNeeds: { type: String, default: '' },
    expectedSalaryINR: { type: String, default: '' },
    willingToRelocate: { type: Boolean, default: false },
    digitalLiteracy: { type: String, default: '' },
    vocationalTraining: { type: String, default: '' },

    completedCourses: [
      {
        courseId: { type: String, required: true },
        title: { type: String, required: true },
        skillsGained: [{ type: String }],
        completedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Profile', profileSchema);
module.exports.DISABILITY_TYPES = DISABILITY_TYPES;
