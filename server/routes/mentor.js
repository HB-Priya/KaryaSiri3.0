const express = require('express');
const jwt = require('jsonwebtoken');
const Job = require('../models/Job');
const Profile = require('../models/Profile');
const { formatKnowledgeForPrompt } = require('../data/knowledge');

const router = express.Router();

const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi',
  kn: 'Kannada',
  ml: 'Malayalam',
  te: 'Telugu',
  ta: 'Tamil',
};

const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 2000;

// Google Gemini API — chosen because it has a genuinely free tier (no
// credit card required) for text generation, unlike Anthropic/OpenAI which
// require a paid account to call their APIs directly. Get a free key at
// https://aistudio.google.com (see .env.example for the exact steps).
const GEMINI_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// Soft auth: if a valid Bearer token is present, attach the user id so we
// can personalize; if it's missing or invalid, continue anonymously rather
// than failing the request — the mentor should still work for guests.
function softAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      req.user = null;
    }
  }
  next();
}

router.post('/chat', softAuth, async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({
        message: 'The mentor chat is not set up yet. Add a GEMINI_API_KEY to the server .env file to enable it (free, no card — see .env.example).',
      });
    }

    const { messages, lang } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: 'messages must be a non-empty array.' });
    }
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user' || !lastMsg.content || !lastMsg.content.trim()) {
      return res.status(400).json({ message: 'The last message must be a non-empty user message.' });
    }
    if (lastMsg.content.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ message: `Please keep messages under ${MAX_MESSAGE_LENGTH} characters.` });
    }

    // Trim to a reasonable window, keep only well-formed turns, and map our
    // 'assistant' role to Gemini's 'model' role (its "contents" API expects
    // only 'user'/'model', not 'assistant').
    const trimmed = messages
      .slice(-MAX_HISTORY_MESSAGES)
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));

    if (trimmed.length === 0) {
      return res.status(400).json({ message: 'No valid messages to send.' });
    }

    // Build personalization context if the candidate is logged in and has a profile.
    let profileContext = 'The visitor is not logged in, or has no profile yet — give general guidance and suggest they build a profile at /profile for personalized matches.';
    if (req.user && req.user.role === 'candidate') {
      try {
        const profile = await Profile.findOne({ user: req.user.id });
        if (profile) {
          const disabilities = (profile.disabilities || []).join(', ') || 'not specified';
          const completed = (profile.completedCourses || []).map((c) => c.title).join(', ') || 'none yet';
          profileContext = [
            `Candidate name: ${req.user.name}.`,
            `Skills: ${profile.skills || 'not filled in yet'}.`,
            `Interests: ${profile.interests || 'not filled in yet'}.`,
            `Qualifications: ${profile.qualifications || 'not filled in yet'}.`,
            `Disability/accessibility needs: ${disabilities}.`,
            `Preferred location: ${profile.location || 'not specified'}.`,
            `Completed courses on Karyasiri: ${completed}.`,
          ].join(' ');
        } else {
          profileContext = `Candidate name: ${req.user.name}. They have an account but have not built their profile yet — encourage them to visit /profile.`;
        }
      } catch (e) {
        // If the profile lookup fails for any reason, don't fail the whole
        // chat request — just fall back to generic guidance.
        profileContext = 'Could not load profile details — give general guidance.';
      }
    }

    // Pull a small live sample of open jobs so answers reflect what's
    // actually posted right now instead of only the static knowledge base.
    let jobsContext = '';
    try {
      const sampleJobs = await Job.find().sort({ createdAt: -1 }).limit(12).select('title company category location accommodations');
      if (sampleJobs.length) {
        jobsContext = 'A SAMPLE OF JOBS CURRENTLY OPEN on Karyasiri (there may be more — direct the candidate to /jobs to see all and get a match score):\n' +
          sampleJobs.map((j) => `- ${j.title} at ${j.company} [${j.category}, ${j.location}] accommodations: ${(j.accommodations || []).join(', ') || 'none listed'}`).join('\n');
      }
    } catch (e) {
      jobsContext = '';
    }

    const languageName = LANGUAGE_NAMES[lang] || 'English';

    const systemPrompt = `You are the Karyasiri Career Mentor — a warm, encouraging, practical guide for physically disabled job seekers in India using the Karyasiri platform.

Karyasiri helps candidates: (1) build a profile of skills/interests/qualifications/disability needs, (2) get matched to jobs with real match-percentage scores, (3) browse government schemes for persons with disabilities, (4) take free skill courses — completing a course automatically adds its skills to the candidate's profile, (5) apply to jobs directly on the site.

Answer questions about: which government scheme fits their situation, which course to take to build a needed skill, how to fill out their profile or a job application well, which jobs might suit them, and how to grow their skills over time. Be concrete — name real scheme/course names from the knowledge base below and point them to the exact page (e.g. "check the Schemes page" or "the Courses page") rather than vague advice.

Keep answers short and easy to read (a few sentences or a short list) — many users have limited English reading ability, low vision, or are using a screen reader, so avoid dense paragraphs and avoid unnecessary jargon.

FORMATTING: Write in plain, simple text. Do NOT use Markdown decoration of any kind: no asterisks (no **bold**, no *italics*), no # headings, no tables, no backticks. Screen readers and text-to-speech read those symbols aloud, which confuses blind users. If you need a list, put each item on its own line starting with "- " (a hyphen and a space), or number them "1.", "2.". Keep each item short. Leave a blank line between separate ideas.

Respond in ${languageName}. If the candidate writes in a different language than ${languageName}, prioritize responding clearly in whichever language they actually wrote in.

Never invent a scheme, course, or job that isn't in the knowledge base below or the sample jobs list — if you're not sure something exists, say so honestly and suggest where they can check (e.g. the Schemes or Courses page) instead of guessing.

CANDIDATE CONTEXT: ${profileContext}

${jobsContext}

KNOWLEDGE BASE:
${formatKnowledgeForPrompt()}`;

    const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
    const url = `${GEMINI_ENDPOINT_BASE}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: trimmed.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
      }),
    });

    const data = await geminiRes.json().catch(() => null);

    if (!geminiRes.ok) {
      const err = new Error(data?.error?.message || `Gemini API error (HTTP ${geminiRes.status})`);
      err.status = geminiRes.status;
      throw err;
    }

    if (data?.promptFeedback?.blockReason) {
      return res.status(200).json({
        reply: "I can't help with that particular question — could you rephrase it, or ask something else about jobs, schemes, or courses on Karyasiri?",
      });
    }

    const reply = (data?.candidates?.[0]?.content?.parts || [])
      .map((part) => part.text || '')
      .join('')
      .trim();

    if (!reply) {
      return res.status(502).json({ message: "The mentor didn't return a response. Please try again." });
    }

    res.json({ reply });
  } catch (err) {
    console.error('Mentor chat error:', err?.message || err);

    // Map common Gemini API failure modes to clear, non-technical messages.
    const status = err?.status;
    if (status === 400) {
      return res.status(503).json({ message: 'The mentor chat is misconfigured (bad request to Gemini — check GEMINI_MODEL). Please contact the site admin.' });
    }
    if (status === 401 || status === 403) {
      return res.status(503).json({ message: 'The mentor chat is misconfigured (invalid API key). Please contact the site admin.' });
    }
    if (status === 404) {
      return res.status(503).json({ message: 'The mentor chat is misconfigured (Google retired this model name). Set GEMINI_MODEL in server/.env to a current model from https://ai.google.dev/gemini-api/docs/models and restart the server.' });
    }
    if (status === 429) {
      return res.status(429).json({ message: 'The mentor is getting a lot of questions right now (free-tier rate limit). Please wait a moment and try again.' });
    }
    if (status === 500 || status === 502 || status === 503) {
      return res.status(503).json({ message: 'The mentor is temporarily unavailable. Please try again in a moment.' });
    }
    return res.status(500).json({ message: 'Something went wrong reaching the mentor. Please try again.' });
  }
});

module.exports = router;