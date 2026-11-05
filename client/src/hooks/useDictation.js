import { useCallback, useRef, useState } from 'react';

const SpeechRecognitionAPI =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

/**
 * Speech-to-text dictation helper. Appends recognized speech to whatever
 * text the caller currently has via onResult(transcript).
 * Used so candidates (e.g. blind users, or anyone who prefers speaking)
 * can fill in skills, resumes and job applications by voice.
 */
export function useDictation(onResult) {
  const [listening, setListening] = useState(false);
  const recogRef = useRef(null);
  const supported = !!SpeechRecognitionAPI;

  const start = useCallback(() => {
    if (!supported) return;
    const recog = new SpeechRecognitionAPI();
    recog.lang = 'en-US';
    recog.interimResults = false;
    recog.continuous = true;
    recog.onstart = () => setListening(true);
    recog.onresult = (evt) => {
      let transcript = '';
      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        transcript += evt.results[i][0].transcript;
      }
      onResult(transcript.trim());
    };
    recog.onerror = () => setListening(false);
    recog.onend = () => setListening(false);
    recog.start();
    recogRef.current = recog;
  }, [onResult, supported]);

  const stop = useCallback(() => {
    recogRef.current && recogRef.current.stop();
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { listening, toggle, supported };
}
