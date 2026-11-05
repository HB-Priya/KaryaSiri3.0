import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpeech } from '../hooks/useSpeech';
import { useWakeWord } from '../hooks/useWakeWord';
import { useAnnounce } from '../context/AnnounceContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useVoiceCommandRegistry } from '../context/VoiceCommandContext';
import { TRANSLATIONS } from '../i18n/translations';
import {
  getCommandPatterns,
  extractApplyQuery,
  extractLanguageChange,
  normalizeSpeech,
  SPEECH_LANG_TAGS,
} from '../i18n/voiceCommands';
import LanguageSwitcher from './LanguageSwitcher';
import api from '../api';

const SIZES = ['font-md', 'font-lg', 'font-xl'];

// The wake phrase is spoken in English regardless of UI language (like "Hey
// Siri"/"OK Google" aren't translated either) so it stays easy to say and
// easy to recognize reliably across languages/accents.
const WAKE_WORD = 'hey buddy';
const WAKE_STORAGE_KEY = 'karyasiri_wakeword_enabled';

// Base English navigation commands are always understood, regardless of UI
// language, since a person may speak English commands even with the UI set
// to another language.
const BASE_NAV_TARGETS = {
  home: '/',
  jobs: '/jobs',
  browse: '/jobs',
  schemes: '/schemes',
  courses: '/courses',
  profile: '/profile',
  matches: '/jobs?tab=matches',
  applications: '/applications',
  login: '/login',
  register: '/register',
  'sign up': '/register',
  employer: '/employer',
  dashboard: '/employer',
};

const SpeechRecognitionAPI =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

function buildNavTargets(lang) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const targets = { ...BASE_NAV_TARGETS };
  const add = (word, route) => {
    if (word) targets[word.toLowerCase()] = route;
  };
  add(dict.nav?.home, '/');
  add(dict.nav?.jobs, '/jobs');
  add(dict.nav?.schemes, '/schemes');
  add(dict.nav?.courses, '/courses');
  add(dict.nav?.profile, '/profile');
  add(dict.nav?.applications, '/applications');
  add(dict.nav?.employerDashboard, '/employer');
  add(dict.nav?.login, '/login');
  add(dict.nav?.signup, '/register');
  return targets;
}

// Finds the best-matching job for a spoken query. Plain `title.includes(q)`
// was far too strict for real speech ("cashier position", "the accounts
// job"), so this tries progressively looser strategies and only gives up
// when nothing reasonable matches.
function findJobByQuery(jobs, rawQuery) {
  const q = (rawQuery || '').toLowerCase().trim();
  if (!q || !jobs.length) return null;
  const fieldsOf = (j) => [j.title, j.category, j.company].map((x) => (x || '').toLowerCase()).filter(Boolean);

  // 1. Whole-phrase containment. The reverse direction (query contains a
  //    field) is only allowed for longer fields so a short category like
  //    "IT" doesn't match every query containing the letters "it".
  let found = jobs.find((j) => fieldsOf(j).some((f) => f.includes(q) || (f.length >= 4 && q.includes(f))));
  if (found) return found;

  // 2. Every spoken word appears somewhere in the job's title/category/company.
  const words = q.split(' ').filter((w) => w.length > 1);
  if (!words.length) return null;
  const hay = (j) => fieldsOf(j).join(' ');
  found = jobs.find((j) => words.every((w) => hay(j).includes(w)));
  if (found) return found;

  // 3. Best partial match, requiring at least half of the spoken words.
  const needed = Math.max(1, Math.ceil(words.length / 2));
  let best = null;
  let bestScore = 0;
  jobs.forEach((j) => {
    const h = hay(j);
    const score = words.filter((w) => h.includes(w)).length;
    if (score > bestScore) { best = j; bestScore = score; }
  });
  return bestScore >= needed ? best : null;
}

