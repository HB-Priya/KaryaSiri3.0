const express = require('express');
const Job = require('../models/Job');
const Profile = require('../models/Profile');
const { requireAuth, requireRole } = require('../middleware/auth');
const { computeMatch } = require('../utils/matching');

const router = express.Router();

// GET /api/jobs?category=IT - public list, newest first
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.category && req.query.category !== 'all') {
    filter.category = req.query.category;
  }
  const jobs = await Job.find(filter).sort({ createdAt: -1 });
  res.json({ jobs });
});

// GET /api/jobs/matches - candidate's jobs sorted by match score (protected)
router.get('/matches', requireAuth, requireRole('candidate'), async (req, res) => {
  const profile = await Profile.findOne({ user: req.user.id });
  if (!profile) {
    return res.status(400).json({ message: 'Build your profile first to see matches.' });
  }
  const jobs = await Job.find().sort({ createdAt: -1 });
  const scored = jobs.map((j) => ({
    ...j.toObject(),
    matchScore: computeMatch(profile, j),
  }));
  scored.sort((a, b) => b.matchScore - a.matchScore);
  res.json({ jobs: scored, topMatch: scored[0] || null });
});

// GET /api/jobs/:id
router.get('/:id', async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ message: 'Job not found.' });
  res.json({ job });
});

// POST /api/jobs - employer posts a job (protected)
router.post('/', requireAuth, requireRole('employer'), async (req, res) => {
  try {
    const { title, company, category, location, type, description, requiredSkills, accommodations } = req.body;
    if (!title || !category || !description) {
      return res.status(400).json({ message: 'Title, category and description are required.' });
    }
    const job = await Job.create({
      title,
      company: company || req.user.name,
      category,
      location: location || 'Not specified',
      type: type || 'Full-time',
      description,
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : String(requiredSkills || '').split(',').map(s => s.trim()).filter(Boolean),
      accommodations: Array.isArray(accommodations) ? accommodations : [],
      postedBy: req.user.id,
    });
    res.status(201).json({ job });
  } catch (err) {
    res.status(500).json({ message: 'Could not post job.', error: err.message });
  }
});

// GET /api/jobs/employer/mine - employer's own postings
router.get('/employer/mine', requireAuth, requireRole('employer'), async (req, res) => {
  const jobs = await Job.find({ postedBy: req.user.id }).sort({ createdAt: -1 });
  res.json({ jobs });
});

module.exports = router;
