import { useCallback, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SPEECH_LANG_TAGS } from '../i18n/voiceCommands';

/**
 * Text-to-speech helper built on the browser SpeechSynthesis API.
 * Used for "read page aloud" and "listen to this job" features for blind
 * or low-vision candidates. The utterance's language is set to match the
 * current UI language so the browser picks an appropriate voice/accent
 * instead of always defaulting to an English one regardless of content.
 */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const { lang } = useLanguage();

  const speak = useCallback(
    (text, onEnd) => {
      if (!supported) return false;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1;
      utter.lang = SPEECH_LANG_TAGS[lang] || 'en-IN';
      utter.onend = () => {
        setSpeaking(false);
        onEnd && onEnd();
      };
      // Interrupting speech (e.g. speak() being called again before the
      // previous utterance finished, which calls .cancel() below) fires
      // onerror instead of onend per the Web Speech API spec — without
      // this, the "speaking" flag could get stuck true forever, which
      // matters here because other features (like the wake-word listener)
      // stay paused for as long as speaking is true.
      utter.onerror = () => {
        setSpeaking(false);
      };
      window.speechSynthesis.speak(utter);
      setSpeaking(true);
      return true;
    },
    [supported, lang]
  );

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { speak, stop, speaking, supported };
}
