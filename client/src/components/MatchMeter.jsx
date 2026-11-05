function matchColor(pct) {
  if (pct >= 70) return '#0F7A6C';
  if (pct >= 40) return '#E8A33D';
  return '#B8BEC9';
}

export default function MatchMeter({ pct }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color = matchColor(pct);

  return (
    <div className="match-meter">
      <svg viewBox="0 0 56 56" role="img" aria-label={`${pct} percent match`}>
        <circle cx="28" cy="28" r={r} fill="none" stroke="#E4E8EE" strokeWidth="6" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
        />
        <text x="28" y="32" textAnchor="middle" fontSize="13" fontFamily="IBM Plex Mono, monospace" fill={color} fontWeight="700">
          {pct}%
        </text>
      </svg>
      <div className="mm-sub">Match</div>
    </div>
  );
}
