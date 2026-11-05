const STOPWORDS = new Set([
  'the', 'and', 'a', 'to', 'of', 'in', 'for', 'with', 'on', 'is', 'i', 'my',
  'have', 'has', 'are', 'an', 'or', 'at', 'as', 'be', 'this', 'that', 'will', 'can',
]);

const DISABILITY_TO_ACC = {
  visual: ['screenreader', 'remote'],
  hearing: ['signlanguage'],
  mobility: ['wheelchair', 'ergonomic'],
  speech: ['remote'],
  cognitive: ['training'],
  chronic: ['flexible', 'remote'],
};

// Very light stemming so "cooks"/"cooking" credit the same underlying skill
// as "cook", without pulling in a full NLP library.
function normalizeToken(w) {
  if (w.length > 4 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 4 && w.endsWith('es')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

function tokenize(str) {
  return (
    (str || '')
      .toLowerCase()
      .match(/[a-z0-9+#.]+/g)
      ?.filter((w) => !STOPWORDS.has(w) && w.length > 1)
      .map(normalizeToken) || []
  );
}

// How well does a single required-skill phrase (e.g. "customer service")
// show up in the candidate's text? 1 = full/exact phrase present, partial
// credit if only some of a multi-word skill's words are present, 0 if none.
function skillMatchScore(skillPhrase, candidateTextLower, candidateTokenSet) {
  const phrase = (skillPhrase || '').toLowerCase().trim();
  if (!phrase) return 0;
  if (candidateTextLower.includes(phrase)) return 1;
  const words = tokenize(phrase);
  if (words.length === 0) return 0;
  const matched = words.filter((w) => candidateTokenSet.has(w));
  return matched.length / words.length;
}

/**
 * Computes a 0-100 match score between a candidate profile and a job.
 *
 * Primary signal is how many of the job's specific, curated required
 * skills show up in the candidate's profile — a small, meaningful
 * denominator (typically 4-7 skills), so a genuinely relevant candidate
 * lands in a realistic 60-95% range instead of being diluted against
 * every word in the full job description. A smaller-weighted secondary
 * signal checks broader overlap with the description/category, and a
 * bonus applies when the job's accommodations match the candidate's
 * stated disability-related needs.
 */
function computeMatch(profile, job) {
  const candidateTextLower = [
    profile?.skills,
    profile?.interests,
    profile?.qualifications,
    profile?.resumeText,
  ].join(' ').toLowerCase();
  const candidateTokens = new Set(tokenize(candidateTextLower));

  const requiredSkills = job.requiredSkills && job.requiredSkills.length
    ? job.requiredSkills
    : tokenize(job.description).slice(0, 6); // fallback if a job has no curated list

  let skillScore = 0;
  if (requiredSkills.length) {
    const total = requiredSkills.reduce(
      (sum, skill) => sum + skillMatchScore(skill, candidateTextLower, candidateTokens),
      0
    );
    skillScore = total / requiredSkills.length;
  }

  // Secondary, lower-weight signal from the fuller description/category —
  // capped denominator so it stays meaningful instead of vanishing on long
  // descriptions (the trap the old formula fell into).
  const descTokens = new Set(tokenize([job.description, job.category].join(' ')));
  let descOverlap = 0;
  descTokens.forEach((t) => {
    if (candidateTokens.has(t)) descOverlap += 1;
  });
  const descDenominator = Math.min(descTokens.size || 1, 12);
  const descScore = Math.min(descOverlap / descDenominator, 1);

  let accBonus = 0;
  (profile?.disabilities || []).forEach((d) => {
    const wanted = DISABILITY_TO_ACC[d] || [];
    wanted.forEach((w) => {
      if ((job.accommodations || []).includes(w)) accBonus += 0.07;
    });
  });
  accBonus = Math.min(accBonus, 0.25);

  const anySignal = skillScore > 0 || descOverlap > 0 || accBonus > 0;

  let score = skillScore * 0.6 + descScore * 0.2 + accBonus;
  if (anySignal) score += 0.05;
  score = Math.max(0, Math.min(1, score));
  return Math.round(score * 100);
}

module.exports = { computeMatch, tokenize };
