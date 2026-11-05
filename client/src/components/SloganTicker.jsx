// A continuously-scrolling slogan banner for the homepage — a single copy
// of the text travels fully across the screen and loops forever, with no
// pause control, by design.
//
// Accessibility note: the moving text is marked aria-hidden; the real text
// is given once via visually-hidden text so screen readers announce it
// normally instead of reading a repeating scroll. The one exception left in
// place is the OS-level prefers-reduced-motion setting (handled in CSS),
// which freezes the track for people who have that accessibility setting
// turned on system-wide — a different thing from an on-page pause control.
const SLOGAN = 'Karya Siri - Where ability finds opportunity';
const CREDIT = 'Built by Priya, Poorvika, Dilip ~ ISE, CMRIT';

export default function SloganTicker() {
  return (
    <section className="slogan-ticker" aria-label="Site slogan">
      <p className="sr-only">
        {SLOGAN}. {CREDIT}.
      </p>
      <div className="ticker-viewport">
        <div className="ticker-track" aria-hidden="true">
          <span className="ticker-text">{SLOGAN}</span>
          <span className="ticker-sep">✦</span>
          <span className="ticker-text ticker-credit">{CREDIT}</span>
        </div>
      </div>
    </section>
  );
}