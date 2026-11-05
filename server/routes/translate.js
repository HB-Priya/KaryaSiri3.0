const express = require('express');
const { translateText, translateBatch, SOUTH_INDIAN_LANGS } = require('../utils/translate');

const router = express.Router();

// Simple in-memory cache so re-viewing the same job/scheme/course description,
// or the same mentor reply, in the same language doesn't re-spend API quota.
// Fine for a single server instance; swap for Redis if you scale to more than one.
const cache = new Map(); // key: `${target}::${text}` -> translatedText
const MAX_CACHE_ENTRIES = 10000;

function cacheGet(target, text) {
  return cache.get(`${target}::${text}`);
}
function cacheSet(target, text, value) {
  if (cache.size >= MAX_CACHE_ENTRIES) cache.clear(); // crude but simple eviction
  cache.set(`${target}::${text}`, value);
}

const SUPPORTED_TARGETS = Object.keys(SOUTH_INDIAN_LANGS); // ['ta','te','kn','ml','gom']

// GET /api/translate/languages - what this endpoint supports (for the client to check).
router.get('/languages', (req, res) => {
  res.json({
    languages: SUPPORTED_TARGETS.map((code) => ({ code, name: SOUTH_INDIAN_LANGS[code] })),
    configured: Boolean(process.env.BHASHINI_USER_ID && process.env.BHASHINI_API_KEY),
  });
});

// POST /api/translate
// Body: { text: string, target: string } for a single string, OR
//       { texts: string[], target: string } for a batch.
// (target is not restricted to SUPPORTED_TARGETS only defensively — Google
// supports far more languages than our 5, so any valid ISO code is allowed;
// SUPPORTED_TARGETS is just what the UI's language switcher currently offers.)
router.post('/', async (req, res) => {
  try {
    const { text, texts, target, source } = req.body;
    if (!target || typeof target !== 'string') {
      return res.status(400).json({ message: 'target language code is required, e.g. "ta", "te", "kn", "ml", "gom".' });
    }
    if (!process.env.BHASHINI_USER_ID || !process.env.BHASHINI_API_KEY) {
      return res.status(503).json({
        message: 'Translation is not configured yet. Set BHASHINI_USER_ID and BHASHINI_API_KEY in server/.env.',
      });
    }

    if (Array.isArray(texts)) {
      const results = new Array(texts.length).fill('');
      const missingIdx = [];
      const missingTexts = [];
      texts.forEach((t, i) => {
        const cached = cacheGet(target, t);
        if (cached !== undefined) results[i] = cached;
        else {
          missingIdx.push(i);
          missingTexts.push(t);
        }
      });
      if (missingTexts.length) {
        const translated = await translateBatch(missingTexts, target, source || 'en');
        translated.forEach((tr, j) => {
          results[missingIdx[j]] = tr;
          cacheSet(target, missingTexts[j], tr);
        });
      }
      return res.json({ translations: results });
    }

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: 'text (or texts) is required.' });
    }
    const cached = cacheGet(target, text);
    if (cached !== undefined) return res.json({ translated: cached });

    const translated = await translateText(text, target, source || 'en');
    cacheSet(target, text, translated);
    res.json({ translated });
  } catch (err) {
    const status = err.code === 'NO_API_KEY' ? 503 : 500;
    res.status(status).json({ message: 'Translation failed.', error: err.message });
  }
});

module.exports = router;
