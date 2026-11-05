const mongoose = require('mongoose');

const ACCOMMODATIONS = [
  'wheelchair',
  'screenreader',
  'remote',
  'flexible',
  'signlanguage',
  'ergonomic',
  'training',
];

const CATEGORIES = [
  'IT',
  'Retail',
  'Textile',
  'Accounting',
  'Cleaning',
  'Customer Service',
  'Warehouse',
  'Design',
];

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    location: { type: String, default: 'Not specified' },
    type: { type: String, default: 'Full-time' },
    description: { type: String, required: true },
    requiredSkills: [{ type: String }],
    accommodations: [{ type: String, enum: ACCOMMODATIONS }],
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

jobSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Job', jobSchema);
module.exports.ACCOMMODATIONS = ACCOMMODATIONS;
module.exports.CATEGORIES = CATEGORIES;