export default function AccessBar() {
  const [sizeIdx, setSizeIdx] = useState(0);
  const [contrast, setContrast] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [wakeEnabled, setWakeEnabled] = useState(
    () => localStorage.getItem(WAKE_STORAGE_KEY) === '1'
  );
  const announce = useAnnounce();
  const { speak, stop, speaking, supported: ttsSupported } = useSpeech();
  const navigate = useNavigate();
  const recogRef = useRef(null);
  // True from the instant a one-shot voice-command capture is requested
  // (always wake-word triggered now) until it actually ends —
  // covers the gap between the "Yes?" TTS finishing (speaking -> false)
  // and the new recognizer's onstart actually firing (voiceActive -> true).
  // Without this, the pause/resume-sync effect below can see
  // speaking:false && voiceActive:false during that gap and wrongly call
  // wakeControl.resume(), starting a second SpeechRecognition instance
  // that fights the one-shot recognizer for the mic — which is what made
  // "hey buddy" intermittently fail to actually capture the command.
  const commandPendingRef = useRef(false);
  const { t, lang, setLang, languages } = useLanguage();
  const { user, logout } = useAuth();
  const { tryPageCommands } = useVoiceCommandRegistry();

  // Keep the latest speaking/contrast/sizeIdx/user in refs so the (long-lived)
  // recognizer's onresult handler always sees current values instead of a
  // stale snapshot from whenever recog.start() was called.
  const liveRef = useRef({});
  liveRef.current = { speaking, contrast, sizeIdx, user };

  useEffect(() => {
    if (!SpeechRecognitionAPI) {
      setVoiceStatus(t('voiceStatus.notSupported'));
    } else if (typeof window !== 'undefined' && !window.isSecureContext) {
      setVoiceStatus(t('voiceStatus.needsHttps'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applySize(idx) {
    document.body.classList.remove(...SIZES);
    document.body.classList.add(SIZES[idx]);
    setSizeIdx(idx);
  }

  function toggleContrast() {
    const next = !liveRef.current.contrast;
    document.body.classList.toggle('contrast', next);
    setContrast(next);
    announce(next ? 'High contrast mode on' : 'High contrast mode off');
  }

  function readPage() {
    if (speaking) {
      stop();
      announce('Stopped reading');
      return;
    }
    const nodes = document.querySelectorAll('main h1, main h2, main h3, main p, .job-title, .job-meta');
    const text = Array.from(nodes)
      .map((n) => n.textContent.trim())
      .filter(Boolean)
      .join('. ');
    if (!ttsSupported) {
      announce('Sorry, your browser does not support reading pages aloud.');
      return;
    }
    speak(text || 'Nothing to read on this page.');
    announce('Reading page aloud');
  }

  function setStatus(text, { alsoSpeak = false, onSpoken } = {}) {
    setVoiceStatus(text);
    announce(text);
    if (alsoSpeak) {
      const started = speak(text, onSpoken);
      if (!started && onSpoken) onSpoken(); // TTS unsupported/failed — don't block whatever was waiting on it
    } else if (onSpoken) {
      onSpoken();
    }
  }

  // ---- Universal commands available on every page, checked after any
  // page-specific commands (registered via VoiceCommandContext) have had
  // first chance to handle the phrase. Every intent is matched against the
  // current UI language's phrases (English is always included as a
  // fallback, since Indian speakers often mix English words into a
  // sentence spoken in another language). Feedback is spoken/shown in the
  // same UI language via t('voiceStatus.*'). ----
  function handleUniversalCommand(said) {
    const matches = (intent) => getCommandPatterns(lang, intent).some((p) => said.includes(p));

    if (liveRef.current.speaking && matches('stopReading')) {
      stop();
      setStatus(t('voiceStatus.stoppedReading'));
      return true;
    }
    if (matches('readPage')) {
      readPage();
      setStatus(t('voiceStatus.readingPage'));
      return true;
    }
    if (matches('logout')) {
      if (liveRef.current.user) {
        logout();
        navigate('/');
        setStatus(t('voiceStatus.loggedOut'), { alsoSpeak: true });
      } else {
        setStatus(t('voiceStatus.notLoggedIn'), { alsoSpeak: true });
      }
      return true;
    }
    if (matches('contrast')) {
      toggleContrast();
      setStatus(liveRef.current.contrast ? t('voiceStatus.contrastOff') : t('voiceStatus.contrastOn'));
      return true;
    }
    if (matches('biggerText')) {
      applySize(Math.min(liveRef.current.sizeIdx + 1, SIZES.length - 1));
      setStatus(t('voiceStatus.textBigger'));
      return true;
    }
    if (matches('smallerText')) {
      applySize(Math.max(liveRef.current.sizeIdx - 1, 0));
      setStatus(t('voiceStatus.textSmaller'));
      return true;
    }
    // "change language to <name>" — works in any language, since the
    // language names are recognized in every supported script.
    const newLang = extractLanguageChange(said);
    if (newLang) {
      const label = (languages.find((l) => l.code === newLang) || {}).label || newLang;
      setLang(newLang);
      // t() still belongs to the OLD language in this closure, so build the
      // confirmation from the NEW language's dictionary directly.
      const dict = TRANSLATIONS[newLang] || TRANSLATIONS.en;
      const msg = (dict.voiceStatus?.languageChanged || 'Language changed to {lang}.').replace('{lang}', label);
      setVoiceStatus(msg);
      announce(msg);
      speak(msg);
      return true;
    }
    // "apply for <job>" — search live jobs and open the best match, from
    // anywhere on the site, not just the jobs listing. Tries the current
    // language's word order first (see voiceCommands.js), falling back to
    // the English "apply for X" pattern.
    const applyQuery = extractApplyQuery(lang, said);
    if (applyQuery) {
      const query = applyQuery.replace(/^(a|an|the)\s+/, '');
      setStatus(t('voiceStatus.searchingJob', { query }));
      api.get('/jobs').then((res) => {
        const jobs = res.data.jobs || [];
        const found = findJobByQuery(jobs, query);
        if (found) {
          navigate(`/jobs/${found._id}`);
          setStatus(t('voiceStatus.foundJob', { title: found.title, company: found.company }), { alsoSpeak: true });
        } else {
          setStatus(t('voiceStatus.notFoundJob', { query }), { alsoSpeak: true });
        }
      }).catch(() => setStatus(t('voiceStatus.searchError'), { alsoSpeak: true }));
      return true;
    }
    if (matches('apply')) {
      setStatus(t('voiceStatus.whichJob'), { alsoSpeak: true });
      return true;
    }
    // Navigation — checked last so it never shadows the commands above.
    const targets = buildNavTargets(lang);
    const key = Object.keys(targets).find((k) => said.includes(k));
    if (key) {
      navigate(targets[key]);
      setStatus(t('voiceStatus.goingTo', { key }));
      return true;
    }
    return false;
  }

  function startVoiceCommand(attempt = 1) {
    if (!SpeechRecognitionAPI) {
      setStatus(t('voiceStatus.notSupported'));
      return;
    }
    if (!window.isSecureContext) {
      setStatus(t('voiceStatus.needsHttps'));
      return;
    }
    if (recogRef.current) return; // already listening — guard against double-start

    // Hold the wake-word listener paused for this whole attempt sequence
    // (including any retries below), not just once this recognizer
    // successfully starts — otherwise, during a retry's backoff window,
    // the wake listener could reactivate and fight this one for the
    // microphone again, since at that point neither `speaking` nor
    // `voiceActive` would yet be true.
    if (attempt === 1) {
      commandPendingRef.current = true;
      wakeControl.pause();
    }

    const recog = new SpeechRecognitionAPI();
    recog.lang = SPEECH_LANG_TAGS[lang] || 'en-IN';
    recog.interimResults = false;
    recog.continuous = false;
    recog.maxAlternatives = 3;

    recog.onstart = () => {
      setVoiceActive(true);
      setStatus('🎙 ' + t('voiceStatus.listening'));
    };

    recog.onresult = (evt) => {
      let heardText = '';
      let handled = false;
      for (let r = 0; r < evt.results[0].length && !handled; r++) {
        const alt = normalizeSpeech(evt.results[0][r].transcript);
        if (!heardText) heardText = alt;
        handled = tryPageCommands(alt) || handleUniversalCommand(alt);
      }
      if (!handled) {
        setStatus(t('voiceStatus.heardButUnknown', { heard: heardText }), { alsoSpeak: true });
      }
    };

    recog.onerror = (evt) => {
      if (evt.error === 'not-allowed' || evt.error === 'service-not-allowed') {
        setStatus('🚫 ' + t('voiceStatus.micBlocked'), { alsoSpeak: true });
      } else if (evt.error === 'no-speech') {
        setStatus(t('voiceStatus.noSpeech'), { alsoSpeak: true });
      } else if (evt.error === 'audio-capture') {
        setStatus(t('voiceStatus.noMic'), { alsoSpeak: true });
      } else if (evt.error === 'network') {
        setStatus(t('voiceStatus.networkError'), { alsoSpeak: true });
      } else if (evt.error === 'aborted') {
        setVoiceStatus('');
      } else {
        setStatus(t('voiceStatus.genericError', { error: evt.error }), { alsoSpeak: true });
      }
    };

    recog.onend = () => {
      recogRef.current = null;
      setVoiceActive(false);
      commandPendingRef.current = false;
      if (wakeEnabled) wakeControl.resume();
    };

    try {
      recog.start();
      recogRef.current = recog;
    } catch (err) {
      // Starting right after the wake-word listener hands off the
      // microphone is a known race (Chrome/Edge can throw "recognition has
      // already started" if the mic hasn't fully released yet). Retry a
      // few times with a short backoff before giving up — and only
      // announce failure (with speech, since this matters most for blind
      // users) once genuinely exhausted, not on the first transient hiccup.
      recogRef.current = null;
      const MAX_START_ATTEMPTS = 4;
      if (attempt < MAX_START_ATTEMPTS) {
        setTimeout(() => startVoiceCommand(attempt + 1), 200 * attempt);
      } else {
        setVoiceActive(false);
        commandPendingRef.current = false;
        setStatus(t('voiceStatus.couldNotStart', { error: err?.message || 'unknown error' }), { alsoSpeak: true });
        if (wakeEnabled) wakeControl.resume();
      }
    }
  }

  // ---- Wake word ("hey buddy") — the only way to give voice commands, so
  // blind users never have to locate a button on screen. ----
  const wakeControl = useWakeWord({
    enabled: wakeEnabled,
    wakeWord: WAKE_WORD,
    langTag: SPEECH_LANG_TAGS[lang] || 'en-IN',
    onWake: () => {
      // Heard only the wake phrase, no trailing command in the same
      // utterance — acknowledge, then open the normal one-shot recognizer
      // to capture what follows, exactly when the "I'm listening" prompt
      // actually finishes speaking (via onSpoken) rather than guessing a
      // fixed delay, which could either cut the prompt off or leave an
      // awkward gap depending on the browser's TTS voice/speed.
      setStatus(t('voiceStatus.wakeHeard'), { alsoSpeak: true, onSpoken: () => startVoiceCommand() });
    },
    onCommand: (said) => {
      // "hey buddy <command>" spoken as one sentence — handle immediately,
      // no need for a second listening round.
      const handled = tryPageCommands(said) || handleUniversalCommand(said);
      if (!handled) setStatus(t('voiceStatus.heardButUnknown', { heard: said }), { alsoSpeak: true });
    },
    onError: () => {
      setWakeEnabled(false);
      localStorage.setItem(WAKE_STORAGE_KEY, '0');
      setStatus(t('voiceStatus.wakeMicBlocked'), { alsoSpeak: false });
    },
  });

  // Never let the wake listener's mic pick up Karyasiri's own spoken
  // replies (which could otherwise re-trigger it) or compete with an
  // active one-shot voice command capture.
  useEffect(() => {
    if (!wakeEnabled) return;
    if (speaking || voiceActive || commandPendingRef.current) wakeControl.pause();
    else wakeControl.resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speaking, voiceActive, wakeEnabled]);

  function toggleWakeWord() {
    const next = !wakeEnabled;
    setWakeEnabled(next);
    localStorage.setItem(WAKE_STORAGE_KEY, next ? '1' : '0');
    if (next) {
      if (!SpeechRecognitionAPI) {
        setStatus(t('voiceStatus.notSupported'));
        setWakeEnabled(false);
        localStorage.setItem(WAKE_STORAGE_KEY, '0');
        return;
      }
      setStatus(t('voiceStatus.wakeEnabled', { word: WAKE_WORD }), { alsoSpeak: true });
    } else {
      setStatus(t('voiceStatus.wakeDisabled'), { alsoSpeak: true });
    }
  }

  return (
    <div className="access-bar">
      <div className="wrap access-bar-inner">
        <span className="access-label">{t('common.accessTools')}:</span>
        <div className="access-group" role="group" aria-label="Text size">
          <button type="button" onClick={() => applySize(Math.max(sizeIdx - 1, 0))} aria-label="Decrease text size">A−</button>
          <button type="button" onClick={() => applySize(0)} aria-label="Reset text size">A</button>
          <button type="button" onClick={() => applySize(Math.min(sizeIdx + 1, SIZES.length - 1))} aria-label="Increase text size">A+</button>
        </div>
        <div className="access-group">
          <button type="button" aria-pressed={contrast} onClick={toggleContrast}>◐ {t('common.highContrast')}</button>
        </div>
        <div className="access-group">
          <button type="button" aria-pressed={speaking} onClick={readPage}>
            {speaking ? `⏹ ${t('common.stopReading')}` : `🔊 ${t('common.readAloud')}`}
          </button>
        </div>
        <div className="access-group">
          <button
            type="button"
            aria-pressed={wakeEnabled}
            onClick={toggleWakeWord}
            disabled={!wakeControl.supported}
            title={`Say "${WAKE_WORD}" any time, then a command: read page, apply for [job], go to schemes, change language to [name], log out`}
          >
            {wakeEnabled ? `👂 ${t('common.wakeWordOn')}` : `👂 ${t('common.wakeWordOff')}`}
          </button>
        </div>
        <LanguageSwitcher />
        {voiceStatus && <span className="voice-status" role="status">{voiceStatus}</span>}
      </div>
    </div>
  );
}