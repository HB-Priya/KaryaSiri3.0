const express = require('express');
const Profile = require('../models/Profile');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/profile - get my profile
router.get('/', requireAuth, requireRole('candidate'), async (req, res) => {
  const profile = await Profile.findOne({ user: req.user.id });
  res.json({ profile: profile || null });
});

// PUT /api/profile - create or update my profile
router.put('/', requireAuth, requireRole('candidate'), async (req, res) => {
  try {
    const { skills, interests, qualifications, resumeText, disabilities, location, employmentType } = req.body;
    const profile = await Profile.findOneAndUpdate(
      { user: req.user.id },
      {
        user: req.user.id,
        skills: skills || '',
        interests: interests || '',
        qualifications: qualifications || '',
        resumeText: resumeText || '',
        disabilities: Array.isArray(disabilities) ? disabilities : [],
        location: location || '',
        employmentType: employmentType || '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ profile });
  } catch (err) {
    res.status(500).json({ message: 'Could not save profile.', error: err.message });
  }
});

// POST /api/profile/complete-course - mark a skill course complete, add its skills to the profile
router.post('/complete-course', requireAuth, requireRole('candidate'), async (req, res) => {
  try {
    const { courseId, title, skillsGained } = req.body;
    if (!courseId || !title) {
      return res.status(400).json({ message: 'courseId and title are required.' });
    }
    const gained = Array.isArray(skillsGained) ? skillsGained : [];

    let profile = await Profile.findOne({ user: req.user.id });
    if (!profile) {
      profile = new Profile({ user: req.user.id });
    }

    const alreadyDone = profile.completedCourses.some((c) => c.courseId === courseId);
    if (!alreadyDone) {
      profile.completedCourses.push({ courseId, title, skillsGained: gained });

      // Append newly gained skills to the free-text skills field, avoiding obvious duplicates.
      const existingLower = (profile.skills || '').toLowerCase();
      const newSkills = gained.filter((s) => !existingLower.includes(s.toLowerCase()));
      if (newSkills.length) {
        profile.skills = [profile.skills, newSkills.join(', ')].filter(Boolean).join(', ');
      }
      await profile.save();
    }

    res.json({ profile });
  } catch (err) {
    res.status(500).json({ message: 'Could not save course completion.', error: err.message });
  }
});

module.exports = router;
