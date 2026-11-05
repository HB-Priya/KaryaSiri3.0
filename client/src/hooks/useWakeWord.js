import { useCallback, useEffect, useRef } from 'react';
import { normalizeSpeech } from '../i18n/voiceCommands';

const SpeechRecognitionAPI =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

/**
 * Always-on background listener for a wake phrase (default "hey buddy"), so
 * a blind or low-vision user doesn't need to find and press a button to
 * start giving a voice command — they just say the wake phrase from
 * anywhere on the page.
 *
 * Runs a continuous, interim-results SpeechRecognition instance that
 * restarts itself automatically (Chrome/Edge end continuous recognition
 * after periods of silence or minor errors — that's routine, not a
 * failure, so this hook quietly restarts rather than surfacing it).
 *
 * When the wake phrase is heard:
 *   - if the same utterance has trailing speech ("hey buddy apply for
 *     cashier"), `onCommand(trailingText)` fires immediately — no need to
 *     wait and speak again;
 *   - otherwise `onWake()` fires so the caller can give audio feedback and
 *     open a one-shot recognizer to capture the follow-up command.
 *
 * The caller MUST call `pause()` before starting anything else that uses
 * the microphone (a one-shot command capture, dictation) or that plays
 * audio the mic might pick back up (text-to-speech), and `resume()` when
 * that's done — only one SpeechRecognition instance reliably works at a
 * time in most browsers, and without pausing, Karyasiri's own spoken
 * replies could re-trigger the wake word.
 */
export function useWakeWord({ enabled, wakeWord = 'hey buddy', langTag = 'en-IN', onWake, onCommand, onError }) {
  const recogRef = useRef(null);
  const pausedRef = useRef(!enabled);
  const enabledRef = useRef(enabled);
  const restartTimerRef = useRef(null);
  const pendingWakeTimersRef = useRef(new Map());
  const consecutiveFailuresRef = useRef(0);
  // Keep latest callbacks/lang in refs so the long-lived recognizer's event
  // handlers never close over stale values.
  const liveRef = useRef({ wakeWord, onWake, onCommand, onError });
  liveRef.current = { wakeWord, onWake, onCommand, onError };

  const stop = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    for (const timer of pendingWakeTimersRef.current.values()) clearTimeout(timer);
    pendingWakeTimersRef.current.clear();
    if (recogRef.current) {
      const r = recogRef.current;
      recogRef.current = null;
      r.onend = null;
      r.onerror = null;
      r.onresult = null;
      try {
        r.stop();
      } catch (e) {
        // already stopped — fine
      }
    }
  }, []);

  const MAX_CONSECUTIVE_FAILURES = 6;

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI || !enabledRef.current || pausedRef.current || recogRef.current) return;

    const recog = new SpeechRecognitionAPI();
    recog.lang = langTag;
    recog.continuous = true;
    recog.interimResults = true;
    recog.maxAlternatives = 1;

    // Tracks result indexes already reacted to via the interim fast-path
    // below, so the later "final" event for that same phrase doesn't fire
    // onWake a second time. Scoped per recognizer session (fresh on every
    // start()), since result indexes reset with each new session anyway.
    const firedOnInterim = new Set();
    pendingWakeTimersRef.current.clear();

    recog.onresult = (evt) => {
      consecutiveFailuresRef.current = 0; // recognition is clearly alive and working
      const { wakeWord: word, onWake: wake, onCommand: command } = liveRef.current;
      const wakeLower = normalizeSpeech(word);
      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        const result = evt.results[i];
        // Normalize (lowercase + strip trailing punctuation/whitespace):
        // Chrome often returns "Hey buddy." with a period, which would
        // otherwise leave `after` = "." (truthy) and make a bare wake
        // phrase get mistaken for a command.
        const transcript = normalizeSpeech(result[0].transcript);
        const wakeIdx = transcript.indexOf(wakeLower);
        if (wakeIdx === -1) {
          const pendingTimer = pendingWakeTimersRef.current.get(i);
          if (pendingTimer) clearTimeout(pendingTimer);
          pendingWakeTimersRef.current.delete(i);
          continue;
        }
        // Also drop leading punctuation left over after the wake phrase
        // (e.g. "hey buddy, apply for cashier").
        const after = transcript.slice(wakeIdx + wakeLower.length).replace(/^[\s.,!?؟।]+/, '').trim();

        const pendingTimer = pendingWakeTimersRef.current.get(i);
        if (after && pendingTimer) {
          clearTimeout(pendingTimer);
          pendingWakeTimersRef.current.delete(i);
        }

        if (!result.isFinal) {
          // Give command words a brief chance to arrive after an interim
          // bare wake phrase, otherwise a single utterance can be cut off.
          if (!after && !firedOnInterim.has(i) && !pendingTimer) {
            const timer = setTimeout(() => {
              pendingWakeTimersRef.current.delete(i);
              if (firedOnInterim.has(i)) return;
              firedOnInterim.add(i);
              liveRef.current.onWake && liveRef.current.onWake();
            }, 500);
            pendingWakeTimersRef.current.set(i, timer);
          }
          continue;
        }

        if (pendingTimer) {
          clearTimeout(pendingTimer);
          pendingWakeTimersRef.current.delete(i);
        }
        if (firedOnInterim.has(i)) continue; // already reacted to this phrase via the fast path above

        if (after) {
          command && command(after);
        } else {
          wake && wake();
        }
      }
    };

    recog.onerror = (evt) => {
      if (evt.error === 'not-allowed' || evt.error === 'service-not-allowed') {
        enabledRef.current = false; // hard permission block — stop retrying
        liveRef.current.onError && liveRef.current.onError(evt.error);
      }
      // 'no-speech', 'aborted', 'network' etc. are routine for an always-on
      // listener — onend below handles restarting.
    };

    recog.onend = () => {
      recogRef.current = null;
      if (enabledRef.current && !pausedRef.current) {
        restartTimerRef.current = setTimeout(() => start(), 150);
      }
    };

    try {
      recog.start();
      recogRef.current = recog;
    } catch (e) {
      // Chrome/Edge can throw synchronously here (a well-known race:
      // "recognition has already started") if start() is called too soon
      // after a stop(). Previously this just gave up silently forever —
      // the wake-word feature would go dark with no error and no retry.
      // Retry with a short backoff instead, up to a bounded number of
      // attempts, so a transient timing glitch doesn't permanently kill it.
      recogRef.current = null;
      consecutiveFailuresRef.current += 1;
      if (enabledRef.current && !pausedRef.current) {
        if (consecutiveFailuresRef.current <= MAX_CONSECUTIVE_FAILURES) {
          restartTimerRef.current = setTimeout(() => start(), 400 * consecutiveFailuresRef.current);
        } else {
          // Genuinely stuck (not just a one-off race) — surface it instead
          // of silently doing nothing forever.
          enabledRef.current = false;
          liveRef.current.onError && liveRef.current.onError('start-failed');
        }
      }
    }
  }, [langTag]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    stop();
  }, [stop]);

  const resume = useCallback(() => {
    if (!enabledRef.current) return;
    pausedRef.current = false;
    start();
  }, [start]);

  useEffect(() => {
    enabledRef.current = enabled;
    if (enabled) {
      pausedRef.current = false;
      consecutiveFailuresRef.current = 0; // fresh retry budget on a user-initiated enable
      start();
    } else {
      pausedRef.current = true;
      stop();
    }
    return stop;
    // Restart fresh whenever `enabled` or the recognition language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, langTag]);

  return { pause, resume, supported: Boolean(SpeechRecognitionAPI) };
}