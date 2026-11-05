// Deterministically maps any category/tag string to one of the site's 5
// accent colors, so the same category always renders the same color (job
// categories, scheme categories, course categories all share this) without
// having to hand-maintain a lookup table per taxonomy.
const COLORS = ['gold', 'teal', 'violet', 'sun', 'coral'];

export function categoryColor(category) {
  if (!category) return 'teal';
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}
