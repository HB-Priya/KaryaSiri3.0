const express = require('express');
const Application = require('../models/Application');
const Job = require('../models/Job');
const Profile = require('../models/Profile');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');
const { computeMatch } = require('../utils/matching');

const router = express.Router();

const VALID_STATUSES = ['submitted', 'reviewed', 'shortlisted', 'rejected'];

// POST /api/applications - candidate applies to a job
router.post('/', requireAuth, requireRole('candidate'), async (req, res) => {
  try {
    const { jobId, name, email, phone, message } = req.body;
    if (!jobId || !name || !email) {
      return res.status(400).json({ message: 'jobId, name and email are required.' });
    }
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found.' });

    const profile = await Profile.findOne({ user: req.user.id });
    const matchScore = profile ? computeMatch(profile, job) : null;

    const application = await Application.create({
      job: jobId,
      candidate: req.user.id,
      name,
      email,
      phone: phone || '',
      message: message || '',
      matchScore,
    });
    res.status(201).json({ application });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You already applied to this job.' });
    }
    res.status(500).json({ message: 'Could not submit application.', error: err.message });
  }
});

// PUT /api/applications/:id/status - employer updates an applicant's status
// (e.g. shortlist, reject) — this is how an employer actually selects a
// candidate rather than just viewing a static list.
router.put('/:id/status', requireAuth, requireRole('employer'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${VALID_STATUSES.join(', ')}.` });
    }
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found.' });

    const job = await Job.findById(application.job);
    if (!job || String(job.postedBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only update applicants for your own job postings.' });
    }

    application.status = status;
    await application.save();
    res.json({ application });
  } catch (err) {
    res.status(500).json({ message: 'Could not update application status.', error: err.message });
  }
});

// GET /api/applications/:id/candidate - employer views the applicant's full
// profile (skills, qualifications, disabilities, completed courses) so they
// have enough information to actually decide, not just a name and email.
router.get('/:id/candidate', requireAuth, requireRole('employer'), async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found.' });

    const job = await Job.findById(application.job);
    if (!job || String(job.postedBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only view applicants for your own job postings.' });
    }

    const [profile, user] = await Promise.all([
      Profile.findOne({ user: application.candidate }),
      User.findById(application.candidate).select('name email'),
    ]);

    res.json({ profile: profile || null, user: user || null });
  } catch (err) {
    res.status(500).json({ message: 'Could not load candidate profile.', error: err.message });
  }
});

// GET /api/applications/me - candidate's own applications
router.get('/me', requireAuth, requireRole('candidate'), async (req, res) => {
  const applications = await Application.find({ candidate: req.user.id })
    .populate('job')
    .sort({ createdAt: -1 });
  res.json({ applications });
});

// GET /api/applications/job/:jobId - employer view of applicants (only if they own the job)
router.get('/job/:jobId', requireAuth, requireRole('employer'), async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) return res.status(404).json({ message: 'Job not found.' });
  if (String(job.postedBy) !== String(req.user.id)) {
    return res.status(403).json({ message: 'You can only view applicants for your own job postings.' });
  }
  const applications = await Application.find({ job: req.params.jobId })
    .sort({ matchScore: -1, createdAt: -1 });
  res.json({ applications });
});

module.exports = router;
